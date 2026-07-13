"""Import ROC 105-114 Court Clerk criminal-law papers from official MOEX PDFs.

The official PDFs must be placed in ``tmp/pdfs-criminal`` as ``YEAR-Q.pdf``
and, where available, ``YEAR-S.pdf`` / ``YEAR-M.pdf``. Corrected answer sheets
(``M``) take precedence over standard answer sheets (``S``).
"""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path
from typing import Any

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "tmp" / "pdfs-criminal"
OUTPUT = ROOT / "app" / "data" / "criminal-law-questions.json"

MANIFEST = {
    105: {"code": "105120", "class": "201", "subject": "0604"},
    106: {"code": "106130", "class": "201", "subject": "0604"},
    107: {"code": "107130", "class": "201", "subject": "0604"},
    108: {"code": "108130", "class": "201", "subject": "0605"},
    109: {"code": "109130", "class": "201", "subject": "0605"},
    110: {"code": "110130", "class": "201", "subject": "0504"},
    111: {"code": "111130", "class": "201", "subject": "0504"},
    112: {"code": "112130", "class": "201", "subject": "0504"},
    113: {"code": "113120", "class": "201", "subject": "0503"},
    114: {"code": "114120", "class": "201", "subject": "0504"},
}


def load_shared_parser() -> Any:
    path = ROOT / "scripts" / "import-moex-judicial-fourth.py"
    spec = importlib.util.spec_from_file_location("civil_importer", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load the shared MOEX parser")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.PDF_DIR = PDF_DIR
    module.MANIFEST = MANIFEST
    return module


def question_url(year: int, answer_type: str = "Q") -> str:
    item = MANIFEST[year]
    return (
        "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx"
        f"?t={answer_type}&code={item['code']}&c={item['class']}"
        f"&s={item['subject']}&q=1"
    )


def valid_pdf(path: Path) -> bool:
    return path.exists() and path.stat().st_size > 2_500


def extract_answers(year: int) -> tuple[list[str], dict[int, list[int]], str, str]:
    corrected = PDF_DIR / f"{year}-M.pdf"
    answer_type = "M" if valid_pdf(corrected) else "S"
    source = corrected if answer_type == "M" else PDF_DIR / f"{year}-S.pdf"
    with pdfplumber.open(source) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    answer_lines = [line for line in text.splitlines() if line.strip().startswith("答案 ")]
    answers: list[str] = []
    for line in answer_lines[:3]:
        answers.extend(re.findall(r"(?<![A-Z])[ABCD#](?![A-Z])", line))
    if len(answers) != 25:
        raise ValueError(f"{year}: expected 25 answers, got {len(answers)}")

    accepted: dict[int, list[int]] = {}
    if year == 112:
        accepted[16] = [2, 3]
    elif year == 113:
        accepted[22] = [1, 3]

    label = "考選部更正答案" if answer_type == "M" else "考選部標準答案"
    return answers, accepted, answer_type, label


def build_records() -> list[dict[str, Any]]:
    parser = load_shared_parser()
    records: list[dict[str, Any]] = []
    for year in range(105, 115):
        pages = parser.extract_pages(year)
        common = {
            "exam": "司法特考四等",
            "rocYear": year,
            "gregorianYear": year + 1911,
            "subject": "刑法概要",
            "studySubject": "刑法",
            "paper": "criminal-law-summary",
            "applicableCategories": ["法院書記官"],
            "sourceUrl": question_url(year),
        }
        for number, prompt in enumerate(parser.extract_essays(year, pages), 1):
            records.append({
                **common,
                "id": f"judicial-fourth-{year}-criminal-law-essay-{number:02d}",
                "format": "申論題",
                "officialQuestionNumber": number,
                "prompt": prompt,
                "options": [],
                "answer": None,
                "acceptedAnswers": [],
                "allCredit": False,
                "answerSource": None,
                "answerUrl": None,
            })

        if year < 108:
            continue
        questions = parser.extract_mcq_with_text_markers(year, pages)
        answers, accepted, answer_type, answer_label = extract_answers(year)
        for number, (question, answer) in enumerate(zip(questions, answers, strict=True), 1):
            accepted_answers = accepted.get(number, [])
            all_credit = answer == "#" and not accepted_answers
            primary_answer = accepted_answers[0] if accepted_answers else (
                None if all_credit else ord(answer) - ord("A")
            )
            records.append({
                **common,
                "id": f"judicial-fourth-{year}-criminal-law-mcq-{number:02d}",
                "format": "選擇題",
                "officialQuestionNumber": number,
                "prompt": question["prompt"],
                "options": question["options"],
                "answer": primary_answer,
                "acceptedAnswers": accepted_answers or ([primary_answer] if primary_answer is not None else []),
                "allCredit": all_credit,
                "answerSource": answer_label,
                "answerUrl": question_url(year, answer_type),
            })
    return records


def validate(records: list[dict[str, Any]]) -> None:
    ids = [record["id"] for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate criminal-law ids")
    essays = [record for record in records if record["format"] == "申論題"]
    mcqs = [record for record in records if record["format"] == "選擇題"]
    if len(essays) != 26 or len(mcqs) != 175:
        raise ValueError(f"expected 26 essays and 175 MCQs, got {len(essays)} and {len(mcqs)}")
    expected_corrections = {
        "judicial-fourth-111-criminal-law-mcq-11": (True, []),
        "judicial-fourth-112-criminal-law-mcq-16": (False, [2, 3]),
        "judicial-fourth-113-criminal-law-mcq-22": (False, [1, 3]),
    }
    corrected = {
        record["id"]: (record["allCredit"], record["acceptedAnswers"])
        for record in mcqs
        if record["answerSource"] == "考選部更正答案" and
        (record["allCredit"] or len(record["acceptedAnswers"]) > 1)
    }
    if corrected != expected_corrections:
        raise ValueError(f"unexpected corrected answers: {corrected}")


if __name__ == "__main__":
    output = build_records()
    validate(output)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(output)} records to {OUTPUT}")
