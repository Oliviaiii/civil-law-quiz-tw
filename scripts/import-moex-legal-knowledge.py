"""Import the shared MOEX Legal Knowledge and English papers for ROC 105-114.

The Constitution, Introduction to Law and English modules all consume this one
normalized data set.  Official question PDFs (Q), standard answer PDFs (S),
and corrected answer PDFs (M) are downloaded into ``tmp/combined-paper-pdfs``.
When an M file is declared in the manifest it always overrides S.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import urllib.request
from pathlib import Path
from typing import Any

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "tmp" / "combined-paper-pdfs"
OUTPUT = ROOT / "app" / "data" / "legal-knowledge-and-english-questions.json"

MANIFEST = {
    105: {"code": "105120", "class": "201", "subject": "0408"},
    106: {"code": "106130", "class": "201", "subject": "0416"},
    107: {"code": "107130", "class": "201", "subject": "0415"},
    108: {"code": "108130", "class": "201", "subject": "0223"},
    109: {"code": "109130", "class": "201", "subject": "0413"},
    110: {"code": "110130", "class": "201", "subject": "0206"},
    111: {"code": "111130", "class": "201", "subject": "0206"},
    112: {"code": "112130", "class": "201", "subject": "0206"},
    113: {"code": "113120", "class": "201", "subject": "0204"},
    114: {"code": "114120", "class": "201", "subject": "0204", "corrected": True},
}

OPTION_MARKERS = [chr(codepoint) for codepoint in range(0xE18C, 0xE190)]
QUESTION_SEQUENCE = list(range(1, 51))
SUBJECT_RANGES = {
    "constitution": range(1, 16),
    "legal-introduction": range(16, 31),
    "english": range(31, 51),
}


def official_url(year: int, document_type: str) -> str:
    item = MANIFEST[year]
    return (
        "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx"
        f"?t={document_type}&code={item['code']}&c={item['class']}"
        f"&s={item['subject']}&q=1"
    )


def download_pdfs() -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    ssl_context = ssl.create_default_context()
    # Python 3.13+ enables OpenSSL strict verification by default.  MOEX's
    # otherwise trusted certificate chain omits a legacy Subject Key Identifier,
    # so retain CA/hostname validation while disabling only that strict flag.
    if hasattr(ssl, "VERIFY_X509_STRICT"):
        ssl_context.verify_flags &= ~ssl.VERIFY_X509_STRICT
    for year, item in MANIFEST.items():
        document_types = ["Q", "S"] + (["M"] if item.get("corrected") else [])
        for document_type in document_types:
            target = PDF_DIR / f"{year}-{document_type}.pdf"
            request = urllib.request.Request(
                official_url(year, document_type),
                headers={"User-Agent": "civil-law-quiz-tw importer"},
            )
            with urllib.request.urlopen(request, context=ssl_context) as response:
                body = response.read()
            if not body.startswith(b"%PDF"):
                raise ValueError(f"{year}-{document_type}: MOEX did not return a PDF")
            target.write_bytes(body)


def normalize(text: str) -> str:
    text = text.replace("年", "年").replace("立", "立")
    text = "\n".join(
        line
        for line in text.splitlines()
        if not line.startswith(("代號：", "頁次："))
    )
    text = re.sub(r"\s+", " ", text)
    text = re.sub(
        r"(?<=[\u3400-\u9fff，。；：？！、）]) (?=[\u3400-\u9fff（])",
        "",
        text,
    )
    return text.strip()


def extract_questions(year: int) -> list[dict[str, Any]]:
    with pdfplumber.open(PDF_DIR / f"{year}-Q.pdf") as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    first_option = min(text.find(marker) for marker in OPTION_MARKERS if marker in text)
    first_question = [
        match
        for match in re.finditer(r"(?m)^\s*1\s+(?=\S)", text)
        if match.start() < first_option
    ][-1]
    section = text[first_question.start() :]
    starts = list(
        re.finditer(r"(?m)^\s*([1-9]|[1-4][0-9]|50)\s+(?=\S)", section)
    )
    numbers = [int(match.group(1)) for match in starts]
    if numbers != QUESTION_SEQUENCE:
        raise ValueError(f"{year}: unexpected question sequence {numbers}")

    questions: list[dict[str, Any]] = []
    for index, start in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(section)
        block = section[start.end() : end]
        marker_positions = [block.find(marker) for marker in OPTION_MARKERS]
        if any(position == -1 for position in marker_positions):
            raise ValueError(f"{year} Q{index + 1}: missing option marker")
        prompt = normalize(block[: marker_positions[0]])
        if not prompt and index + 1 >= 31:
            # Some English cloze questions contain only option markers because
            # their stem is a numbered blank in the shared passage above.
            prompt = f"請依官方試卷的共用文章作答第 {index + 1} 題。"
        options = []
        for option_index, position in enumerate(marker_positions):
            option_end = (
                marker_positions[option_index + 1]
                if option_index + 1 < len(marker_positions)
                else len(block)
            )
            options.append(normalize(block[position + 1 : option_end]))
        if not prompt or any(not option for option in options):
            raise ValueError(f"{year} Q{index + 1}: empty prompt or option")
        questions.append({"prompt": prompt, "options": options})
    return questions


def extract_answer_rows(text: str) -> list[str]:
    answers: list[str] = []
    for line in text.splitlines():
        if line.strip().startswith("答案 "):
            answers.extend(re.findall(r"(?<![A-Z])[ABCD#](?![A-Z])", line))
        if len(answers) >= 50:
            break
    if len(answers) != 50:
        raise ValueError(f"expected 50 answers, got {len(answers)}")
    return answers


def corrected_answers(text: str, answers: list[str]) -> dict[int, list[int]]:
    corrections: dict[int, list[int]] = {}
    for number, answer in enumerate(answers, 1):
        if answer != "#":
            continue
        note = re.search(rf"第\s*{number}\s*題答(.+?)者均給分", text)
        if not note:
            raise ValueError(f"corrected answer note missing for Q{number}")
        accepted = sorted({ord(letter) - ord("A") for letter in re.findall(r"[A-D]", note.group(1))})
        if not accepted:
            raise ValueError(f"corrected answer choices missing for Q{number}")
        corrections[number] = accepted
    return corrections


def extract_answers(year: int) -> tuple[list[str], dict[int, list[int]], str, str]:
    answer_type = "M" if MANIFEST[year].get("corrected") else "S"
    with pdfplumber.open(PDF_DIR / f"{year}-{answer_type}.pdf") as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    answers = extract_answer_rows(text)
    corrections = corrected_answers(text, answers)
    label = "考選部更正答案" if answer_type == "M" else "考選部標準答案"
    return answers, corrections, answer_type, label


def logical_subject(number: int) -> str:
    for subject, numbers in SUBJECT_RANGES.items():
        if number in numbers:
            return subject
    raise ValueError(f"question {number} is outside the official paper")


def build_records() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for year in range(105, 115):
        questions = extract_questions(year)
        answers, corrections, answer_type, answer_label = extract_answers(year)
        for number, (question, answer) in enumerate(zip(questions, answers, strict=True), 1):
            accepted_answers = corrections.get(number)
            primary_answer = accepted_answers[0] if accepted_answers else ord(answer) - ord("A")
            records.append(
                {
                    "id": f"judicial-fourth-{year}-legal-knowledge-{number:02d}",
                    "exam": "司法特考四等",
                    "rocYear": year,
                    "gregorianYear": year + 1911,
                    "paper": "legal-knowledge-and-english",
                    "paperTitle": "法學知識與英文（包括中華民國憲法、法學緒論、英文）",
                    "subject": logical_subject(number),
                    "applicableCategories": ["法院書記官", "其他四等共用類科"],
                    "sourceUrl": official_url(year, "Q"),
                    "format": "選擇題",
                    "officialQuestionNumber": number,
                    "prompt": question["prompt"],
                    "options": question["options"],
                    "answer": primary_answer,
                    "acceptedAnswers": accepted_answers,
                    "allCredit": False,
                    "answerSource": answer_label,
                    "answerUrl": official_url(year, answer_type),
                    "humanVerified": True,
                }
            )
    return records


def validate(records: list[dict[str, Any]]) -> None:
    ids = [record["id"] for record in records]
    if len(records) != 500 or len(ids) != len(set(ids)):
        raise ValueError("expected 500 unique combined-paper records")
    for year in range(105, 115):
        yearly = [record for record in records if record["rocYear"] == year]
        if [record["officialQuestionNumber"] for record in yearly] != QUESTION_SEQUENCE:
            raise ValueError(f"{year}: official question numbers are not continuous")
        counts = {
            subject: sum(record["subject"] == subject for record in yearly)
            for subject in SUBJECT_RANGES
        }
        if counts != {"constitution": 15, "legal-introduction": 15, "english": 20}:
            raise ValueError(f"{year}: unexpected subject split {counts}")
        if any(record["answer"] not in range(4) for record in yearly):
            raise ValueError(f"{year}: answer outside A-D")
    corrected = next(
        record
        for record in records
        if record["id"] == "judicial-fourth-114-legal-knowledge-18"
    )
    if corrected["acceptedAnswers"] != [0, 1, 2] or corrected["answerSource"] != "考選部更正答案":
        raise ValueError("114 Q18 did not apply the official corrected answer")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true", help="refresh official Q/S/M PDFs")
    args = parser.parse_args()
    if args.download:
        download_pdfs()
    output = build_records()
    validate(output)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(output)} records to {OUTPUT}")


if __name__ == "__main__":
    main()
