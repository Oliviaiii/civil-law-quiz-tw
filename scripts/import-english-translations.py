"""Build Traditional Chinese study notes for all imported English questions.

The official MOEX paper remains the source of questions and answers.  This
script only generates a replaceable learning-aid layer: prompt/passage
translations, option translations, and compact part-of-speech labels.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app" / "data" / "legal-knowledge-and-english-questions.json"
OUTPUT = ROOT / "app" / "data" / "english-translations.json"
TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
ITEM = re.compile(r"\[\[\[START(\d{4})\]\]\](.*?)\[\[\[END\1\]\]\]", re.DOTALL)

POS_LABELS = {
    "noun": "n.",
    "verb": "v.",
    "adjective": "adj.",
    "adverb": "adv.",
    "preposition": "prep.",
    "conjunction": "conj.",
    "pronoun": "pron.",
    "determiner": "det.",
    "interjection": "interj.",
}


def request_json(params: list[tuple[str, str]], attempts: int = 3) -> Any:
    url = f"{TRANSLATE_URL}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": "civil-law-quiz-tw study-note importer"})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception:
            if attempt + 1 == attempts:
                raise
            time.sleep(1.5 * (attempt + 1))


def translated_text(payload: Any) -> str:
    return "".join(part[0] for part in payload[0] if part and part[0]).strip()


def translate_one(text: str) -> str:
    return translated_text(request_json([
        ("client", "gtx"), ("sl", "en"), ("tl", "zh-TW"), ("dt", "t"), ("q", text),
    ]))


def translate_batch(items: list[tuple[str, str]]) -> dict[str, str]:
    body = "\n".join(
        f"[[[START{index:04d}]]] {text} [[[END{index:04d}]]]"
        for index, (_, text) in enumerate(items)
    )
    payload = request_json([
        ("client", "gtx"), ("sl", "en"), ("tl", "zh-TW"), ("dt", "t"), ("q", body),
    ])
    translated = translated_text(payload)
    matches = list(ITEM.finditer(translated))
    if len(matches) != len(items):
        if len(items) == 1:
            return {items[0][0]: translate_one(items[0][1])}
        midpoint = len(items) // 2
        return {
            **translate_batch(items[:midpoint]),
            **translate_batch(items[midpoint:]),
        }
    result: dict[str, str] = {}
    for match in matches:
        key = items[int(match.group(1))][0]
        result[key] = match.group(2).strip()
    return result


def translate_all(texts: dict[str, str]) -> dict[str, str]:
    fixed = {key: text for key, text in texts.items() if re.search(r"[\u3400-\u9fff]", text)}
    texts = {key: text for key, text in texts.items() if key not in fixed}
    batches: list[list[tuple[str, str]]] = []
    current: list[tuple[str, str]] = []
    current_size = 0
    for item in texts.items():
        item_size = len(item[1]) + 20
        if current and current_size + item_size > 2400:
            batches.append(current)
            current, current_size = [], 0
        current.append(item)
        current_size += item_size
    if current:
        batches.append(current)

    output: dict[str, str] = dict(fixed)
    for number, batch in enumerate(batches, 1):
        output.update(translate_batch(batch))
        print(f"translated batch {number}/{len(batches)}")
        time.sleep(0.15)
    for key, value in list(output.items()):
        if not value:
            output[key] = translate_one(texts[key])
    return output


def phrase_pos(option: str) -> str | None:
    words = re.findall(r"[A-Za-z]+(?:['-][A-Za-z]+)*", option)
    if len(words) <= 1:
        return None
    if len(words) >= 7 or re.search(r"[.!?;]", option):
        return "句子"
    first = words[0].lower()
    if first == "to":
        return "不定詞片語"
    if first in {"at", "by", "for", "from", "in", "into", "of", "on", "over", "through", "under", "with", "without"}:
        return "介系詞片語"
    return "片語"


def lookup_word_pos(word: str) -> str:
    payload = request_json([
        ("client", "gtx"), ("sl", "en"), ("tl", "zh-TW"), ("dt", "t"), ("dt", "bd"), ("q", word),
    ])
    labels: list[str] = []
    if len(payload) > 1 and isinstance(payload[1], list):
        for entry in payload[1]:
            if entry and isinstance(entry[0], str):
                label = POS_LABELS.get(entry[0].lower())
                if label and label not in labels:
                    labels.append(label)
    if labels:
        return "/".join(labels[:2])
    lower = word.lower()
    if lower.endswith("ly"):
        return "adv."
    if lower.endswith(("ous", "ful", "less", "able", "ible", "ive", "al", "ic")):
        return "adj."
    if lower.endswith(("tion", "sion", "ment", "ness", "ity", "ance", "ence")):
        return "n."
    return "單字"


def option_pos(options: set[str]) -> dict[str, str]:
    result = {option: label for option in options if (label := phrase_pos(option))}
    words = sorted(option for option in options if option not in result)
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(lookup_word_pos, word): word for word in words}
        for count, future in enumerate(as_completed(futures), 1):
            word = futures[future]
            try:
                result[word] = future.result()
            except Exception:
                result[word] = "單字"
            if count % 100 == 0:
                print(f"looked up part of speech {count}/{len(words)}")
    return result


def main() -> None:
    records = [
        record
        for record in json.loads(SOURCE.read_text(encoding="utf-8"))
        if record["subject"] == "english"
    ]
    texts: dict[str, str] = {}
    for record in records:
        texts[f"question:{record['id']}"] = record["prompt"]
        for index, option in enumerate(record["options"]):
            texts[f"option:{record['id']}:{index}"] = option
        if record.get("passageId") and record["passageId"] not in {
            key.removeprefix("passage:") for key in texts if key.startswith("passage:")
        }:
            texts[f"passage:{record['passageId']}"] = record["passage"]

    translations = translate_all(texts)
    positions = option_pos({option for record in records for option in record["options"]})
    output: dict[str, Any] = {"questions": {}, "passages": {}}
    for record in records:
        output["questions"][record["id"]] = {
            "prompt": translations[f"question:{record['id']}"],
            "options": [
                {
                    "translation": translations[f"option:{record['id']}:{index}"],
                    "partOfSpeech": positions[option],
                }
                for index, option in enumerate(record["options"])
            ],
        }
        if record.get("passageId"):
            output["passages"][record["passageId"]] = translations[f"passage:{record['passageId']}"]

    if len(output["questions"]) != 200 or len(output["passages"]) != 20:
        raise ValueError("expected 200 question translations and 20 passage translations")
    if any(
        not item["prompt"] or len(item["options"]) != 4
        for item in output["questions"].values()
    ):
        raise ValueError("translation output is incomplete")
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(output['questions'])} questions and {len(output['passages'])} passages to {OUTPUT}")


if __name__ == "__main__":
    main()
