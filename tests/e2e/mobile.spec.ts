import { expect, test } from "@playwright/test";
import { appUrl, openApp, readPosition, toggleFilterOptions } from "./helpers";

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
    return top >= 140 && top <= 152;
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

  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(async () => {
    const top = await toggle.evaluate((button) => Math.round(button.getBoundingClientRect().top));
    return top >= 74 && top <= 78;
  }).toBe(true);
});

test("手機版底部整合收藏、不確定與題目切換", async ({ page }) => {
  await openApp(page);

  const navigation = page.locator(".question-quick-nav.has-tools");
  const buttons = navigation.locator("button");
  await expect(buttons).toHaveCount(4);

  const widths = await buttons.evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().width),
  );
  expect(widths[0] / widths[2]).toBeCloseTo(15 / 35, 1);
  expect(widths[1] / widths[3]).toBeCloseTo(15 / 35, 1);

  const starred = navigation.getByRole("button", { name: "收藏" });
  const uncertain = navigation.getByRole("button", { name: "不確定" });
  await starred.click();
  await uncertain.click();
  await expect(starred).toHaveAttribute("aria-pressed", "true");
  await expect(uncertain).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".question-tools")).toBeHidden();
});

test("手機深色模式：申論主要按鈕與考點入口維持足夠對比", async ({ page }) => {
  await page.goto(appUrl("#q=judicial-fourth-105-essay-02"));
  await page.waitForSelector('html[data-app-ready="true"]');
  await page.getByRole("button", { name: "切換深淺色主題" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const firstIssue = page.locator(".essay-issue-actions button").first();
  await firstIssue.click();
  await expect(firstIssue).toHaveClass(/active/);

  const ratios = await page.locator(
    ".essay-callout button, .essay-save, .essay-issue-actions button.active, .question-quick-nav .next-button",
  ).evaluateAll((buttons) => {
    function channel(value: number) {
      const normalized = value / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    }
    function luminance(color: string) {
      const values = color.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
      return 0.2126 * channel(values[0]) + 0.7152 * channel(values[1]) + 0.0722 * channel(values[2]);
    }
    return buttons.map((button) => {
      const style = getComputedStyle(button);
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
  });

  expect(ratios).toHaveLength(4);
  for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test("手機申論考點：前往相關題目後定位到新題目上方", async ({ page }) => {
  await page.goto(appUrl("#q=judicial-fourth-114-essay-02"));
  await page.waitForSelector('html[data-app-ready="true"]');

  const panel = page.locator(".essay-issues");
  await panel.getByRole("button", { name: /次要爭點 2.*平台責任/ }).click();
  await panel.getByRole("button", { name: /同類考點・前往題目.*105 年司法特考四等/ }).click();

  await expect(page.locator(".source-line")).toContainText("105 年司法特考四等");
  await expect.poll(async () => {
    const top = await page.locator("article.question-card > h2").evaluate((heading) =>
      Math.round(heading.getBoundingClientRect().top),
    );
    return top >= 140 && top <= 152;
  }).toBe(true);
});

test("手機版展開篩選：下拉複選選單不被裁切、選項可點", async ({ page }) => {
  await openApp(page);

  // 展開篩選面板
  const toggle = page.locator(".mobile-filter-toggle");
  await toggle.click();
  await expect(page.locator(".filters")).toBeVisible();

  // 打開年度下拉，選單應內嵌展開而非被 overflow 裁掉
  const yearFilter = page.locator("details.multi-select", {
    has: page.locator('summary[aria-label="依年度複選篩選"]'),
  });
  await yearFilter.locator("summary").click();

  const menu = yearFilter.locator(".multi-select-menu");
  await expect(menu).toBeVisible();

  // 選單底部應落在可捲動篩選面板內容範圍中（未被容器裁掉而不可達）
  const option = yearFilter.locator("label", { has: page.getByText("114 年", { exact: true }) });
  await expect(option).toBeVisible();
  await option.scrollIntoViewIfNeeded();
  await option.click();
  await expect(option.locator("input[type=checkbox]")).toBeChecked();
});

test("手機版展開篩選：點擊題目卡自動收合面板", async ({ page }) => {
  await openApp(page);

  const toggle = page.locator(".mobile-filter-toggle");
  await toggle.click();
  await expect(page.locator(".filters")).toBeVisible();

  // 點面板內部（打開科目下拉）不應收合
  const subjectFilter = page.locator("details.multi-select", {
    has: page.locator('summary[aria-label="依科目複選篩選"]'),
  });
  await subjectFilter.locator("summary").click();
  await expect(page.locator(".filters")).toBeVisible();

  // 點面板外（底部題目工具列）→ 面板自動收合
  await page.locator(".question-quick-nav").getByRole("button", { name: "收藏" }).click();
  await expect(page.locator(".filters")).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});
