#!/usr/bin/env python3
"""把一批種子合併進 repo 年度 JSON，並做格式/品質驗證。
用法：integrate-batch.py <subject> <year> [seeds-dir]   （subject: constitution | legal-introduction）
"""
import json, sys, os, re, glob
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SEEDS = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else REPO / "docs" / "handover" / "pending-seeds"

subject, year = sys.argv[1], int(sys.argv[2])
SOURCES_MAP = REPO / "docs" / "handover" / "sources" / f"{subject}-{year}.json"
lo, hi = (1, 15) if subject == "constitution" else (16, 30)
repo_path = REPO / "app" / "data" / "analyses" / f"{subject}-{year}.json"
repo_seeds = json.load(open(repo_path, encoding="utf-8"))
sources_map = json.load(open(SOURCES_MAP, encoding="utf-8")) if os.path.exists(SOURCES_MAP) else {}
questions = {r["id"]: r for r in json.load(open(REPO / "app" / "data" / "legal-knowledge-and-english-questions.json", encoding="utf-8"))}

BOILERPLATE = re.compile(r"須注意其主體、要件、期限、程序或法律效果|應再核對其主體、要件、程序或法律效果|代號：|頁次：")
REQUIRED = ["issue", "rule", "application", "trap", "confidence", "references"]

# 全站既有 application（跨題重複檢查）
all_apps = {}
for f in glob.glob(str(REPO / "app" / "data" / "analyses" / "constitution-*.json")) + glob.glob(str(REPO / "app" / "data" / "analyses" / "legal-introduction-*.json")):
    for k, v in json.load(open(f, encoding="utf-8")).items():
        all_apps[v["application"]] = k

errors, merged = [], []
for n in range(lo, hi + 1):
    qid = f"judicial-fourth-{year}-legal-knowledge-{n:02d}"
    if qid in repo_seeds:
        continue
    path = SEEDS / f"{qid}.json"
    if not os.path.exists(path):
        errors.append(f"{qid}: 種子檔不存在")
        continue
    try:
        seed = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        errors.append(f"{qid}: JSON 解析失敗 {e}")
        continue
    for field in REQUIRED:
        if field not in seed:
            errors.append(f"{qid}: 缺欄位 {field}")
    if errors and errors[-1].startswith(qid):
        continue
    if seed["confidence"] not in ("高", "中"):
        errors.append(f"{qid}: confidence 非 高/中")
    if len(seed["issue"]) < 8 or len(seed["rule"]) < 40 or len(seed["application"]) < 80 or len(seed["trap"]) < 20:
        errors.append(f"{qid}: 欄位長度不足 issue={len(seed['issue'])} rule={len(seed['rule'])} app={len(seed['application'])} trap={len(seed['trap'])}")
    if BOILERPLATE.search(seed["application"]) or BOILERPLATE.search(seed["trap"]):
        errors.append(f"{qid}: 含模板句/雜訊")
    if seed["application"] in all_apps:
        errors.append(f"{qid}: application 與 {all_apps[seed['application']]} 重複")
    if not seed["references"]:
        errors.append(f"{qid}: references 為空")
    for ref in seed["references"]:
        host = ref.get("url", "")
        if not re.match(r"https://[a-z0-9-]+(\.[a-z0-9-]+)*\.gov\.tw/", host):
            errors.append(f"{qid}: reference url 非官方網域 {host}")
    # 簡體字抽查（常見字）
    if re.search(r"[习门时长发达对开关书车东问题条现] ", seed["application"]):
        errors.append(f"{qid}: 疑似簡體字")
    all_apps[seed["application"]] = qid
    entry = {k: seed[k] for k in REQUIRED}
    sources = seed.get("sources") or []
    if sources:
        sources_map[qid] = sources
    repo_seeds[qid] = entry
    merged.append(qid)

if errors:
    print("[FAIL]")
    for e in errors:
        print(" -", e)
    sys.exit(1)

with open(repo_path, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(dict(sorted(repo_seeds.items())), handle, ensure_ascii=False, indent=1)
    handle.write("\n")
with open(SOURCES_MAP, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(dict(sorted(sources_map.items())), handle, ensure_ascii=False, indent=1)
    handle.write("\n")
total = sum(len(json.load(open(f, encoding="utf-8"))) for f in glob.glob(str(REPO / "app" / "data" / "analyses" / "constitution-*.json")) + glob.glob(str(REPO / "app" / "data" / "analyses" / "legal-introduction-*.json")))
print(f"[OK] 合併 {len(merged)} 題進 {subject}-{year}.json；全站進度 {total}/300")
