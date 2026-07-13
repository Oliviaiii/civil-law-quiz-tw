#!/usr/bin/env python3
"""Download the current Criminal Code into a compact static article lookup."""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path


SOURCE_URL = (
    "https://raw.githubusercontent.com/kong0107/mojLawSplitJSON/"
    "gh-pages/FalVMingLing/C0000001.json"
)
OUTPUT = Path(__file__).resolve().parents[1] / "app" / "data" / "criminal-code-articles.json"


def normalize_article_number(label: str) -> str:
    match = re.search(r"第\s*([0-9]+(?:\s*(?:之|-)\s*[0-9]+)?)\s*條", label)
    if not match:
        raise ValueError(f"Unexpected article label: {label}")
    return re.sub(r"\s*(?:之|-)\s*", "-", match.group(1))


def main() -> None:
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "civil-law-quiz-tw/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        source = json.load(response)
    articles = {
        normalize_article_number(item["條號"]): item["條文內容"]
        for item in source["法規內容"]
        if "條號" in item and "條文內容" in item
    }
    payload = {
        "lawName": source["法規名稱"],
        "sourceUrl": source["法規網址"],
        "sourceRepository": "https://github.com/kong0107/mojLawSplitJSON",
        "updatedAt": source["最新異動日期"],
        "articles": articles,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(articles)} Criminal Code articles to {OUTPUT}")


if __name__ == "__main__":
    main()
