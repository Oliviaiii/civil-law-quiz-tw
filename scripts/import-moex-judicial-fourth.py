"""Import the latest ten completed Judicial Special Exam Fourth Rank civil-law papers.

The script expects the official MOEX PDFs in ``tmp/pdfs`` and writes the
normalized records consumed by the static site.  It intentionally keeps essay
questions separate from multiple-choice questions and gives corrected answer
sheets precedence over the original standard answers.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "tmp" / "pdfs"
OUTPUT = ROOT / "app" / "data" / "judicial-fourth-questions.json"

MANIFEST = {
    105: {"code": "105120", "class": "201", "subject": "0502"},
    106: {"code": "106130", "class": "201", "subject": "0504"},
    107: {"code": "107130", "class": "201", "subject": "0504"},
    108: {"code": "108130", "class": "201", "subject": "0504"},
    109: {"code": "109130", "class": "201", "subject": "0504"},
    110: {"code": "110130", "class": "201", "subject": "0404"},
    111: {"code": "111130", "class": "201", "subject": "0404"},
    112: {"code": "112130", "class": "201", "subject": "0404"},
    113: {"code": "113120", "class": "201", "subject": "0404"},
    114: {"code": "114120", "class": "201", "subject": "0405"},
}

OPTION_MARKERS = [chr(codepoint) for codepoint in range(0xE18C, 0xE190)]
CHINESE_NUMERALS = ["一", "二", "三", "四"]


def normalize(text: str) -> str:
    text = text.replace("年", "年").replace("Ａ", "A")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=[\u3400-\u9fff，。；：？！、）]) (?=[\u3400-\u9fff（])", "", text)
    return text.strip(" \n")


def question_url(year: int, answer_type: str = "Q") -> str:
    item = MANIFEST[year]
    return (
        "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx"
        f"?t={answer_type}&code={item['code']}&c={item['class']}"
        f"&s={item['subject']}&q=1"
    )


def extract_pages(year: int) -> list[Any]:
    with pdfplumber.open(PDF_DIR / f"{year}-Q.pdf") as pdf:
        return [page.extract_text() or "" for page in pdf.pages]


def extract_essays(year: int, pages: list[str]) -> list[str]:
    text = "\n".join(pages)
    if year >= 108:
        start = text.find("甲、申論題部分")
        end = text.find("乙、測驗題部分")
        if start == -1 or end == -1:
            raise ValueError(f"{year}: cannot locate essay section")
        text = text[start:end]
        count = 2
    else:
        start = text.find("一、")
        if start == -1:
            raise ValueError(f"{year}: cannot locate essay questions")
        text = text[start:]
        text = text.split("（請接背面）", 1)[0]
        count = 4

    matches = list(re.finditer(r"(?m)^(一|二|三|四)、", text))
    if len(matches) < count:
        raise ValueError(f"{year}: expected {count} essays, got {len(matches)}")

    essays: list[str] = []
    for index, match in enumerate(matches[:count]):
        end = matches[index + 1].start() if index + 1 < count else len(text)
        body = text[match.end() : end]
        body = re.sub(r"(?m)^代號：.*$", "", body)
        body = re.sub(r"(?m)^\d{5}(?:[-、]\d{5})?.*$", "", body)
        body = re.sub(r"(?m)^頁次：.*$", "", body)
        essays.append(normalize(body))
    return essays


def find_question_starts(text: str) -> list[re.Match[str]]:
    first_option = min((text.find(marker) for marker in OPTION_MARKERS if marker in text), default=-1)
    if first_option == -1:
        raise ValueError("option markers are missing")
    q1 = [
        match
        for match in re.finditer(r"(?m)^\s*1\s+(?=\S)", text)
        if match.start() < first_option
    ][-1]
    section = text[q1.start() :]
    starts = list(re.finditer(r"(?m)^\s*([1-9]|1[0-9]|2[0-5])\s+(?=\S)", section))
    numbers = [int(match.group(1)) for match in starts]
    if numbers != list(range(1, 26)):
        raise ValueError(f"unexpected question sequence: {numbers}")
    return starts


def extract_mcq_with_text_markers(year: int, pages: list[str]) -> list[dict[str, Any]]:
    text = "\n".join(pages)
    starts = find_question_starts(text)
    first_start = [
        match
        for match in re.finditer(r"(?m)^\s*1\s+(?=\S)", text)
        if match.start() < min(text.find(marker) for marker in OPTION_MARKERS if marker in text)
    ][-1].start()
    section = text[first_start:]

    records: list[dict[str, Any]] = []
    for index, start in enumerate(starts):
        end = starts[index + 1].start() if index < 24 else len(section)
        block = section[start.end() : end]
        marker_positions = [block.find(marker) for marker in OPTION_MARKERS]
        if any(position == -1 for position in marker_positions):
            raise ValueError(f"{year} Q{index + 1}: missing option marker")
        prompt = normalize(block[: marker_positions[0]])
        options = []
        for option_index, position in enumerate(marker_positions):
            option_end = marker_positions[option_index + 1] if option_index < 3 else len(block)
            option = block[position + 1 : option_end]
            option = re.sub(r"(?m)^代號：.*$", "", option)
            option = re.sub(r"(?m)^\d{5}(?:[-、]\d{5})?.*$", "", option)
            option = re.sub(r"(?m)^頁次：.*$", "", option)
            options.append(normalize(option))
        if not prompt or any(not option for option in options):
            raise ValueError(f"{year} Q{index + 1}: empty prompt or option")
        records.append({"prompt": prompt, "options": options})
    return records


def line_text(page: Any, bbox: tuple[float, float, float, float]) -> str:
    cropped = page.crop(bbox, strict=False)
    return normalize(cropped.extract_text(x_tolerance=2, y_tolerance=3) or "")


def extract_mcq_with_image_markers(year: int) -> list[dict[str, Any]]:
    """113's PDF stores A/B/C/D bullets as images instead of text glyphs."""

    records: list[dict[str, Any]] = []
    with pdfplumber.open(PDF_DIR / f"{year}-Q.pdf") as pdf:
        for page in pdf.pages:
            words = page.extract_words(x_tolerance=2, y_tolerance=3)
            q_starts = [
                word
                for word in words
                if word["text"].isdigit()
                and 1 <= int(word["text"]) <= 25
                and 34 <= float(word["x0"]) <= 48
            ]
            q_starts.sort(key=lambda word: float(word["top"]))
            for q_index, word in enumerate(q_starts):
                number = int(word["text"])
                q_top = float(word["top"])
                boundary = (
                    float(q_starts[q_index + 1]["top"])
                    if q_index + 1 < len(q_starts)
                    else page.height - 25
                )
                markers = [
                    image
                    for image in page.images
                    if q_top < float(image["top"]) < boundary
                    and 23.5 <= float(image["width"]) <= 30.5
                    and 11.5 <= float(image["height"]) <= 12.5
                ]
                markers.sort(key=lambda image: (round(float(image["top"]), 1), float(image["x0"])))
                if len(markers) != 4:
                    raise ValueError(f"{year} Q{number}: expected 4 image markers, got {len(markers)}")

                prompt = line_text(page, (58, q_top - 1, page.width - 30, float(markers[0]["top"]) - 2))
                rows = sorted({round(float(marker["top"]), 1) for marker in markers})
                options: list[str] = []
                for marker in markers:
                    marker_top = round(float(marker["top"]), 1)
                    next_row = next((row for row in rows if row > marker_top + 0.2), boundary)
                    same_row = [item for item in markers if abs(float(item["top"]) - float(marker["top"])) < 0.3]
                    right_markers = sorted(float(item["x0"]) for item in same_row if float(item["x0"]) > float(marker["x0"]))
                    x1 = right_markers[0] if right_markers else page.width - 30
                    option = line_text(
                        page,
                        (
                            float(marker["x0"]) + 12,
                            float(marker["top"]) - 1,
                            x1,
                            float(next_row) - 2,
                        ),
                    )
                    options.append(option)
                if not prompt or any(not option for option in options):
                    raise ValueError(f"{year} Q{number}: empty prompt or option")
                records.append({"number": number, "prompt": prompt, "options": options})

    records.sort(key=lambda record: record["number"])
    if [record["number"] for record in records] != list(range(1, 26)):
        raise ValueError(f"{year}: image parser did not find questions 1-25")
    return [{"prompt": record["prompt"], "options": record["options"]} for record in records]


def extract_answers(year: int) -> tuple[list[str], str, str]:
    corrected = PDF_DIR / f"{year}-M.pdf"
    source = corrected if corrected.exists() else PDF_DIR / f"{year}-S.pdf"
    answer_type = "M" if corrected.exists() else "S"
    with pdfplumber.open(source) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    answer_lines = [line for line in text.splitlines() if line.strip().startswith("答案 ")]
    answers: list[str] = []
    for line in answer_lines[:3]:
        answers.extend(re.findall(r"(?<![A-Z])[ABCD#](?![A-Z])", line))
    if len(answers) != 25:
        raise ValueError(f"{year}: expected 25 answers, got {len(answers)}")
    label = "考選部更正答案" if answer_type == "M" else "考選部標準答案"
    return answers, answer_type, label


def build_records() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for year in range(105, 115):
        pages = extract_pages(year)
        common = {
            "exam": "司法特考四等",
            "rocYear": year,
            "gregorianYear": year + 1911,
            "subject": "民法概要",
            "applicableCategories": ["法院書記官", "執達員", "執行員"],
            "sourceUrl": question_url(year),
        }
        for number, prompt in enumerate(extract_essays(year, pages), 1):
            records.append(
                {
                    **common,
                    "id": f"judicial-fourth-{year}-essay-{number:02d}",
                    "format": "申論題",
                    "officialQuestionNumber": number,
                    "prompt": prompt,
                    "options": [],
                    "answer": None,
                    "allCredit": False,
                    "answerSource": None,
                    "answerUrl": None,
                }
            )

        if year < 108:
            continue
        questions = (
            extract_mcq_with_image_markers(year)
            if year == 113
            else extract_mcq_with_text_markers(year, pages)
        )
        answers, answer_type, answer_label = extract_answers(year)
        for number, (question, answer) in enumerate(zip(questions, answers, strict=True), 1):
            records.append(
                {
                    **common,
                    "id": f"judicial-fourth-{year}-mcq-{number:02d}",
                    "format": "選擇題",
                    "officialQuestionNumber": number,
                    "prompt": question["prompt"],
                    "options": question["options"],
                    "answer": None if answer == "#" else ord(answer) - ord("A"),
                    "allCredit": answer == "#",
                    "answerSource": answer_label,
                    "answerUrl": question_url(year, answer_type),
                }
            )
    return records


def validate(records: list[dict[str, Any]]) -> None:
    ids = [record["id"] for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate record ids")
    essays = [record for record in records if record["format"] == "申論題"]
    mcqs = [record for record in records if record["format"] == "選擇題"]
    if len(essays) != 26 or len(mcqs) != 175:
        raise ValueError(f"expected 26 essays and 175 MCQs, got {len(essays)} and {len(mcqs)}")
    for year in range(108, 115):
        yearly = [record for record in mcqs if record["rocYear"] == year]
        if len(yearly) != 25:
            raise ValueError(f"{year}: expected 25 MCQs, got {len(yearly)}")
    all_credit = [record["id"] for record in records if record["allCredit"]]
    if all_credit != ["judicial-fourth-112-mcq-24", "judicial-fourth-113-mcq-24"]:
        raise ValueError(f"unexpected all-credit questions: {all_credit}")


if __name__ == "__main__":
    output = build_records()
    validate(output)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(output)} records to {OUTPUT}")
