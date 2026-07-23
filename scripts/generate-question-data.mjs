// 由原始題庫 JSON 產生：
//   1. app/data/bank-manifest.ts —— 首頁 shell 需要的年度清單與題數統計（不含題目內容）
//   2. public/data/search-index.json —— 全文搜尋用的輕量索引（題幹、選項、科目、來源、年度、題號、法規）
//   3. public/data/essay-issue-stats.json —— 申論考點章節層級歷屆統計（按需載入，不進首頁 bundle）
//   4. public/data/manifest.json —— 資料版本 hash，供 Service Worker 判斷快取失效
// 以 npm run build:pages 的 prebuild hook 自動執行。
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));

const civilRecords = require("../app/data/judicial-fourth-questions.json");
const criminalRecords = require("../app/data/criminal-law-questions.json");
const combinedRecords = require("../app/data/legal-knowledge-and-english-questions.json");
const remainingRecords = require("../app/data/clerk-remaining-questions.json");

const analysisYears = [108, 109, 110, 111, 112, 113, 114];
const civilAnalyses = Object.assign(
  {},
  ...analysisYears.map((year) => require(`../app/data/analyses/judicial-fourth-${year}.json`)),
);
const criminalAnalyses = Object.assign(
  {},
  ...analysisYears.map((year) => require(`../app/data/analyses/criminal-law-${year}.json`)),
);
const combinedAnalysisYears = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
const constitutionAnalyses = Object.assign(
  {},
  ...combinedAnalysisYears.map((year) => require(`../app/data/analyses/constitution-${year}.json`)),
);
const legalIntroductionAnalyses = Object.assign(
  {},
  ...combinedAnalysisYears.map((year) => require(`../app/data/analyses/legal-introduction-${year}.json`)),
);
const combinedSeedOf = (record) =>
  record.subject === "constitution"
    ? constitutionAnalyses[record.id]
    : record.subject === "legal-introduction"
      ? legalIntroductionAnalyses[record.id]
      : null;

// 憲法／法緒種子以 references 標註法規名與條號，轉成與民刑法一致的搜尋用格式。
function lawsFromReferences(seed) {
  if (!seed?.references) return [];
  return seed.references
    .filter((reference) => reference.type === "statute")
    .map((reference) => `${reference.title}${(reference.locator ?? "").replace(/\s+/g, "")}`);
}

function lawsFromSeed(seed, defaultLawName) {
  if (!seed?.articles) return [];
  return seed.articles.map((item) =>
    typeof item === "string"
      ? `${defaultLawName}第${item}條`
      : `${item.lawName ?? defaultLawName}第${item.article}條`,
  );
}

// 解析關鍵字：取爭點與常見誤區兩個短欄位，避免索引檔過大。
function keywordsFromSeed(seed) {
  if (!seed) return "";
  return [seed.issue, seed.trap].filter(Boolean).join(" ");
}

// 民法章節標籤：以人工複核解析引用的首個民法條文，依民法編章區間分類。
// 非民法法條（如釋字施行法）跳過；完全未引用民法條文者不產生標籤（維持待分類）。
function civilChapterOf(seed) {
  if (!seed?.articles) return null;
  for (const item of seed.articles) {
    const lawName = typeof item === "string" ? "民法" : (item.lawName ?? "民法");
    if (!lawName.startsWith("民法")) continue;
    const articleText = typeof item === "string" ? item : item.article;
    const number = Number.parseInt(articleText, 10);
    if (!Number.isFinite(number) || number < 1) continue;
    if (number <= 152) return "總則";
    if (number <= 756) return "債編";
    if (number <= 966) return "物權";
    if (number <= 1225) return "親屬與繼承";
  }
  return null;
}

const searchIndex = [
  ...civilRecords.map((record) => ({
    id: record.id,
    subject: "civil-law",
    subjectLabel: record.subject,
    corpus: "司法特考四等",
    rocYear: record.rocYear,
    format: record.format,
    number: record.officialQuestionNumber,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜第 ${record.officialQuestionNumber} 題`,
    prompt: record.prompt,
    options: record.options,
    laws: lawsFromSeed(civilAnalyses[record.id], "民法"),
    keywords: keywordsFromSeed(civilAnalyses[record.id]),
  })),
  ...criminalRecords.map((record) => ({
    id: record.id,
    subject: "criminal-law",
    subjectLabel: record.subject,
    corpus: "司法特考四等",
    rocYear: record.rocYear,
    format: record.format,
    number: record.officialQuestionNumber,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜第 ${record.officialQuestionNumber} 題`,
    prompt: record.prompt,
    options: record.options,
    laws: lawsFromSeed(criminalAnalyses[record.id], "刑法"),
    keywords: keywordsFromSeed(criminalAnalyses[record.id]),
  })),
  ...combinedRecords.map((record) => ({
    id: record.id,
    subject: record.subject,
    subjectLabel:
      record.subject === "constitution" ? "憲法" : record.subject === "legal-introduction" ? "法學緒論" : "英文",
    corpus: "司法特考四等",
    rocYear: record.rocYear,
    format: record.format,
    number: record.officialQuestionNumber,
    source: `${record.rocYear} 年司法特考四等｜法學知識與英文｜官方第 ${record.officialQuestionNumber} 題`,
    prompt: record.prompt,
    options: record.options,
    laws: lawsFromReferences(combinedSeedOf(record)),
    keywords: keywordsFromSeed(combinedSeedOf(record)),
  })),
  ...remainingRecords.map((record) => ({
    id: record.id,
    subject: record.studySubject,
    subjectLabel: record.subject,
    corpus: "司法特考四等",
    rocYear: record.rocYear,
    format: record.format,
    number: record.officialQuestionNumber,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜${record.questionKind}第 ${record.officialQuestionNumber} 題`,
    prompt: record.prompt,
    options: record.options,
    laws: [],
    keywords: "",
  })),
];

const officialRecords = [...civilRecords, ...criminalRecords, ...combinedRecords, ...remainingRecords];
const questionYears = [...new Set(officialRecords.map((record) => record.rocYear))].sort((a, b) => b - a);
const officialCountsBySubject = {
  "civil-law": civilRecords.length,
  "criminal-law": criminalRecords.length,
  constitution: combinedRecords.filter((record) => record.subject === "constitution").length,
  "legal-introduction": combinedRecords.filter((record) => record.subject === "legal-introduction").length,
  english: combinedRecords.filter((record) => record.subject === "english").length,
  chinese: remainingRecords.filter((record) => record.studySubject === "chinese").length,
  "administrative-law": remainingRecords.filter((record) => record.studySubject === "administrative-law").length,
  "civil-procedure": remainingRecords.filter((record) => record.studySubject === "civil-procedure").length,
  "criminal-procedure": remainingRecords.filter((record) => record.studySubject === "criminal-procedure").length,
};

// 各科官方選擇題數：每日一題以日期種子在此範圍內決定，全站訪客同日同題。
const isMcq = (record) => record.format === "選擇題";
const officialMcqCountsBySubject = {
  "civil-law": civilRecords.filter(isMcq).length,
  "criminal-law": criminalRecords.filter(isMcq).length,
  constitution: combinedRecords.filter((record) => record.subject === "constitution" && isMcq(record)).length,
  "legal-introduction": combinedRecords.filter((record) => record.subject === "legal-introduction" && isMcq(record)).length,
  english: combinedRecords.filter((record) => record.subject === "english" && isMcq(record)).length,
  chinese: remainingRecords.filter((record) => record.studySubject === "chinese" && isMcq(record)).length,
  "administrative-law": remainingRecords.filter((record) => record.studySubject === "administrative-law" && isMcq(record)).length,
  "civil-procedure": remainingRecords.filter((record) => record.studySubject === "civil-procedure" && isMcq(record)).length,
  "criminal-procedure": remainingRecords.filter((record) => record.studySubject === "criminal-procedure" && isMcq(record)).length,
};

// 民法章節標籤檔：鍵值排序保持 diff 穩定。
const civilTags = {};
for (const record of civilRecords) {
  if (record.format !== "選擇題") continue;
  const chapter = civilChapterOf(civilAnalyses[record.id]);
  if (chapter) civilTags[record.id] = chapter;
}
const civilMcqCount = civilRecords.filter((record) => record.format === "選擇題").length;
await mkdir(new URL("../app/data/taxonomy", import.meta.url), { recursive: true });
await writeFile(
  new URL("../app/data/taxonomy/civil-law-tags.json", import.meta.url),
  JSON.stringify(
    Object.fromEntries(Object.entries(civilTags).sort(([a], [b]) => a.localeCompare(b))),
    null,
    2,
  ) + "\n",
);
console.log(`civil chapter tags: ${Object.keys(civilTags).length}/${civilMcqCount} mcq tagged`);

// ---- 申論考點章節層級統計 ----
// 只做「章節層級」（爭點 ID 第二段）統計，葉節點繁中名稱與真人複核尚未完成前不發布葉節點排行。
// 統計把已收錄歷屆題目的主要＋次要爭點合併計章，同題同章只計一次、同年多題只計一個出現年度。
// 分母（收錄年度數、收錄申論題數）由實際題目資料推導，前台可再依選取年度範圍重算。
const essayTaxonomy = require("../app/data/essay-issues/taxonomy.json");
const essayAnnotationSources = {
  civil: require("../app/data/essay-issues/civil-law.json"),
  criminal: require("../app/data/essay-issues/criminal-law.json"),
  administrative: require("../app/data/essay-issues/administrative-law.json"),
  "civil-procedure": require("../app/data/essay-issues/civil-procedure.json"),
  "criminal-procedure": require("../app/data/essay-issues/criminal-procedure.json"),
};
const essayAnnotationByQuestionId = {};
for (const source of Object.values(essayAnnotationSources)) {
  for (const [questionId, annotation] of Object.entries(source)) {
    essayAnnotationByQuestionId[questionId] = annotation;
  }
}

// 申論題的科目歸屬（對應統一爭點樹的根鍵）、可跳題的科目篩選鍵、年度與官方題號。
const essayQuestionMeta = [];
function pushEssayMeta(record, taxonomyKey, subjectFilter) {
  if (record.format !== "申論題") return;
  essayQuestionMeta.push({
    questionId: record.id,
    taxonomyKey,
    subject: subjectFilter,
    subjectLabel: record.subject,
    rocYear: record.rocYear,
    number: record.officialQuestionNumber,
    sourceUrl: record.sourceUrl,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜申論第 ${record.officialQuestionNumber} 題`,
  });
}
for (const record of civilRecords) pushEssayMeta(record, "civil", "civil-law");
for (const record of criminalRecords) pushEssayMeta(record, "criminal", "criminal-law");
for (const record of remainingRecords) {
  if (record.format !== "申論題") continue;
  if (record.studySubject === "administrative-law") pushEssayMeta(record, "administrative", "administrative-law");
  else if (record.studySubject === "civil-procedure") pushEssayMeta(record, "civil-procedure", "civil-procedure");
  else if (record.studySubject === "criminal-procedure") pushEssayMeta(record, "criminal-procedure", "criminal-procedure");
  // 國文申論不納入法律爭點統計。
}

const essaySubjectOrder = ["civil", "criminal", "administrative", "civil-procedure", "criminal-procedure"];
const essaySubjects = essaySubjectOrder.map((taxonomyKey) => {
  const subjectMeta = essayTaxonomy.subjects[taxonomyKey];
  const questions = essayQuestionMeta.filter((question) => question.taxonomyKey === taxonomyKey);
  const years = [...new Set(questions.map((question) => question.rocYear))].sort((a, b) => a - b);
  const essayCountsByYear = {};
  for (const year of years) {
    essayCountsByYear[year] = questions.filter((question) => question.rocYear === year).length;
  }

  // chapter -> year -> 題目清單（同題同章只計一次，故以爭點章節去重）。
  const chapterMap = new Map();
  for (const question of questions) {
    const annotation = essayAnnotationByQuestionId[question.questionId];
    if (!annotation) continue;
    const primaryChapters = new Set(annotation.primaryIssueIds.map((id) => id.split(".")[1]));
    const secondaryChapters = new Set(annotation.secondaryIssueIds.map((id) => id.split(".")[1]));
    for (const chapter of new Set([...primaryChapters, ...secondaryChapters])) {
      const match = primaryChapters.has(chapter) ? "primary" : "secondary";
      if (!chapterMap.has(chapter)) chapterMap.set(chapter, new Map());
      const yearMap = chapterMap.get(chapter);
      if (!yearMap.has(question.rocYear)) yearMap.set(question.rocYear, []);
      yearMap.get(question.rocYear).push({
        id: question.questionId,
        number: question.number,
        source: question.source,
        sourceUrl: question.sourceUrl,
        gist: annotation.gist,
        match,
      });
    }
  }
  const chapters = [...chapterMap.entries()]
    .map(([chapter, yearMap]) => ({
      chapter,
      label: essayTaxonomy.chapters[taxonomyKey]?.[chapter] ?? chapter,
      questionsByYear: [...yearMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, list]) => ({
          year,
          questions: list.sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
        })),
    }))
    .sort((a, b) => a.chapter.localeCompare(b.chapter));

  return {
    key: taxonomyKey,
    subject: questions[0]?.subject ?? subjectMeta.subject,
    label: subjectMeta.label,
    examLabel: "司法特考四等 法院書記官",
    years,
    essayCountsByYear,
    chapters,
  };
});

const essayIssueStats = {
  version: essayTaxonomy.version,
  reviewStatus: "draft",
  note: "歷屆統計不代表未來命題預測；資料為草稿統計，尚未經真人法律複核。",
  subjects: essaySubjects,
};
const essayStatsJson = JSON.stringify(essayIssueStats);

const searchIndexJson = JSON.stringify(searchIndex);
// 資料版本同時涵蓋搜尋索引與申論考點統計，任一資料改變都會觸發 Service Worker 更新舊快取。
const dataVersion = createHash("sha256")
  .update(searchIndexJson)
  .update(essayStatsJson)
  .digest("hex")
  .slice(0, 12);

const manifestTs = `// 此檔由 scripts/generate-question-data.mjs 自動產生，請勿手動修改。
// 提供首頁 shell 在題庫載入前就需要的統計與年度資訊（不含題目內容）。
export const questionYears = ${JSON.stringify(questionYears)};
export const totalQuestionCount = ${officialRecords.length};
export const officialQuestionCount = ${officialRecords.length};
export const officialMultipleChoiceCount = ${officialRecords.filter((record) => record.format === "選擇題").length};
export const officialEssayCount = ${officialRecords.filter((record) => record.format === "申論題").length};
export const officialCountsBySubject = ${JSON.stringify(officialCountsBySubject, null, 2)} as const;
export const officialMcqCountsBySubject = ${JSON.stringify(officialMcqCountsBySubject, null, 2)} as const;
export const dataVersion = ${JSON.stringify(dataVersion)};
`;

await writeFile(new URL("../app/data/bank-manifest.ts", import.meta.url), manifestTs);
await mkdir(new URL("../public/data", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/search-index.json", import.meta.url), searchIndexJson);
await writeFile(new URL("../public/data/essay-issue-stats.json", import.meta.url), essayStatsJson);
await writeFile(
  new URL("../public/data/manifest.json", import.meta.url),
  JSON.stringify(
    {
      version: dataVersion,
      files: {
        "search-index.json": {
          bytes: Buffer.byteLength(searchIndexJson),
          entries: searchIndex.length,
        },
        "essay-issue-stats.json": {
          bytes: Buffer.byteLength(essayStatsJson),
          subjects: essaySubjects.length,
        },
      },
    },
    null,
    2,
  ),
);

// Service Worker：cache 名稱帶資料版本 hash，資料更新（sw.js 內容改變）時
// 觸發新 SW 安裝並清除舊快取，避免長期停留舊題庫。
const serviceWorker = `// 此檔由 scripts/generate-question-data.mjs 自動產生，請勿手動修改。
const CACHE_NAME = "clerk-law-room-${dataVersion}";
const BASE = self.registration.scope.replace(/\\/$/, "");

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(BASE + "/");
    if (!response.ok) return;
    await cache.put(BASE + "/", response.clone());
    const html = await response.text();
    const urls = [...html.matchAll(/(?:src|href)="([^"]+\\.(?:js|css))"/g)].map((match) => match[1]);
    await Promise.all(
      urls.map(async (url) => {
        try {
          const asset = await fetch(url);
          if (asset.ok) await cache.put(url, asset.clone());
        } catch {}
      }),
    );
  } catch {}
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
      await precacheShell();
    })(),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) ?? (await cache.match(BASE + "/"));
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // 外部連結（官方 PDF、法規資料庫等）不攔截也不快取。
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.includes("/_next/static/") || url.pathname.includes("/data/") || /\\.(?:png|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
`;
await writeFile(new URL("../public/sw.js", import.meta.url), serviceWorker);

console.log(
  `generated bank-manifest.ts + public/data + sw.js (version ${dataVersion}, ${searchIndex.length} search entries, ${essaySubjects.length} essay subjects) at ${root}`,
);
