import { expect, test } from "@playwright/test";
import { openApp, readPosition, toggleFilterOptions } from "./helpers";

test("手機版主要操作流程：作答、換題、篩選與清除", async ({ page }) => {
  await openApp(page);

  // 作答後立即顯示解析
  await page.locator(".options .option").first().click();
  await expect(page.locator(".analysis")).toBeVisible();

  // 換題
  await page.locator(".question-quick-nav button", { hasText: "下一題" }).click();
  expect((await readPosition(page)).position).toBe(2);

  // 年度篩選可開啟操作
  await toggleFilterOptions(page, "依年度複選篩選", ["112 年"]);
  expect((await readPosition(page)).position).toBe(1);

  // 一鍵清除可點擊
  const clearButton = page.getByRole("button", { name: "清除所有篩選" });
  await clearButton.click();
  await expect(clearButton).toBeDisabled();
});

test("手機版搜尋與結果清單可完整操作", async ({ page }) => {
  await openApp(page);

  await page.getByRole("searchbox").fill("善意取得");
  const firstResult = page.locator(".search-results li button").first();
  await expect(firstResult).toBeVisible();
  await firstResult.click();

  await expect(page.locator(".search-results")).toHaveCount(0);
  await expect(page.locator("article.question-card")).toBeVisible();
});

test("手機版畫面切換：錯題本與學習紀錄", async ({ page }) => {
  await openApp(page);

  await page.locator(".nav-item", { hasText: "學習紀錄" }).click();
  await expect(page.locator(".stats-view")).toBeVisible();

  await page.locator(".nav-item", { hasText: "開始練習" }).click();
  await expect(page.locator("article.question-card")).toBeVisible();
});
