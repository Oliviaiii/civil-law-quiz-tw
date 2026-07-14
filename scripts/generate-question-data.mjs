// 由原始題庫 JSON 產生：
//   1. app/data/bank-manifest.ts —— 首頁 shell 需要的年度清單與題數統計（不含題目內容）
//   2. public/data/search-index.json —— 全文搜尋用的輕量索引（題幹、選項、科目、來源、年度、題號、法規）
//   3. public/data/manifest.json —— 資料版本 hash，供 Service Worker 判斷快取失效
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
const demoRecords = require("../app/data/demo-questions.json");
const englishTranslations = require("../app/data/english-translations.json");

const analysisYears = [108, 109, 110, 111, 112, 113, 114];
const civilAnalyses = Object.assign(
  {},
  ...analysisYears.map((year) => require(`../app/data/analyses/judicial-fourth-${year}.json`)),
);
const criminalAnalyses = Object.assign(
  {},
  ...analysisYears.map((year) => require(`../app/data/analyses/criminal-law-${year}.json`)),
);

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
    laws: [],
    keywords: "",
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
  ...demoRecords.map((record) => ({
    id: record.id,
    subject: "civil-law",
    subjectLabel: "民法",
    corpus: "示範題",
    format: "選擇題",
    source: record.source,
    prompt: record.prompt,
    options: record.options,
    laws: record.statutes.map((statute) => `民法第${statute.article}條`),
    keywords: keywordsFromSeed({ issue: record.analysis.issue, trap: record.analysis.trap }),
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

// 英文單字本：由人工複核的英文翻譯資料整理單字、詞性與中譯（可回溯出處題目）。
const combinedById = new Map(combinedRecords.map((record) => [record.id, record]));
const vocabByKey = new Map();
for (const [questionId, entry] of Object.entries(englishTranslations.questions)) {
  const record = combinedById.get(questionId);
  if (!record) continue;
  entry.options.forEach((option, index) => {
    const word = String(record.options[index] ?? "").trim();
    if (!word || word.length > 30 || word.split(/\s+/).length > 3) return;
    if (!option.partOfSpeech || !option.translation) return;
    const key = `${word.toLowerCase()}|${option.partOfSpeech}`;
    const existing = vocabByKey.get(key);
    if (existing) {
      if (!existing.questionIds.includes(questionId)) existing.questionIds.push(questionId);
      return;
    }
    vocabByKey.set(key, {
      word,
      partOfSpeech: option.partOfSpeech,
      translation: option.translation,
      questionIds: [questionId],
    });
  });
}
const vocabulary = [...vocabByKey.values()].sort((left, right) =>
  left.word.toLowerCase().localeCompare(right.word.toLowerCase()),
);
await mkdir(new URL("../public/data", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/data/vocabulary.json", import.meta.url),
  JSON.stringify(vocabulary),
);
console.log(`vocabulary: ${vocabulary.length} entries`);

const searchIndexJson = JSON.stringify(searchIndex);
const dataVersion = createHash("sha256").update(searchIndexJson).digest("hex").slice(0, 12);

const manifestTs = `// 此檔由 scripts/generate-question-data.mjs 自動產生，請勿手動修改。
// 提供首頁 shell 在題庫載入前就需要的統計與年度資訊（不含題目內容）。
export const questionYears = ${JSON.stringify(questionYears)};
export const totalQuestionCount = ${officialRecords.length + demoRecords.length};
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
  `generated bank-manifest.ts + public/data + sw.js (version ${dataVersion}, ${searchIndex.length} search entries) at ${root}`,
);
