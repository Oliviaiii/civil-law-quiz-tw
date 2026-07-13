import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the civil law practice experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<title>民法研習室｜台灣民法選擇題練習<\/title>/);
  assert.match(html, /近十年司法四等民法考古題/);
  assert.match(html, /民國 105–114 年官方試題/);
  assert.match(html, /錯題本/);
  assert.match(html, /學習紀錄/);
  assert.match(html, /<strong>201<\/strong>/);
  assert.match(html, /175[\s\S]*選擇＋[\s\S]*26[\s\S]*申論/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps questions and local progress behind replaceable data modules", async () => {
  const [page, questions, officialData, progress, layout, packageJson, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/questions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/judicial-fourth-questions.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/progress-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /loadProgress\(\)/);
  assert.match(page, /saveProgress\(progress\)/);
  assert.match(page, /exportProgress/);
  assert.match(page, /importProgress/);
  assert.match(page, /question\.analysis\.application/);
  assert.match(page, /question-quick-nav/);
  assert.match(page, /官方答案 PDF/);
  assert.match(questions, /export const questions: Question\[\]/);
  assert.equal((questions.match(/id: "demo-/g) ?? []).length, 10);
  assert.match(questions, /officialQuestionCount/);

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
  assert.match(progress, /localStorage/);
  assert.match(progress, /civil-law-quiz-tw:progress:v1/);
  assert.match(layout, /lang="zh-Hant"/);
  assert.match(css, /position: fixed;[\s\S]*bottom: 0;[\s\S]*env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
