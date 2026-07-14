import { expect, type Page } from "@playwright/test";

const appBasePath = process.env.GITHUB_ACTIONS === "true" ? "/civil-law-quiz-tw" : "";

export function appUrl(hash = "") {
  return `${appBasePath}/${hash}`;
}

/** 開啟首頁並等待 hydration 與預設題庫（民法）載入完成。 */
export async function openApp(page: Page) {
  await page.goto(appUrl());
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator("article.question-card")).toBeVisible();
}

/**
 * 依序切換複選篩選器中的選項（勾選↔取消勾選），最後按「完成」收合。
 * filterLabel 對應 summary 的 aria-label，例如「依科目複選篩選」。
 */
export async function toggleFilterOptions(page: Page, filterLabel: string, options: string[]) {
  const mobileToggle = page.locator(".mobile-filter-toggle");
  if (await mobileToggle.isVisible() && await mobileToggle.getAttribute("aria-expanded") === "false") {
    await mobileToggle.click();
  }
  const filter = page.locator("details.multi-select", {
    has: page.locator(`summary[aria-label="${filterLabel}"]`),
  });
  await filter.locator("summary").click();
  for (const option of options) {
    await filter
      .locator("label", { has: page.getByText(option, { exact: true }) })
      .click();
  }
  await filter.getByRole("button", { name: "完成" }).click();
}

/** 讀取「符合 N 題」的數字。 */
export async function readMatchCount(page: Page): Promise<number> {
  const text = await page.locator(".filter-count").innerText();
  const match = text.match(/符合 (\d+) 題/);
  if (!match) throw new Error(`無法解析題數：${text}`);
  return Number(match[1]);
}

/** 讀取「第 X / Y 題」中的目前位置與總數。 */
export async function readPosition(page: Page): Promise<{ position: number; total: number }> {
  const text = await page.locator(".question-number").innerText();
  const match = text.match(/第 (\d+) \/ (\d+) 題/);
  if (!match) throw new Error(`無法解析題號：${text}`);
  return { position: Number(match[1]), total: Number(match[2]) };
}

/**
 * 點擊上一題／下一題。quick-nav 只在手機版顯示、footer 在桌面版顯示，
 * 因此點擊當下可見的那一顆。
 */
export async function clickNav(page: Page, label: "上一題" | "下一題") {
  const buttons = page.locator("article.question-card button", { hasText: label });
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isVisible()) {
      await button.click();
      return;
    }
  }
  throw new Error(`找不到可點擊的「${label}」按鈕`);
}

/** 按「下一題」直到題幹包含指定文字（用於跳到特定官方題）。 */
export async function gotoQuestionByPrompt(page: Page, promptSnippet: string, maxSteps = 40) {
  const heading = page.locator("article.question-card h2");
  for (let step = 0; step < maxSteps; step += 1) {
    if ((await heading.innerText()).includes(promptSnippet)) return;
    await clickNav(page, "下一題");
  }
  throw new Error(`在 ${maxSteps} 步內找不到題目：${promptSnippet}`);
}

/** 切到「示範題」來源（取消司法特考四等、勾選示範題）。 */
export async function useDemoCorpus(page: Page) {
  await toggleFilterOptions(page, "依題庫來源複選篩選", ["司法特考四等", "示範題"]);
}

/** 建立一份可供 setInputFiles 使用的 JSON 匯入檔。 */
export function progressFile(name: string, payload: unknown) {
  return {
    name,
    mimeType: "application/json",
    buffer: Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload)),
  };
}
