#!/usr/bin/env python3
"""重建工作流所需的逐題題目小檔（questionsDir）。
用法：make-question-files.py <輸出資料夾>
資料來源：app/data/legal-knowledge-and-english-questions.json（憲法+法緒共 300 題）。
"""
import json, os, sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
root = os.path.join(os.path.dirname(__file__), "..", "..")
recs = json.load(open(os.path.join(root, "app/data/legal-knowledge-and-english-questions.json")))
count = 0
for r in recs:
    if r["subject"] not in ("constitution", "legal-introduction"):
        continue
    accepted = r.get("acceptedAnswers") or ([r["answer"]] if r["answer"] is not None else [])
    q = {
        "id": r["id"], "rocYear": r["rocYear"], "no": r["officialQuestionNumber"],
        "prompt": r["prompt"], "options": r["options"],
        "answerLetters": "/".join(chr(65 + i) for i in accepted),
        "allCredit": r["allCredit"],
    }
    json.dump(q, open(os.path.join(out, f'{r["id"]}.json'), "w"), ensure_ascii=False, indent=1)
    count += 1
print(f"wrote {count} question files to {out}")
