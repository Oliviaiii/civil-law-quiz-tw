import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the multi-subject clerk exam practice experience as static HTML", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<title>書記官法科研習室｜九科近十年考古題<\/title>/);
  assert.match(html, /網站介紹/);
  assert.doesNotMatch(html, /近十年法院書記官民法考古題/);
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
  // 題庫改為按需載入：預先渲染的 HTML 只含載入中狀態，不含題目內容
  assert.match(html, /題庫載入中/);
  assert.doesNotMatch(html, /關於成年的敘述/);
  assert.doesNotMatch(html, /民法概要｜第/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  assert.doesNotMatch(html, /static\.cloudflareinsights\.com/);
});

test("keeps Cloudflare Web Analytics opt-in and injects its token during Pages builds", async () => {
  const [layout, workflow] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN/);
  assert.match(layout, /type="module"/);
  assert.match(layout, /https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.match(layout, /data-cf-beacon=\{JSON\.stringify/);
  assert.match(workflow, /CLOUDFLARE_WEB_ANALYTICS_TOKEN/);
});

test("keeps the initial JS payload free of question data and under budget", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((match) =>
    match[1].replace(/^\/civil-law-quiz-tw/, ""),
  );
  assert.ok(scripts.length > 0);
  let total = 0;
  for (const src of scripts) {
    const file = await readFile(new URL(`../out${src}`, import.meta.url));
    total += file.byteLength;
    assert.ok(!file.includes("滿十八歲為成年"), `initial chunk ${src} contains question data`);
    assert.ok(!file.includes("偽造文書印文罪"), `initial chunk ${src} contains question data`);
  }
  assert.ok(
    total < 900 * 1024,
    `initial JS payload ${Math.round(total / 1024)}KB exceeds 900KB budget`,
  );
});

test("keeps questions and local progress behind replaceable data modules", async () => {
  const [page, questions, officialData, criminalData, combinedData, remainingData, englishTranslationsData, progress, layout, packageJson, css, analysisModule, criminalAnalysisModule, constitutionAnalysisModule, legalIntroductionAnalysisModule, englishAnalysisModule, chineseAnalysisModule, civilCode, criminalCode, criminalImporter, importer, remainingImporter, englishTranslationImporter, progressHook, quizFilters, questionCard, questionAnalysis, filtersBar, civilBank, criminalBank, bankManifest, questionBankHook, searchIndexJson, dataManifestJson, taxonomyJson, civilTagsJson] = await Promise.all([
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
    readFile(new URL("../app/hooks/use-progress.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/quiz-filters.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/QuestionCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/QuestionAnalysis.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/FiltersBar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/banks/civil-law.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/banks/criminal-law.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/bank-manifest.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/hooks/use-question-bank.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/data/search-index.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/taxonomy/taxonomy.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/taxonomy/civil-law-tags.json", import.meta.url), "utf8"),
  ]);

  // 重構後職責分層：進度存取在 hooks、篩選邏輯在 lib、題卡與解析在 components。
  assert.match(progressHook, /loadProgress\(\)/);
  assert.match(progressHook, /saveProgress\(progress\)/);
  assert.match(page, /exportProgress/);
  assert.match(page, /importProgress/);
  assert.match(questionAnalysis, /question\.analysis\.application/);
  assert.match(questionAnalysis, /question\.references/);
  assert.match(questionCard, /acceptedAnswers\.includes/);
  assert.match(filtersBar, /MultiSelectFilter/);
  assert.match(page, /selectedSubjects/);
  assert.match(page, /selectedCorpora/);
  assert.match(page, /selectedYears/);
  assert.match(page, /function clearFilters\(\)/);
  assert.match(page, /setSelectedSubjects\(\[\]\)/);
  assert.match(page, /setSelectedCorpora\(\[\]\)/);
  assert.match(page, /setFormatFilter\("全部題型"\)/);
  assert.match(questionCard, /question-quick-nav/);
  assert.match(page, /setReviewingId\(currentQuestion\.id\)/);
  assert.match(quizFilters, /question\.id === reviewingId/);
  assert.match(page, /setReviewingId\(null\)/);
  assert.match(questionAnalysis, /官方答案 PDF/);
  // 題庫依科目拆檔按需載入：questions.ts 只保留型別，資料在 banks/* 與產生的 manifest。
  assert.match(questions, /export type Question = \{/);
  assert.doesNotMatch(questions, /questions\.json/);
  assert.doesNotMatch(civilBank, /demo-questions\.json/);
  assert.match(civilBank, /buildOfficialAnalysis/);
  assert.match(criminalBank, /criminalRecordsJson/);
  assert.match(criminalBank, /buildCriminalAnalysis/);
  assert.equal((questionBankHook.match(/import\("\.\.\/data\/banks\//g) ?? []).length, 9);

  // 產生的 bank-manifest 統計必須與原始題庫一致；資料 manifest 的 hash 必須可重算。
  const allOfficialRecords = [
    ...JSON.parse(officialData),
    ...JSON.parse(criminalData),
    ...JSON.parse(combinedData),
    ...JSON.parse(remainingData),
  ];
  assert.equal(Number(bankManifest.match(/officialQuestionCount = (\d+)/)[1]), allOfficialRecords.length);
  assert.equal(
    Number(bankManifest.match(/totalQuestionCount = (\d+)/)[1]),
    allOfficialRecords.length,
  );
  assert.equal(
    Number(bankManifest.match(/officialMultipleChoiceCount = (\d+)/)[1]),
    allOfficialRecords.filter((item) => item.format === "選擇題").length,
  );
  assert.equal(
    Number(bankManifest.match(/officialEssayCount = (\d+)/)[1]),
    allOfficialRecords.filter((item) => item.format === "申論題").length,
  );
  const searchEntries = JSON.parse(searchIndexJson);
  assert.equal(searchEntries.length, allOfficialRecords.length);
  assert.ok(searchEntries.every((item) =>
    item.id && item.subject && item.subjectLabel && item.prompt && Array.isArray(item.options) && item.source
  ));
  const dataManifest = JSON.parse(dataManifestJson);
  assert.equal(dataManifest.version, createHash("sha256").update(searchIndexJson).digest("hex").slice(0, 12));
  assert.match(bankManifest, new RegExp(`dataVersion = "${dataManifest.version}"`));
  assert.equal(dataManifest.files["search-index.json"].entries, searchEntries.length);

  // PWA：Service Worker cache 名稱帶資料版本 hash、Web App Manifest 完整
  const serviceWorker = await readFile(new URL("../out/sw.js", import.meta.url), "utf8");
  assert.match(serviceWorker, new RegExp(`clerk-law-room-${dataManifest.version}`));
  assert.match(serviceWorker, /caches\.delete/);
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  const webManifest = JSON.parse(
    await readFile(new URL("../out/manifest.webmanifest", import.meta.url), "utf8"),
  );
  assert.equal(webManifest.name, "書記官法科研習室");
  assert.equal(webManifest.icons.length, 2);
  assert.equal(webManifest.start_url, ".");
  assert.match(analysisModule, /buildOfficialAnalysis/);
  assert.match(analysisModule, /officialAnalysisCount/);
  assert.match(constitutionAnalysisModule, /buildConstitutionAnalysis/);
  assert.match(constitutionAnalysisModule, /decisionReferences/);
  assert.match(legalIntroductionAnalysisModule, /buildLegalIntroductionAnalysis/);
  assert.match(englishAnalysisModule, /buildEnglishAnalysis/);
  assert.match(chineseAnalysisModule, /buildChineseAnalysis/);
  assert.equal((chineseAnalysisModule.match(/"clerk-chinese-\d+-mcq-\d+"/g) ?? []).length, 100);
  assert.match(questionAnalysis, /選項辨析與常見誤區/);
  assert.match(questionCard, /question\.passage/);
  assert.match(questionAnalysis, /question\.englishAnalysis/);
  assert.match(questionAnalysis, /promptTranslation/);
  assert.match(questionAnalysis, /optionNotes/);
  assert.match(questionAnalysis, /partOfSpeech/);
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

  // 憲法與法緒解析：逐題種子必須齊全、有實質內容，禁止模板空話與跨題重複的涵攝。
  const combinedSeedYears = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
  const loadSeeds = async (name) =>
    Object.assign(
      {},
      ...(await Promise.all(
        combinedSeedYears.map(async (year) =>
          JSON.parse(await readFile(new URL(`../app/data/analyses/${name}-${year}.json`, import.meta.url), "utf8")),
        ),
      )),
    );
  const constitutionSeeds = await loadSeeds("constitution");
  const legalIntroductionSeeds = await loadSeeds("legal-introduction");
  // 憲法與法學緒論各 150 題都必須有人工整理的逐題解析。
  assert.equal(Object.keys(constitutionSeeds).length, 150, "constitution seeds incomplete");
  assert.equal(Object.keys(legalIntroductionSeeds).length, 150, "legal-introduction seeds incomplete");
  const seedBoilerplate = /須注意其主體、要件、期限、程序或法律效果|應再核對其主體、要件、程序或法律效果|代號：|頁次：/;
  for (const record of combinedRecords) {
    if (record.subject === "english") continue;
    const seed =
      record.subject === "constitution" ? constitutionSeeds[record.id] : legalIntroductionSeeds[record.id];
    assert.ok(seed, `${record.id} needs a curated seed`);
    assert.ok(seed.issue.length >= 8, `${record.id} issue too short`);
    assert.ok(seed.rule.length >= 40, `${record.id} rule too short`);
    assert.ok(seed.application.length >= 80, `${record.id} application too short`);
    assert.ok(seed.trap.length >= 20, `${record.id} trap too short`);
    assert.ok(["高", "中"].includes(seed.confidence), `${record.id} confidence invalid`);
    assert.ok(Array.isArray(seed.references) && seed.references.length >= 1, `${record.id} needs references`);
    assert.doesNotMatch(seed.application, seedBoilerplate, `${record.id} application uses boilerplate`);
    assert.doesNotMatch(seed.trap, seedBoilerplate, `${record.id} trap uses boilerplate`);
  }
  const seedApplications = [...Object.values(constitutionSeeds), ...Object.values(legalIntroductionSeeds)].map(
    (seed) => seed.application,
  );
  assert.equal(new Set(seedApplications).size, seedApplications.length, "duplicated application across seeds");
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
  const civilOptionReviewFiles = analysisFiles.filter((file) => file.startsWith("civil-option-reviews-"));
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
  const civilOptionReviews = Object.assign(
    {},
    ...await Promise.all(
      civilOptionReviewFiles.map(async (file) =>
        JSON.parse(await readFile(new URL(`../app/data/analyses/${file}`, import.meta.url), "utf8")),
      ),
    ),
  );
  const civilChoiceIds = records.filter((item) => item.format === "選擇題").map((item) => item.id);
  assert.equal(Object.keys(civilOptionReviews).length, 175, "civil option reviews incomplete");
  assert.deepEqual(new Set(Object.keys(civilOptionReviews)), new Set(civilChoiceIds));
  const optionKeys = ["A", "B", "C", "D"];
  const optionReviewBoilerplate =
    /須注意其主體、要件、期限、程序或法律效果|應再核對其主體、要件、程序或法律效果|依題意判斷|其餘選項不正確/;
  const reviewTexts = [];
  for (const id of civilChoiceIds) {
    const record = records.find((item) => item.id === id);
    assert.ok(record.sourceUrl.includes("wwwq.moex.gov.tw"), `${id} needs an official question source`);
    assert.ok(record.answerUrl.includes("wwwq.moex.gov.tw"), `${id} needs an official answer source`);
    const review = civilOptionReviews[id];
    assert.ok(review, `${id} needs a structured option review`);
    assert.deepEqual(
      Object.keys(review).filter((key) => key !== "intro").sort(),
      optionKeys,
      `${id} must contain exactly A-D option reviews`,
    );
    for (const key of optionKeys) {
      assert.equal(typeof review[key], "string", `${id}.${key} must be text`);
      assert.ok(review[key].length >= 20, `${id}.${key} review too short`);
      assert.doesNotMatch(review[key], optionReviewBoilerplate, `${id}.${key} uses boilerplate`);
      reviewTexts.push(review[key]);
    }
  }
  assert.equal(new Set(reviewTexts).size, 700, "civil option reviews must be unique");
  assert.match(analysisModule, /application: optionReview/);
  assert.match(analysisModule, /officialOptionReviewCount/);
  assert.equal(Object.keys(JSON.parse(civilCode).articles).length, 1439);

  // 民法章節標籤：來源可追查——由每題人工解析引用的首個民法條文依編章區間推導，
  // 標籤檔必須與由解析重新推導的結果完全一致，且覆蓋所有民法選擇題。
  const taxonomy = JSON.parse(taxonomyJson);
  assert.deepEqual(taxonomy["civil-law"].chapters, ["總則", "債編", "物權", "親屬與繼承"]);
  assert.equal(new Set(taxonomy["civil-law"].chapters).size, taxonomy["civil-law"].chapters.length);
  const civilTags = JSON.parse(civilTagsJson);
  const chapterOf = (seed) => {
    for (const item of seed?.articles ?? []) {
      const lawName = typeof item === "string" ? "民法" : (item.lawName ?? "民法");
      if (!lawName.startsWith("民法")) continue;
      const number = Number.parseInt(typeof item === "string" ? item : item.article, 10);
      if (!Number.isFinite(number) || number < 1) continue;
      if (number <= 152) return "總則";
      if (number <= 756) return "債編";
      if (number <= 966) return "物權";
      if (number <= 1225) return "親屬與繼承";
    }
    return null;
  };
  const expectedTags = {};
  for (const [id, seed] of Object.entries(analyses)) {
    const chapter = chapterOf(seed);
    if (chapter) expectedTags[id] = chapter;
  }
  assert.deepEqual(civilTags, expectedTags);
  assert.equal(
    Object.keys(civilTags).length,
    records.filter((item) => item.format === "選擇題").length,
  );
  assert.ok(Object.values(civilTags).every((chapter) => taxonomy["civil-law"].chapters.includes(chapter)));
  assert.match(civilBank, /civil-law-tags\.json/);
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
  // v3 進度格式：一次擴充所有 P3 欄位並保留 v2、v1 舊 key 的讀取與升級
  assert.match(progress, /PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v3"/);
  assert.match(progress, /civil-law-quiz-tw:progress:v2/);
  assert.match(progress, /civil-law-quiz-tw:progress:v1/);
  assert.match(progress, /id\.startsWith\("judicial-fourth-"\)/);
  assert.match(progress, /version: 3/);
  assert.match(progress, /correctStreak/);
  assert.match(progress, /dueAt/);
  assert.match(progress, /starred/);
  assert.match(progress, /dailyQuestion/);
  assert.match(progress, /examDate/);
  assert.match(layout, /lang="zh-Hant"/);
  assert.match(css, /position: fixed;[\s\S]*bottom: 0;[\s\S]*env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.multi-select-menu/);
  assert.match(css, /border-right: 2px solid currentColor/);
  assert.doesNotMatch(css, /content: "⌄"|content: "⌃"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("keeps the corrected criminal legality analysis specific and internally consistent", async () => {
  const analyses = JSON.parse(
    await readFile(new URL("../app/data/analyses/criminal-law-108.json", import.meta.url), "utf8"),
  );
  const analysis = analyses["judicial-fourth-108-criminal-law-mcq-01"];
  assert.match(analysis.application, /\(A\).*\(B\).*\(C\).*\(D\)/);
  assert.match(analysis.application, /刑法第 2 條/);
  assert.doesNotMatch(analysis.application, /最符合命題時法/);
  assert.deepEqual(analysis.articles, ["1", "2"]);
});
