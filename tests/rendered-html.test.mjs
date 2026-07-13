import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the multi-subject clerk exam practice experience as static HTML", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<title>書記官法科研習室｜民法與憲法考古題練習<\/title>/);
  assert.match(html, /近十年法院書記官民法考古題/);
  assert.match(html, /民國 105–114 年司法特考四等官方試題/);
  assert.match(html, /錯題本/);
  assert.match(html, /學習紀錄/);
  assert.match(html, /<option value="constitution">憲法<\/option>/);
  assert.match(html, /<strong>201<\/strong>/);
  assert.match(html, /175[\s\S]*選擇＋[\s\S]*26[\s\S]*申論/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps questions and local progress behind replaceable data modules", async () => {
  const [page, questions, officialData, combinedData, progress, layout, packageJson, css, analysisModule, constitutionAnalysisModule, civilCode, importer] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/questions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/judicial-fourth-questions.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/legal-knowledge-and-english-questions.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/progress-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/data/judicial-fourth-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/constitution-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/civil-code-articles.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/import-moex-legal-knowledge.py", import.meta.url), "utf8"),
  ]);

  assert.match(page, /loadProgress\(\)/);
  assert.match(page, /saveProgress\(progress\)/);
  assert.match(page, /exportProgress/);
  assert.match(page, /importProgress/);
  assert.match(page, /question\.analysis\.application/);
  assert.match(page, /question\.references/);
  assert.match(page, /acceptedAnswers\?\.includes/);
  assert.match(page, /subjectFilter/);
  assert.match(page, /question-quick-nav/);
  assert.match(page, /setReviewingId\(currentQuestion\.id\)/);
  assert.match(page, /question\.id === reviewingId/);
  assert.match(page, /setReviewingId\(null\)/);
  assert.match(page, /官方答案 PDF/);
  assert.match(questions, /export const questions: Question\[\]/);
  assert.equal((questions.match(/id: "demo-/g) ?? []).length, 10);
  assert.match(questions, /officialQuestionCount/);
  assert.match(analysisModule, /buildOfficialAnalysis/);
  assert.match(analysisModule, /officialAnalysisCount/);
  assert.match(constitutionAnalysisModule, /buildConstitutionAnalysis/);
  assert.match(constitutionAnalysisModule, /decisionReferences/);
  assert.match(importer, /legal-knowledge-and-english/);
  assert.match(importer, /answer_type = "M"/);

  const records = JSON.parse(officialData);
  assert.equal(records.length, 201);
  assert.equal(records.filter((item) => item.format === "選擇題").length, 175);
  assert.equal(records.filter((item) => item.format === "申論題").length, 26);
  for (let year = 108; year <= 114; year += 1) {
    assert.equal(
      records.filter((item) => item.rocYear === year && item.format === "選擇題").length,
      25,
    );
  }
  assert.deepEqual(
    records.filter((item) => item.allCredit).map((item) => item.id),
    ["judicial-fourth-112-mcq-24", "judicial-fourth-113-mcq-24"],
  );
  assert.ok(records.every((item) => item.sourceUrl.includes("wwwq.moex.gov.tw")));

  const combinedRecords = JSON.parse(combinedData);
  assert.equal(combinedRecords.length, 500);
  assert.equal(new Set(combinedRecords.map((item) => item.id)).size, 500);
  for (let year = 105; year <= 114; year += 1) {
    const yearly = combinedRecords.filter((item) => item.rocYear === year);
    assert.equal(yearly.length, 50);
    assert.deepEqual(yearly.map((item) => item.officialQuestionNumber), Array.from({ length: 50 }, (_, index) => index + 1));
    assert.equal(yearly.filter((item) => item.subject === "constitution").length, 15);
    assert.equal(yearly.filter((item) => item.subject === "legal-introduction").length, 15);
    assert.equal(yearly.filter((item) => item.subject === "english").length, 20);
    assert.ok(yearly.every((item) => item.paper === "legal-knowledge-and-english"));
  }
  assert.equal(combinedRecords.filter((item) => item.subject === "constitution").length, 150);
  assert.deepEqual(
    combinedRecords.find((item) => item.id === "judicial-fourth-114-legal-knowledge-18").acceptedAnswers,
    [0, 1, 2],
  );
  assert.equal(
    combinedRecords.find((item) => item.id === "judicial-fourth-114-legal-knowledge-18").answerSource,
    "考選部更正答案",
  );
  const analysisFiles = await readdir(new URL("../app/data/analyses/", import.meta.url));
  const analyses = Object.assign(
    {},
    ...await Promise.all(
      analysisFiles.map(async (file) =>
        JSON.parse(await readFile(new URL(`../app/data/analyses/${file}`, import.meta.url), "utf8")),
      ),
    ),
  );
  assert.equal(Object.keys(analyses).length, 175);
  assert.deepEqual(
    new Set(Object.keys(analyses)),
    new Set(records.filter((item) => item.format === "選擇題").map((item) => item.id)),
  );
  assert.ok(Object.values(analyses).every((item) =>
    item.issue && item.rule && item.application && item.trap && item.articles.length > 0
  ));
  assert.equal(Object.keys(JSON.parse(civilCode).articles).length, 1439);
  assert.match(progress, /localStorage/);
  assert.match(progress, /civil-law-quiz-tw:progress:v2/);
  assert.match(progress, /LEGACY_PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v1"/);
  assert.match(progress, /id\.startsWith\("judicial-fourth-"\)/);
  assert.match(layout, /lang="zh-Hant"/);
  assert.match(css, /position: fixed;[\s\S]*bottom: 0;[\s\S]*env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
