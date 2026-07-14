import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the multi-subject clerk exam practice experience as static HTML", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<title>書記官法科研習室｜九科近十年考古題<\/title>/);
  assert.match(html, /近十年法院書記官民法考古題/);
  assert.match(html, /民國 105–114 年司法特考四等官方試題/);
  assert.match(html, /錯題本/);
  assert.match(html, /學習紀錄/);
  assert.match(html, /type="checkbox"[^>]*value="criminal-law"/);
  assert.match(html, /type="checkbox"[^>]*value="constitution"/);
  assert.match(html, /type="checkbox"[^>]*value="legal-introduction"/);
  assert.match(html, /type="checkbox"[^>]*value="english"/);
  assert.match(html, /type="checkbox"[^>]*value="chinese"/);
  assert.match(html, /type="checkbox"[^>]*value="administrative-law"/);
  assert.match(html, /type="checkbox"[^>]*value="civil-procedure"/);
  assert.match(html, /type="checkbox"[^>]*value="criminal-procedure"/);
  assert.match(html, /type="checkbox"[^>]*value="司法特考四等"/);
  assert.match(html, /type="checkbox"[^>]*value="114"/);
  assert.match(html, /清除所有篩選/);
  assert.match(html, /<strong>201<\/strong>/);
  assert.match(html, /175[\s\S]*選擇＋[\s\S]*26[\s\S]*申論/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps questions and local progress behind replaceable data modules", async () => {
  const [page, questions, officialData, criminalData, combinedData, remainingData, englishTranslationsData, progress, layout, packageJson, css, analysisModule, criminalAnalysisModule, constitutionAnalysisModule, legalIntroductionAnalysisModule, englishAnalysisModule, chineseAnalysisModule, civilCode, criminalCode, criminalImporter, importer, remainingImporter, englishTranslationImporter] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/questions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/judicial-fourth-questions.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/criminal-law-questions.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/legal-knowledge-and-english-questions.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/clerk-remaining-questions.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/english-translations.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/progress-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/data/judicial-fourth-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/criminal-law-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/constitution-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/legal-introduction-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/english-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/chinese-analyses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/civil-code-articles.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/criminal-code-articles.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/import-moex-criminal-law.py", import.meta.url), "utf8"),
    readFile(new URL("../scripts/import-moex-legal-knowledge.py", import.meta.url), "utf8"),
    readFile(new URL("../scripts/import-moex-clerk-remaining.py", import.meta.url), "utf8"),
    readFile(new URL("../scripts/import-english-translations.py", import.meta.url), "utf8"),
  ]);

  assert.match(page, /loadProgress\(\)/);
  assert.match(page, /saveProgress\(progress\)/);
  assert.match(page, /exportProgress/);
  assert.match(page, /importProgress/);
  assert.match(page, /question\.analysis\.application/);
  assert.match(page, /question\.references/);
  assert.match(page, /acceptedAnswers\.includes/);
  assert.match(page, /MultiSelectFilter/);
  assert.match(page, /selectedSubjects/);
  assert.match(page, /selectedCorpora/);
  assert.match(page, /selectedYears/);
  assert.match(page, /function clearFilters\(\)/);
  assert.match(page, /setSelectedSubjects\(\[\]\)/);
  assert.match(page, /setSelectedCorpora\(\[\]\)/);
  assert.match(page, /setFormatFilter\("全部題型"\)/);
  assert.match(page, /question-quick-nav/);
  assert.match(page, /setReviewingId\(currentQuestion\.id\)/);
  assert.match(page, /question\.id === reviewingId/);
  assert.match(page, /setReviewingId\(null\)/);
  assert.match(page, /官方答案 PDF/);
  assert.match(questions, /export const questions: Question\[\]/);
  assert.equal((questions.match(/id: "demo-/g) ?? []).length, 10);
  assert.match(questions, /officialQuestionCount/);
  assert.match(questions, /officialCountsBySubject/);
  assert.match(questions, /criminalRecordsJson/);
  assert.match(questions, /combinedPaperRecordsJson/);
  assert.match(analysisModule, /buildOfficialAnalysis/);
  assert.match(analysisModule, /officialAnalysisCount/);
  assert.match(constitutionAnalysisModule, /buildConstitutionAnalysis/);
  assert.match(constitutionAnalysisModule, /decisionReferences/);
  assert.match(legalIntroductionAnalysisModule, /buildLegalIntroductionAnalysis/);
  assert.match(englishAnalysisModule, /buildEnglishAnalysis/);
  assert.match(chineseAnalysisModule, /buildChineseAnalysis/);
  assert.equal((chineseAnalysisModule.match(/"clerk-chinese-\d+-mcq-\d+"/g) ?? []).length, 100);
  assert.match(page, /選項辨析與常見誤區/);
  assert.match(page, /question\.passage/);
  assert.match(page, /question\.englishAnalysis/);
  assert.match(page, /promptTranslation/);
  assert.match(page, /optionNotes/);
  assert.match(page, /partOfSpeech/);
  assert.match(englishTranslationImporter, /Traditional Chinese study notes/);
  assert.match(importer, /legal-knowledge-and-english/);
  assert.match(importer, /answer_type = "M"/);
  assert.match(remainingImporter, /行政法概要自/);

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
    assert.ok(yearly.every((item) => item.humanVerified));
  }
  assert.equal(combinedRecords.filter((item) => item.subject === "constitution").length, 150);
  assert.equal(combinedRecords.filter((item) => item.subject === "legal-introduction").length, 150);
  assert.equal(combinedRecords.filter((item) => item.subject === "english").length, 200);
  assert.equal(combinedRecords.filter((item) => item.subject === "english" && item.passageId).length, 98);
  assert.equal(new Set(combinedRecords.filter((item) => item.passageId).map((item) => item.passageId)).size, 20);
  assert.ok(combinedRecords.filter((item) => item.subject === "english").every((item) =>
    item.prompt && item.options.length === 4 && item.options.every((option) => option.length < 200)
  ));
  assert.ok(combinedRecords.filter((item) => item.subject === "english" && !item.passageId).every((item) =>
    item.prompt.includes("_____")
  ));
  const englishTranslations = JSON.parse(englishTranslationsData);
  assert.equal(Object.keys(englishTranslations.questions).length, 200);
  assert.equal(Object.keys(englishTranslations.passages).length, 20);
  assert.ok(Object.values(englishTranslations.questions).every((item) =>
    item.prompt && item.options.length === 4 && item.options.every((option) =>
      option.translation && option.partOfSpeech
    )
  ));
  assert.deepEqual(
    combinedRecords.find((item) => item.id === "judicial-fourth-114-legal-knowledge-18").acceptedAnswers,
    [0, 1, 2],
  );
  assert.equal(
    combinedRecords.find((item) => item.id === "judicial-fourth-114-legal-knowledge-18").answerSource,
    "考選部更正答案",
  );
  const remainingRecords = JSON.parse(remainingData);
  assert.equal(remainingRecords.length, 188);
  assert.equal(new Set(remainingRecords.map((item) => item.id)).size, 188);
  assert.equal(remainingRecords.filter((item) => item.studySubject === "chinese").length, 120);
  assert.equal(remainingRecords.filter((item) => item.studySubject === "chinese" && item.format === "選擇題").length, 100);
  assert.equal(remainingRecords.filter((item) => item.studySubject === "administrative-law").length, 28);
  assert.equal(remainingRecords.filter((item) => item.studySubject === "civil-procedure").length, 20);
  assert.equal(remainingRecords.filter((item) => item.studySubject === "criminal-procedure").length, 20);
  assert.ok(remainingRecords.every((item) => item.sourceUrl.includes("wwwq.moex.gov.tw")));
  assert.ok(remainingRecords.filter((item) => item.studySubject === "chinese" && item.format === "選擇題").every((item) =>
    chineseAnalysisModule.includes(`"${item.id}"`)
  ));
  assert.ok(remainingRecords.filter((item) => item.studySubject === "chinese").every((item) =>
    !/公務人員特種考試|考試試題|類科組|科目：國文/.test(`${item.prompt} ${item.options.join(" ")}`)
  ));
  assert.ok(remainingRecords.filter((item) => item.format === "申論題").every((item) => item.answer === null && item.options.length === 0));
  for (let year = 105; year <= 114; year += 1) {
    assert.equal(remainingRecords.filter((item) => item.studySubject === "chinese" && item.rocYear === year && item.format === "選擇題").length, 10);
    assert.equal(remainingRecords.filter((item) => item.studySubject === "civil-procedure" && item.rocYear === year).length, 2);
    assert.equal(remainingRecords.filter((item) => item.studySubject === "criminal-procedure" && item.rocYear === year).length, 2);
  }
  const analysisFiles = await readdir(new URL("../app/data/analyses/", import.meta.url));
  const civilAnalysisFiles = analysisFiles.filter((file) => file.startsWith("judicial-fourth-"));
  const analyses = Object.assign(
    {},
    ...await Promise.all(
      civilAnalysisFiles.map(async (file) =>
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
  const criminalRecords = JSON.parse(criminalData);
  assert.equal(criminalRecords.length, 201);
  assert.equal(criminalRecords.filter((item) => item.format === "選擇題").length, 175);
  assert.equal(criminalRecords.filter((item) => item.format === "申論題").length, 26);
  assert.equal(new Set(criminalRecords.map((item) => item.id)).size, 201);
  assert.ok(criminalRecords.every((item) => item.studySubject === "刑法"));
  for (let year = 108; year <= 114; year += 1) {
    assert.equal(
      criminalRecords.filter((item) => item.rocYear === year && item.format === "選擇題").length,
      25,
    );
  }
  assert.deepEqual(
    criminalRecords.filter((item) => item.allCredit).map((item) => item.id),
    ["judicial-fourth-111-criminal-law-mcq-11"],
  );
  assert.deepEqual(
    criminalRecords.find((item) => item.id === "judicial-fourth-112-criminal-law-mcq-16").acceptedAnswers,
    [2, 3],
  );
  assert.deepEqual(
    criminalRecords.find((item) => item.id === "judicial-fourth-113-criminal-law-mcq-22").acceptedAnswers,
    [1, 3],
  );
  assert.ok(criminalRecords.every((item) => item.sourceUrl.includes("wwwq.moex.gov.tw")));
  assert.match(criminalAnalysisModule, /criminalAnalysisCount/);
  const criminalAnalysisFiles = analysisFiles.filter((file) => file.startsWith("criminal-law-"));
  const criminalAnalyses = Object.assign(
    {},
    ...await Promise.all(
      criminalAnalysisFiles.map(async (file) =>
        JSON.parse(await readFile(new URL(`../app/data/analyses/${file}`, import.meta.url), "utf8")),
      ),
    ),
  );
  assert.equal(Object.keys(criminalAnalyses).length, 175);
  assert.deepEqual(
    new Set(Object.keys(criminalAnalyses)),
    new Set(criminalRecords.filter((item) => item.format === "選擇題").map((item) => item.id)),
  );
  assert.ok(Object.values(criminalAnalyses).every((item) =>
    item.issue && item.rule && item.application && item.trap && item.articles.length > 0
  ));
  assert.equal(Object.keys(JSON.parse(criminalCode).articles).length, 422);
  assert.match(criminalImporter, /answer_type = "M" if valid_pdf\(corrected\) else "S"/);
  assert.match(criminalImporter, /accepted\[16\] = \[2, 3\]/);
  assert.match(criminalImporter, /accepted\[22\] = \[1, 3\]/);
  assert.match(progress, /localStorage/);
  assert.match(progress, /civil-law-quiz-tw:progress:v2/);
  assert.match(progress, /LEGACY_PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v1"/);
  assert.match(progress, /id\.startsWith\("judicial-fourth-"\)/);
  assert.match(layout, /lang="zh-Hant"/);
  assert.match(css, /position: fixed;[\s\S]*bottom: 0;[\s\S]*env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.multi-select-menu/);
  assert.match(css, /border-right: 2px solid currentColor/);
  assert.doesNotMatch(css, /content: "⌄"|content: "⌃"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
