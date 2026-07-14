"""匯入法院書記官尚缺的國文、行政法與民刑事訴訟法官方試題。

資料範圍為民國 105–114 年司法特考四等法院書記官。行政法概要自
108 年起才是本科考科；民刑事訴訟法合科依官方題序拆成前兩題民訴、
後兩題刑訴。國文選擇題使用考選部標準（或更正）答案，其餘申論題只
保留原題與官方 PDF，不建立非官方擬答。
"""

from __future__ import annotations

import json
import re
import ssl
import urllib.request
from pathlib import Path
from typing import Any

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "tmp" / "clerk-remaining-pdfs"
OUTPUT = ROOT / "app" / "data" / "clerk-remaining-questions.json"

MANIFEST = {
    105: {"code": "105120", "chinese": "0102", "procedure": "0505"},
    106: {"code": "106130", "chinese": "0103", "procedure": "0507"},
    107: {"code": "107130", "chinese": "0103", "procedure": "0507"},
    108: {"code": "108130", "chinese": "0103", "administrative": "0406", "procedure": "0507"},
    109: {"code": "109130", "chinese": "0103", "administrative": "0406", "procedure": "0506"},
    110: {"code": "110130", "chinese": "0103", "administrative": "0306", "procedure": "0407"},
    111: {"code": "111130", "chinese": "0103", "administrative": "0306", "procedure": "0407"},
    112: {"code": "112130", "chinese": "0103", "administrative": "0305", "procedure": "0407"},
    113: {"code": "113120", "chinese": "0102", "administrative": "0302", "procedure": "0407"},
    114: {"code": "114120", "chinese": "0102", "administrative": "0302", "procedure": "0408"},
}

OPTION_MARKERS = [chr(codepoint) for codepoint in range(0xE18C, 0xE190)]
OLD_QUESTION_MARKERS = [chr(codepoint) for codepoint in range(0xE0C6, 0xE0D0)]
CHINESE_NUMERALS = ["一", "二", "三", "四"]


def official_url(year: int, subject: str, kind: str = "Q") -> str:
    item = MANIFEST[year]
    return (
        "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx"
        f"?t={kind}&code={item['code']}&c=201&s={item[subject]}&q=1"
    )


def download(url: str, target: Path) -> bool:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    # 考選部站台的憑證缺少部分 Windows / Python 會要求的延伸欄位；下載後仍會
    # 以 PDF magic bytes 驗證內容，且資料網址由上方固定 manifest 組成。
    context = ssl._create_unverified_context()
    with urllib.request.urlopen(request, context=context, timeout=60) as response:
        content = response.read()
    if not content.startswith(b"%PDF"):
        return False
    target.write_bytes(content)
    return True


def ensure_pdfs() -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    for year, item in MANIFEST.items():
        for subject in ("chinese", "administrative", "procedure"):
            if subject not in item:
                continue
            kinds = ("Q", "S", "M") if subject == "chinese" else ("Q",)
            for kind in kinds:
                target = PDF_DIR / f"{year}-{subject}-{kind}.pdf"
                if target.exists() and target.read_bytes()[:4] == b"%PDF":
                    continue
                if not download(official_url(year, subject, kind), target) and target.exists():
                    target.unlink()


def normalize(text: str) -> str:
    replacements = {"年": "年", "不": "不", "藍": "藍", "Ａ": "A"}
    for old, new in replacements.items():
        text = text.replace(old, new)
    for index, marker in enumerate(("\ue129", "\ue12a", "\ue12b", "\ue12c"), 1):
        text = text.replace(marker, f"（{CHINESE_NUMERALS[index - 1]}）")
    text = re.sub(r"(?m)^代號：.*$", "", text)
    text = re.sub(r"(?m)^頁次：.*$", "", text)
    text = re.sub(r"(?m)^\s*[\d、，－-]{5,}(?:\s+[\d、，－-]+)*\s*$", "", text)
    text = re.sub(r"(?m)^\s*[−-]\s*$", "", text)
    text = re.sub(r"(?m)^\s*（?請接背面）?\s*$", "", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=[\u3400-\u9fff，。；：？！、）]) (?=[\u3400-\u9fff（])", "", text)
    return text.strip()


def extract_text(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text(x_tolerance=2, y_tolerance=3) or "" for page in pdf.pages)


def split_numbered_questions(text: str, count: int = 4) -> list[str]:
    matches = list(re.finditer(r"(?m)^\s*([一二三四])、", text))
    start = next((index for index, match in enumerate(matches) if match.group(1) == "一"), None)
    if start is None or len(matches[start : start + count]) < count:
        raise ValueError("找不到完整申論題題序")
    selected = matches[start : start + count]
    results = []
    for index, match in enumerate(selected):
        end = selected[index + 1].start() if index + 1 < count else len(text)
        results.append(normalize(text[match.end() : end]))
    return results


def extract_numbered_essays(path: Path) -> list[str]:
    text = extract_text(path)
    try:
        return split_numbered_questions(text)
    except ValueError:
        # 110 年行政法的題號是嵌入 PDF 的小圖，文字層只留下四段題幹。
        with pdfplumber.open(path) as pdf:
            if len(pdf.pages) != 1:
                raise
            page = pdf.pages[0]
            markers = sorted(
                [
                    image for image in page.images
                    if float(image["x0"]) < 45 and float(image["top"]) > 220
                ],
                key=lambda image: float(image["top"]),
            )
            if len(markers) != 4:
                raise
            results = []
            for index, marker in enumerate(markers):
                top = float(marker["top"]) - 8
                bottom = float(markers[index + 1]["top"]) - 8 if index < 3 else page.height - 22
                cropped = page.crop((60, top, page.width - 24, bottom), strict=False)
                results.append(normalize(cropped.extract_text(x_tolerance=2, y_tolerance=3) or ""))
            return results


def extract_chinese_essays(year: int, text: str) -> list[tuple[str, str]]:
    text = text.replace("不", "不")
    section_end = text.find("乙、測驗")
    if section_end == -1:
        raise ValueError(f"{year}: 找不到國文測驗段落")
    essay_section = text[:section_end]
    if year <= 111:
        composition = re.search(r"(?m)^\s*一、作文[：:]?[^\n]*\n", essay_section)
        if not composition:
            raise ValueError(f"{year}: 找不到作文")
        public_writing = re.search(r"(?m)^\s*二、公文[：:]?[^\n]*\n", essay_section)
        composition_end = public_writing.start() if public_writing else len(essay_section)
        records = [("作文", normalize(essay_section[composition.end() : composition_end]))]
        if public_writing:
            records.append(("公文", normalize(essay_section[public_writing.end() :])))
        return records

    matches = list(re.finditer(r"(?m)^\s*([一二])、([^\n：:]+)[：:]?[^\n]*\n", essay_section))
    if len(matches) != 2:
        raise ValueError(f"{year}: 新制國文應有兩題寫作，實際 {len(matches)}")
    instruction_end = essay_section.rfind("不得於試卷上書寫姓名或座號。", 0, matches[0].start())
    shared_stem = normalize(essay_section[instruction_end + len("不得於試卷上書寫姓名或座號。"):matches[0].start()])
    records = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index == 0 else len(essay_section)
        prompt = normalize(essay_section[match.end() : end])
        if shared_stem:
            prompt = f"{shared_stem} {prompt}"
        records.append(("短文寫作" if index == 0 else "作文", prompt))
    return records


def extract_chinese_mcq_from_images(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            markers = sorted(
                [image for image in page.images if float(image["x0"]) < 50],
                key=lambda image: float(image["top"]),
            )
            for index, marker in enumerate(markers):
                top = float(marker["top"]) - 3
                bottom = float(markers[index + 1]["top"]) - 3 if index + 1 < len(markers) else page.height - 22
                block = page.crop((55, top, page.width - 24, bottom), strict=False).extract_text(
                    x_tolerance=2, y_tolerance=3,
                ) or ""
                positions = [block.find(option_marker) for option_marker in OPTION_MARKERS]
                if any(position < 0 for position in positions):
                    continue
                prompt = normalize(block[:positions[0]])
                options = []
                for option_index, position in enumerate(positions):
                    option_end = positions[option_index + 1] if option_index < 3 else len(block)
                    options.append(normalize(block[position + 1:option_end]))
                if prompt and all(options):
                    records.append({"number": len(records) + 1, "prompt": prompt, "options": options})
    if len(records) != 10:
        raise ValueError(f"圖片題號解析應有 10 題，實際 {len(records)}")
    return records


def extract_chinese_mcq(year: int, text: str) -> list[dict[str, Any]]:
    section_start = text.find("乙、測驗")
    section = text[section_start:] if section_start >= 0 else text
    old_starts = [(section.find(marker), number) for number, marker in enumerate(OLD_QUESTION_MARKERS, 1)]
    old_starts = [(position, number) for position, number in old_starts if position >= 0]
    if len(old_starts) == 10:
        starts = sorted(old_starts)
        offsets = [(position, position + 1, number) for position, number in starts]
    else:
        matches = list(re.finditer(r"(?m)^\s*(10|[1-9])\s+(?=\S)", section))
        sequence_start = next(
            (index for index in range(len(matches) - 9) if [int(item.group(1)) for item in matches[index : index + 10]] == list(range(1, 11))),
            None,
        )
        if sequence_start is None:
            return extract_chinese_mcq_from_images(PDF_DIR / f"{year}-chinese-Q.pdf")
        sequence = matches[sequence_start : sequence_start + 10]
        offsets = [(match.start(), match.end(), int(match.group(1))) for match in sequence]

    questions = []
    for index, (_, content_start, number) in enumerate(offsets):
        end = offsets[index + 1][0] if index + 1 < len(offsets) else len(section)
        block = section[content_start:end]
        positions = [block.find(marker) for marker in OPTION_MARKERS]
        if any(position < 0 for position in positions):
            raise ValueError(f"{year} 國文第 {number} 題缺少選項標記")
        prompt = normalize(block[: positions[0]])
        options = []
        for option_index, position in enumerate(positions):
            option_end = positions[option_index + 1] if option_index < 3 else len(block)
            options.append(normalize(block[position + 1 : option_end]))
        if not prompt or any(not option for option in options):
            raise ValueError(f"{year} 國文第 {number} 題內容不完整")
        questions.append({"number": number, "prompt": prompt, "options": options})
    return questions


def extract_chinese_answers(year: int) -> tuple[list[str], str, str]:
    corrected = PDF_DIR / f"{year}-chinese-M.pdf"
    standard = PDF_DIR / f"{year}-chinese-S.pdf"
    source = corrected if corrected.exists() else standard
    kind = "M" if corrected.exists() else "S"
    text = extract_text(source)
    answer_line = next((line for line in text.splitlines() if line.strip().startswith("答案 ")), "")
    answers = re.findall(r"(?<![A-Z])[ABCD#](?![A-Z])", answer_line)
    if len(answers) != 10:
        raise ValueError(f"{year}: 國文答案應有 10 題，實際 {len(answers)}")
    label = "考選部更正答案" if kind == "M" else "考選部標準答案"
    return answers, kind, label


def common_record(year: int, subject: str, study_subject: str, paper: str, source_url: str) -> dict[str, Any]:
    return {
        "exam": "司法特考四等",
        "rocYear": year,
        "gregorianYear": year + 1911,
        "subject": subject,
        "studySubject": study_subject,
        "paper": paper,
        "applicableCategories": ["法院書記官"],
        "sourceUrl": source_url,
    }


def build_records() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for year in range(105, 115):
        chinese_text = extract_text(PDF_DIR / f"{year}-chinese-Q.pdf")
        common = common_record(year, "國文", "chinese", "chinese", official_url(year, "chinese"))
        for number, (kind, prompt) in enumerate(extract_chinese_essays(year, chinese_text), 1):
            records.append({
                **common, "id": f"clerk-chinese-{year}-essay-{number:02d}", "format": "申論題",
                "officialQuestionNumber": number, "questionKind": kind, "prompt": prompt, "options": [],
                "answer": None, "acceptedAnswers": [], "allCredit": False, "answerSource": None, "answerUrl": None,
            })
        answers, answer_kind, answer_label = extract_chinese_answers(year)
        for question in extract_chinese_mcq(year, chinese_text):
            answer = answers[question["number"] - 1]
            accepted = [] if answer == "#" else [ord(answer) - ord("A")]
            records.append({
                **common, "id": f"clerk-chinese-{year}-mcq-{question['number']:02d}", "format": "選擇題",
                "officialQuestionNumber": question["number"], "questionKind": "測驗",
                "prompt": question["prompt"], "options": question["options"],
                "answer": accepted[0] if accepted else None, "acceptedAnswers": accepted,
                "allCredit": answer == "#", "answerSource": answer_label,
                "answerUrl": official_url(year, "chinese", answer_kind),
            })

        procedure_path = PDF_DIR / f"{year}-procedure-Q.pdf"
        for number, prompt in enumerate(extract_numbered_essays(procedure_path), 1):
            is_civil = number <= 2
            study_subject = "civil-procedure" if is_civil else "criminal-procedure"
            label = "民事訴訟法概要" if is_civil else "刑事訴訟法概要"
            records.append({
                **common_record(year, label, study_subject, "civil-criminal-procedure-summary", official_url(year, "procedure")),
                "id": f"clerk-{study_subject}-{year}-essay-{number:02d}", "format": "申論題",
                "officialQuestionNumber": number, "questionKind": "申論",
                "prompt": prompt, "options": [], "answer": None, "acceptedAnswers": [], "allCredit": False,
                "answerSource": None, "answerUrl": None,
            })

        if "administrative" in MANIFEST[year]:
            administrative_path = PDF_DIR / f"{year}-administrative-Q.pdf"
            for number, prompt in enumerate(extract_numbered_essays(administrative_path), 1):
                records.append({
                    **common_record(year, "行政法概要", "administrative-law", "administrative-law-summary", official_url(year, "administrative")),
                    "id": f"clerk-administrative-law-{year}-essay-{number:02d}", "format": "申論題",
                    "officialQuestionNumber": number, "questionKind": "申論",
                    "prompt": prompt, "options": [], "answer": None, "acceptedAnswers": [], "allCredit": False,
                    "answerSource": None, "answerUrl": None,
                })
    return records


def validate(records: list[dict[str, Any]]) -> None:
    ids = [record["id"] for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError("題目 ID 重複")
    expected = {"chinese": 120, "administrative-law": 28, "civil-procedure": 20, "criminal-procedure": 20}
    actual = {key: sum(record["studySubject"] == key for record in records) for key in expected}
    if actual != expected:
        raise ValueError(f"題數不符：{actual}")
    for record in records:
        if not record["prompt"]:
            raise ValueError(f"空白題目：{record['id']}")
        if record["format"] == "選擇題" and len(record["options"]) != 4:
            raise ValueError(f"選項數量錯誤：{record['id']}")


def main() -> None:
    ensure_pdfs()
    records = build_records()
    validate(records)
    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(records)} records to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
