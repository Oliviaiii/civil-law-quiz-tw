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
  await expect.poll(async () => {
    const top = await page.locator("article.question-card > h2").evaluate((heading) =>
      Math.round(heading.getBoundingClientRect().top),
    );
    return top >= 80 && top <= 92;
  }).toBe(true);

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

  const menuToggle = page.getByRole("button", { name: "開啟主要功能選單" });
  await expect(menuToggle).toBeVisible();
  await menuToggle.click();
  await page.locator(".nav-item", { hasText: "學習紀錄" }).click();
  await expect(page.locator(".stats-view")).toBeVisible();
  await expect(page.locator(".sidebar")).not.toHaveClass(/menu-open/);

  await menuToggle.click();
  await page.locator(".nav-item", { hasText: "開始練習" }).click();
  await expect(page.locator("article.question-card")).toBeVisible();
});

test("手機版介紹獨立顯示，練習頁不再占用題目空間", async ({ page }) => {
  await openApp(page);

  await expect(page.locator(".introduction-view")).toHaveCount(0);
  await expect(page.locator(".page-heading")).toHaveCount(0);
  await page.locator(".brand").click();

  await expect(page.locator(".introduction-view")).toBeVisible();
  await expect(page.locator(".introduction-view h1")).toContainText("近十年法院書記官法科考古題");
  await expect(page.locator("article.question-card")).toHaveCount(0);
});

test("手機版篩選區預設收合並可展開", async ({ page }) => {
  await openApp(page);

  const toggle = page.locator(".mobile-filter-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".filters")).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".filters")).toBeVisible();

  await toggle.click();
  await expect(page.locator(".filters")).toBeHidden();
});
