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
  assert.match(html, /先判斷爭點，再選答案/);
  assert.match(html, /點選選項後即顯示解析/);
  assert.match(html, /錯題本/);
  assert.match(html, /學習紀錄/);
  assert.match(html, /<strong>10<\/strong><small>題示範題<\/small>/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps questions and local progress behind replaceable data modules", async () => {
  const [page, questions, progress, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/questions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/progress-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /loadProgress\(\)/);
  assert.match(page, /saveProgress\(progress\)/);
  assert.match(page, /exportProgress/);
  assert.match(page, /importProgress/);
  assert.match(page, /question\.analysis\.application/);
  assert.match(questions, /export const questions: Question\[\]/);
  assert.equal((questions.match(/id: "demo-/g) ?? []).length, 10);
  assert.match(questions, /自行編寫示範題/);
  assert.match(progress, /localStorage/);
  assert.match(progress, /civil-law-quiz-tw:progress:v1/);
  assert.match(layout, /lang="zh-Hant"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
