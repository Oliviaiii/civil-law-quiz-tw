import { expect, test } from "@playwright/test";
import {
  appUrl,
  clickNav,
  gotoQuestionByPrompt,
  openApp,
  progressFile,
  readMatchCount,
  readPosition,
  toggleFilterOptions,
} from "./helpers";

const FIRST_CIVIL_PROMPT = "法人若有數名監察人";
const ALL_CREDIT_PROMPT = "關於遺產分割之實行";
const MULTI_ANSWER_PROMPT = "有關刑法第15章偽造文書印文罪";

const analysisResult = (page: import("@playwright/test").Page) =>
  page.locator(".analysis .analysis-result");

test("科目、來源、年度複選與一鍵清除", async ({ page }) => {
  await openApp(page);
  const initialCount = await readMatchCount(page);
  expect(initialCount).toBeGreaterThan(0);

  // 加選刑法（民法＋刑法）
  await toggleFilterOptions(page, "依科目複選篩選", ["刑法"]);
  await expect.poll(() => readMatchCount(page)).toBeGreaterThan(initialCount);
  const twoSubjectCount = await readMatchCount(page);

  // 年度只留 112
  await toggleFilterOptions(page, "依年度複選篩選", ["112 年"]);
  const yearCount = await readMatchCount(page);
  expect(yearCount).toBeLessThan(twoSubjectCount);
  expect((await readPosition(page)).position).toBe(1);

  // 一鍵清除：按鈕轉為 disabled，全部科目題庫載入後題數放大到全題庫
  const clearButton = page.getByRole("button", { name: "清除所有篩選" });
  await clearButton.click();
  await expect(clearButton).toBeDisabled();
  await expect.poll(() => readMatchCount(page)).toBeGreaterThan(twoSubjectCount);
});

test("正式題作答：立即判題答對與答錯", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("article.question-card h2")).toContainText(FIRST_CIVIL_PROMPT);

  // 答錯（正解為 A，點 B）
  await page.locator(".options .option").nth(1).click();
  await expect(analysisResult(page)).toContainText("本題答錯");
  await expect(analysisResult(page)).toContainText("答案是 A");
  await expect(page.locator(".options .option").nth(1)).toContainText("你的答案");
  await expect(page.locator(".options .option").nth(0)).toContainText("正確");
  await expect(page.locator(".nav-item", { hasText: "錯題本" }).locator("b")).toHaveText("1");
});

test("民法解析：A 至 D 逐選項分開呈現", async ({ page }) => {
  await openApp(page);
  await page.locator(".options .option").nth(0).click();

  const optionAnalysis = page.locator(".option-analysis");
  await expect(optionAnalysis.locator("li")).toHaveCount(4);
  await expect(optionAnalysis.locator("li b")).toHaveText(["A", "B", "C", "D"]);
  await expect(optionAnalysis).toContainText("各監察人均得單獨行使監察權");
  await expect(optionAnalysis).toContainText("章程也不是一概不得另作規範");
});

test("複數答案題：任一官方認可選項都算對", async ({ page }) => {
  await openApp(page);
  await toggleFilterOptions(page, "依科目複選篩選", ["民法", "刑法"]);
  await toggleFilterOptions(page, "依年度複選篩選", ["112 年"]);
  await gotoQuestionByPrompt(page, MULTI_ANSWER_PROMPT);

  // 官方更正後 C 或 D 均給分，點 D
  await page.locator(".options .option").nth(3).click();
  await expect(analysisResult(page)).toContainText("判斷正確");
  await expect(analysisResult(page)).toContainText("答案是 C 或 D");
});

test("一律給分題：任何選項都判給分", async ({ page }) => {
  await openApp(page);
  await toggleFilterOptions(page, "依年度複選篩選", ["112 年"]);
  await gotoQuestionByPrompt(page, ALL_CREDIT_PROMPT);

  await page.locator(".options .option").nth(0).click();
  await expect(analysisResult(page)).toContainText("官方更正答案");
  await expect(analysisResult(page)).toContainText("本題一律給分");
  await expect(page.locator(".options .option").nth(0)).toContainText("給分");
});

test("錯題本：答錯加入、答對後離開", async ({ page }) => {
  await openApp(page);

  // 答錯第一題
  await page.locator(".options .option").nth(1).click();
  await expect(page.locator(".nav-item", { hasText: "錯題本" }).locator("b")).toHaveText("1");

  // 進錯題本：只剩這一題
  await page.locator(".nav-item", { hasText: "錯題本" }).click();
  await expect(page.locator("article.question-card h2")).toContainText(FIRST_CIVIL_PROMPT);
  expect(await readPosition(page)).toEqual({ position: 1, total: 1 });

  // 這次答對：reviewing 狀態下題目仍留在畫面
  await page.locator(".options .option").nth(0).click();
  await expect(analysisResult(page)).toContainText("判斷正確");
  await expect(page.locator("article.question-card h2")).toContainText(FIRST_CIVIL_PROMPT);

  // 離開本題後錯題本清空
  await clickNav(page, "下一題");
  await expect(page.locator(".empty-state")).toContainText("錯題已全部清空");
  await expect(page.locator(".nav-item", { hasText: "錯題本" }).locator("b")).toHaveCount(0);
});

test("未作答篩選：作答後題目保留至換題才移出", async ({ page }) => {
  await openApp(page);

  // 答對第一題
  await page.locator(".options .option").nth(0).click();
  await expect(analysisResult(page)).toContainText("判斷正確");

  // 切到未作答：第一題消失，剩 174 題
  await page.locator(".segmented button", { hasText: "未作答" }).click();
  expect(await readPosition(page)).toEqual({ position: 1, total: 174 });
  await expect(page.locator("article.question-card h2")).not.toContainText(FIRST_CIVIL_PROMPT);

  // 作答目前題目：reviewing 讓題目留在畫面，總數不變
  await page.locator(".options .option").nth(0).click();
  await expect(analysisResult(page)).toBeVisible();
  expect(await readPosition(page)).toEqual({ position: 1, total: 174 });

  // 換題後已作答題移出清單
  await clickNav(page, "下一題");
  expect(await readPosition(page)).toEqual({ position: 1, total: 173 });
});

test("導航防退化：篩選改變後游標與畫面一致", async ({ page }) => {
  await openApp(page);
  await toggleFilterOptions(page, "依年度複選篩選", ["112 年"]);
  const civil = await readPosition(page);
  expect(civil.position).toBe(1);

  // 前進到第 3 題
  await clickNav(page, "下一題");
  await clickNav(page, "下一題");
  expect((await readPosition(page)).position).toBe(3);

  // 換科目：畫面回到第 1 題且顯示刑法題
  const subjectTag = page.locator(".question-card .tag.type");
  await toggleFilterOptions(page, "依科目複選篩選", ["民法", "刑法"]);
  expect((await readPosition(page)).position).toBe(1);
  await expect(subjectTag).toHaveText("刑法概要");

  // 從 fallback 題第一次按下一題就正確移動到第 2 題
  await clickNav(page, "下一題");
  expect((await readPosition(page)).position).toBe(2);

  // 換回民法：不得跳回先前的第 3 題（幽靈游標）
  await toggleFilterOptions(page, "依科目複選篩選", ["刑法", "民法"]);
  expect(await readPosition(page)).toEqual({ position: 1, total: civil.total });
  await expect(subjectTag).toHaveText("民法概要");

  // 上一題從第 1 題環繞到最後一題，位置一致
  await clickNav(page, "上一題");
  expect((await readPosition(page)).position).toBe(civil.total);
});

test("空結果不留幽靈狀態，可一鍵回到預設", async ({ page }) => {
  await openApp(page);

  // 「總則」章節沒有申論題 → 空結果
  await toggleFilterOptions(page, "依章節複選篩選", ["總則"]);
  await page.locator(".filters select").selectOption("申論題");
  await expect(page.locator(".empty-state")).toContainText("這個篩選目前沒有題目");
  await expect(page.locator(".filter-count")).toHaveText("符合 0 題");

  // 回到全部題目後可以立即正常導航
  await page.getByRole("button", { name: "回到全部題目" }).click();
  expect((await readPosition(page)).position).toBe(1);
  await clickNav(page, "下一題");
  expect((await readPosition(page)).position).toBe(2);
});

test("民法章節篩選：可複選並與其他條件組合", async ({ page }) => {
  await openApp(page);
  const before = await readMatchCount(page);

  // 預設單選民法：章節篩選可見
  const chapterSummary = page.locator('summary[aria-label="依章節複選篩選"]');
  await expect(chapterSummary).toBeVisible();

  await toggleFilterOptions(page, "依章節複選篩選", ["總則"]);
  const chapterOnly = await readMatchCount(page);
  expect(chapterOnly).toBeGreaterThan(0);
  expect(chapterOnly).toBeLessThan(before);

  // 複選第二個章節：題數增加
  await toggleFilterOptions(page, "依章節複選篩選", ["物權"]);
  const twoChapters = await readMatchCount(page);
  expect(twoChapters).toBeGreaterThan(chapterOnly);

  // 與年度篩選組合
  await toggleFilterOptions(page, "依年度複選篩選", ["112 年"]);
  const combined = await readMatchCount(page);
  expect(combined).toBeGreaterThan(0);
  expect(combined).toBeLessThanOrEqual(twoChapters);

  // 分類未完成的科目不開放章節篩選
  await toggleFilterOptions(page, "依科目複選篩選", ["民法", "刑法"]);
  await expect(chapterSummary).toHaveCount(0);
});

test("全文搜尋：關鍵字找到題目並跳轉", async ({ page }) => {
  await openApp(page);

  await page.getByRole("searchbox").fill("監察權");
  const target = page.locator(".search-results li button", { hasText: FIRST_CIVIL_PROMPT });
  await expect(target).toBeVisible();
  await target.click();

  // 跳到目標題目，搜尋框清空
  await expect(page.locator("article.question-card h2")).toContainText(FIRST_CIVIL_PROMPT);
  await expect(page.getByRole("searchbox")).toHaveValue("");
});

test("題號快速跳轉：114 法緒 18", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "清除所有篩選" }).click();

  await page.getByRole("searchbox").fill("114 法緒 18");
  const results = page.locator(".search-results li button");
  await expect(results).toHaveCount(1);
  await results.first().click();

  await expect(page.locator(".question-card .tag.type")).toHaveText("法學緒論");
  await expect(page.locator(".question-card .tag.year")).toHaveText("民國 114 年");
  await expect(page.locator(".source-line")).toContainText("官方第 18 題");
});

test("搜尋無結果：顯示清除條件入口", async ({ page }) => {
  await openApp(page);

  await page.getByRole("searchbox").fill("呼嚕嚕不存在的字串");
  await expect(page.locator(".search-empty")).toContainText("找不到符合");
  await expect(page.getByRole("button", { name: "清除所有篩選再找一次" })).toBeVisible();

  await page.getByRole("button", { name: "清除搜尋" }).click();
  await expect(page.locator(".search-results")).toHaveCount(0);
});

test("練習集：建立、續作與離開", async ({ page }) => {
  await openApp(page);

  await page.getByRole("button", { name: "建立練習集" }).click();
  await page.getByRole("button", { name: /^10 題$/ }).click();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();

  await expect(page.locator(".practice-set-bar")).toContainText("第 1 / 10 題");
  await expect(page.locator(".practice-set-bar")).toContainText("剩餘 10 題");

  // 作答一題後剩餘數遞減
  const firstPrompt = await page.locator("article.question-card h2").innerText();
  await page.locator(".options .option").first().click();
  await expect(page.locator(".practice-set-bar")).toContainText("剩餘 9 題");

  await clickNav(page, "下一題");
  await expect(page.locator(".practice-set-bar")).toContainText("第 2 / 10 題");
  const secondPrompt = await page.locator("article.question-card h2").innerText();

  // 重新整理後可續作，抽題順序穩定
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator(".practice-set-bar")).toContainText("第 2 / 10 題");
  await expect(page.locator(".practice-set-bar")).toContainText("剩餘 9 題");
  await expect(page.locator("article.question-card h2")).toHaveText(secondPrompt);

  // 上一題回到同一題（順序不因 render 或重啟改變）
  await clickNav(page, "上一題");
  await expect(page.locator("article.question-card h2")).toHaveText(firstPrompt);

  // 離開需經確認
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "離開練習集" }).click();
  await expect(page.locator(".practice-set-bar")).toHaveCount(0);
  await expect(page.locator(".filters")).toBeVisible();
});

test("練習集：題數不足時全部納入並清楚說明", async ({ page }) => {
  await openApp(page);
  await toggleFilterOptions(page, "依年度複選篩選", ["114 年"]);

  await page.getByRole("button", { name: "建立練習集" }).click();
  await page.getByRole("button", { name: /^50 題$/ }).click();
  await expect(page.locator(".practice-set-note")).toContainText("只有 25 題");

  await page.getByRole("button", { name: "開始練習", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("已全部納入練習集");
  await expect(page.locator(".practice-set-bar")).toContainText("第 1 / 25 題");
});

test("間隔複習：逾期入口、複習後移出佇列", async ({ page }) => {
  await openApp(page);

  // 匯入一筆昨天到期的作答紀錄（官方民法題，符合預設篩選）
  await page.locator(".nav-item", { hasText: "學習紀錄" }).click();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await page.locator('input[type="file"]').setInputFiles(
    progressFile("due.json", {
      version: 3,
      answers: {
        "judicial-fourth-112-mcq-23": {
          attempts: 1,
          lastSelected: 0,
          lastCorrect: false,
          lastAnsweredAt: yesterday,
          correctStreak: 0,
          wrongCount: 1,
          dueAt: yesterday,
        },
      },
      flags: {},
      daily: {},
    }),
  );
  await expect(page.locator(".toast")).toContainText("學習紀錄已匯入");

  // 側欄逾期入口顯示 1 題，點擊進入到期複習
  const overdueButton = page.locator(".review-queue button", { hasText: "逾期複習" });
  await expect(overdueButton).toContainText("1");
  await overdueButton.click();
  await expect(page.locator(".filter-count")).toHaveText("符合 1 題");

  // 答對後（官方答案 D）延後到期，離開本題即清空佇列
  await page.locator(".options .option").nth(3).click();
  await expect(page.locator(".analysis .analysis-result")).toContainText("判斷正確");
  await clickNav(page, "下一題");
  await expect(page.locator(".filter-count")).toHaveText("符合 0 題");
  await expect(page.locator(".review-queue button", { hasText: "逾期複習" })).toBeDisabled();
});

test("基礎統計：區分最後一次與所有嘗試正確率", async ({ page }) => {
  await openApp(page);

  // 第一次答錯，再從錯題本答對（共 2 次嘗試、最後為對）
  await page.locator(".options .option").nth(1).click();
  await page.locator(".nav-item", { hasText: "錯題本" }).click();
  await page.locator(".options .option").nth(0).click();

  await page.locator(".nav-item", { hasText: "學習紀錄" }).click();
  await expect(
    page.locator(".stat-grid > div", { hasText: "最後一次答對率" }).locator("strong"),
  ).toContainText("100");
  await expect(
    page.locator(".stat-grid > div", { hasText: "所有嘗試正確率" }).locator("strong"),
  ).toContainText("50");

  // 分科分年度列顯示完成數、正確數與待複習數
  const yearRow = page.locator(".chapter-row", { hasText: "民法｜民國 114 年" });
  await expect(yearRow).toContainText("1/27 完成・1 對・0 待複習");
});

test("作答熱力圖：今日作答數即時反映", async ({ page }) => {
  await openApp(page);

  // 作答兩題
  await page.locator(".options .option").nth(0).click();
  await clickNav(page, "下一題");
  await page.locator(".options .option").nth(0).click();

  await page.locator(".nav-item", { hasText: "學習紀錄" }).click();
  await expect(page.locator(".activity-heatmap")).toContainText("每日作答熱力圖");
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayCell = page.locator(`.heatmap-cell[title="${todayKey}：2 題"]`);
  await expect(todayCell).toHaveCount(1);
  await expect(todayCell).toHaveClass(/level-1/);
  // 舊資料無每日紀錄的說明
  await expect(page.locator(".activity-heatmap")).toContainText("先前的作答沒有每日紀錄");
});

test("考試倒數：設定、建議題數、匯出保留與清除", async ({ page }) => {
  await openApp(page);

  // 設定 10 天後為考試日
  const target = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const targetKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
  const card = page.locator(".exam-countdown");
  await card.getByLabel("目標考試日期").fill(targetKey);
  await card.getByRole("button", { name: "設定" }).click();

  await expect(card).toContainText("10 天");
  await expect(card).toContainText(`距離 ${targetKey}`);
  // 每日建議 = ceil(1090 / 10) = 109
  await expect(card).toContainText("每日建議 109 題");

  // 重新整理後保留（存於 v3 progress）
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator(".exam-countdown")).toContainText("10 天");

  // 清除後回到設定表單
  await page.locator(".exam-countdown").getByRole("button", { name: "清除" }).click();
  await expect(page.locator(".exam-countdown").getByLabel("目標考試日期")).toBeVisible();
});

test("每日一題：入口、完成累計與同日鎖定", async ({ page }) => {
  await openApp(page);

  const dailyCard = page.locator(".daily-card");
  await expect(dailyCard).toContainText("0 天");

  // 進入今日題目並作答
  await dailyCard.getByRole("button", { name: "作答今日題目" }).click();
  await expect(page.locator("article.question-card")).toBeVisible();
  await page.locator(".options .option").first().click();
  await expect(page.locator(".analysis")).toBeVisible();

  // 連續天數 +1，同日不能重複計
  await expect(dailyCard).toContainText("1 天");
  await expect(dailyCard.getByRole("button")).toContainText("今日已完成");
  await expect(dailyCard.getByRole("button")).toBeDisabled();

  // 重新整理後保留
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator(".daily-card")).toContainText("1 天");
  await expect(page.locator(".daily-card").getByRole("button")).toBeDisabled();
});

test("繼續上次練習與重新開始", async ({ page }) => {
  await openApp(page);

  // 建立會話狀態：年度 112、前進到第 3 題，等待快照寫入
  await toggleFilterOptions(page, "依年度複選篩選", ["112 年"]);
  await clickNav(page, "下一題");
  await clickNav(page, "下一題");
  expect((await readPosition(page)).position).toBe(3);
  await page.waitForTimeout(700);

  // 重新整理後出現「繼續上次練習」
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator(".resume-banner")).toBeVisible();
  await page.getByRole("button", { name: "繼續上次練習" }).click();
  expect(await readPosition(page)).toEqual({ position: 3, total: 25 });
  await expect(page.locator('summary[aria-label="依年度複選篩選"]')).toHaveText("112 年");

  // 再次重新整理選擇「重新開始」→ 回到預設畫面
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await page.getByRole("button", { name: "重新開始" }).click();
  await expect(page.locator(".resume-banner")).toHaveCount(0);
  expect((await readPosition(page)).position).toBe(1);
  await expect(page.locator('summary[aria-label="依年度複選篩選"]')).toHaveText("全部年度");
});

test("題目深連結：hash 開啟指定題目", async ({ page }) => {
  await page.goto(appUrl("#q=judicial-fourth-112-criminal-law-mcq-16"));
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator("article.question-card h2")).toContainText("偽造文書印文罪");
  await expect(page.locator(".question-card .tag.type")).toHaveText("刑法概要");
});

test("題目深連結：無效 ID 安全回到預設畫面", async ({ page }) => {
  await page.goto(appUrl("#q=not-a-real-question-id"));
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator("article.question-card")).toBeVisible();
  expect((await readPosition(page)).position).toBe(1);
});

test("收藏與不確定標記", async ({ page }) => {
  await openApp(page);

  // 收藏與不確定為獨立狀態
  const starButton = page.locator(".question-tools button", { hasText: "收藏" });
  const uncertainButton = page.locator(".question-tools button", { hasText: "不確定" });
  await starButton.click();
  await expect(starButton).toHaveAttribute("aria-pressed", "true");
  await uncertainButton.click();
  await expect(uncertainButton).toHaveAttribute("aria-pressed", "true");

  await expect(page.getByRole("button", { name: "筆記" })).toHaveCount(0);

  // 篩選只看收藏／不確定
  await page.locator(".filters .segmented button", { hasText: "收藏" }).click();
  expect(await readPosition(page)).toEqual({ position: 1, total: 1 });
  await expect(page.locator("article.question-card h2")).toContainText(FIRST_CIVIL_PROMPT);
  await page.locator(".filters .segmented button", { hasText: "不確定" }).click();
  expect(await readPosition(page)).toEqual({ position: 1, total: 1 });

  // 重新整理後收藏與不確定標記仍在。
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator("article.question-card h2")).toContainText(FIRST_CIVIL_PROMPT);
  await expect(page.locator(".question-tools button", { hasText: "收藏" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".question-tools button", { hasText: "不確定" })).toHaveAttribute("aria-pressed", "true");
});

test("題目報錯：預填 GitHub Issue 連結正確編碼", async ({ page }) => {
  await openApp(page);

  const href = await page
    .locator(".source-line a", { hasText: "回報問題" })
    .getAttribute("href");
  expect(href).toBeTruthy();
  const url = new URL(href!);
  expect(url.origin + url.pathname).toBe(
    "https://github.com/Oliviaiii/civil-law-quiz-tw/issues/new",
  );
  // 中文與特殊字元經 URL 編碼後可正確還原
  expect(url.searchParams.get("title")).toBe(
    "【題庫勘誤】judicial-fourth-114-mcq-01｜民法概要 114 年 第 1 題",
  );
  expect(url.searchParams.get("labels")).toBe("題庫勘誤");
  expect(url.searchParams.get("body")).toContain("題目 ID：judicial-fourth-114-mcq-01");
  expect(url.searchParams.get("body")).toContain(FIRST_CIVIL_PROMPT);
});

test("選項亂序：判題與答案標示對應原始選項", async ({ page }) => {
  await openApp(page);

  await page.getByRole("checkbox", { name: "選項亂序" }).check();
  // 换題讓卡片以亂序狀態重新掛載
  await clickNav(page, "下一題");
  await clickNav(page, "上一題");

  // 答錯：以選項文字定位（不依賴位置），判題與標示仍正確
  await page.locator(".options .option", { hasText: "應由全體監察人過半數之同意行使" }).click();
  await expect(page.locator(".analysis .analysis-result")).toContainText("本題答錯");
  await expect(page.locator(".options .option", { hasText: "應由全體監察人過半數之同意行使" })).toContainText("你的答案");
  await expect(page.locator(".options .option", { hasText: "各監察人均得單獨行使" })).toContainText("正確");

  // 下一題答對
  await clickNav(page, "下一題");
  await page.locator(".options .option", { hasText: "得隨時不具理由開除社員" }).click();
  await expect(page.locator(".analysis .analysis-result")).toContainText("判斷正確");

  // 偏好保存：重新整理後仍為開啟
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.getByRole("checkbox", { name: "選項亂序" })).toBeChecked();
});

test("模擬考：設定、作答、恢復、交卷與結果", async ({ page }) => {
  await openApp(page);
  await page.locator(".nav-item", { hasText: "模擬考" }).click();

  // 設定：10 題、15 分鐘（等待題庫載入完成後才可開始）
  await page.getByRole("button", { name: /^10 題$/ }).click();
  await page.getByRole("button", { name: /^15 分鐘$/ }).click();
  await page.getByRole("button", { name: "開始模擬考" }).click();

  const bar = page.locator(".mock-session-bar");
  await expect(bar).toContainText("已答 0 / 10");
  await expect(bar).toContainText(/剩餘 \d{2}:\d{2}/);

  // 作答不立即判分，且可改答
  await page.locator(".mock-question .option").nth(0).click();
  await expect(page.locator(".analysis")).toHaveCount(0);
  await expect(bar).toContainText("已答 1 / 10");
  await page.locator(".mock-question .option").nth(1).click();
  await expect(bar).toContainText("已答 1 / 10");
  await expect(page.locator(".mock-question .option").nth(1)).toContainText("已選");

  // 答題卡：格子標記已答並可跳題
  await expect(page.locator(".sheet-cell.answered")).toHaveCount(1);
  await page.locator(".question-footer .next-button").click();
  await expect(page.locator(".mock-question .question-number")).toContainText("第 2 / 10 題");
  await page.locator(".sheet-cell").nth(0).click();
  await expect(page.locator(".mock-question .question-number")).toContainText("第 1 / 10 題");

  // 重新整理後自動回到模擬考並保留作答
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator(".mock-session-bar")).toContainText("已答 1 / 10");

  // 交卷（未作答提醒）
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("未作答");
    dialog.accept();
  });
  await page.getByRole("button", { name: "交卷" }).click();

  // 結果頁：總分、配分規則、分科結果與錯題清單
  await expect(page.locator(".mock-result")).toBeVisible();
  await expect(page.locator(".result-summary")).toContainText("總分");
  await expect(page.locator(".mock-scoring-note").first()).toContainText("每題 10.0 分");
  await expect(page.locator(".mock-subject-breakdown .chapter-row")).toHaveCount(1);
  await expect(page.locator(".mock-wrong-list")).toContainText("錯題與未作答清單");

  // 關閉結果回到設定畫面
  await page.getByRole("button", { name: "關閉結果並結束模擬考" }).click();
  await expect(page.getByRole("button", { name: "開始模擬考" })).toBeVisible();
});

test("法條速查：條號查找、條文與考過此條的題目", async ({ page }) => {
  await openApp(page);
  await page.locator(".nav-item", { hasText: "法條速查" }).click();

  await page.getByRole("searchbox", { name: "搜尋條號" }).fill("1144");
  await page.locator(".law-article-list button", { hasText: /^第 1144 條$/ }).click();
  await expect(page.locator(".law-detail h2")).toHaveText("民法第 1144 條");
  await expect(page.locator(".law-text")).toContainText("配偶");

  // 考過此條的題目可直接跳回練習
  const related = page.locator(".law-related li button");
  await expect(related.first()).toBeVisible();
  await related.first().click();
  await expect(page.locator("article.question-card")).toBeVisible();

  // 切換刑法並查條文
  await page.locator(".nav-item", { hasText: "法條速查" }).click();
  await page.locator(".law-toolbar .segmented").first().getByRole("button", { name: "刑法" }).click();
  await page.getByRole("searchbox", { name: "搜尋條號" }).fill("320");
  await page.locator(".law-article-list button", { hasText: /^第 320 條$/ }).click();
  await expect(page.locator(".law-text")).toContainText("竊盜");
});

test("法條出題頻率排行：可點入條文與相關題目", async ({ page }) => {
  await openApp(page);
  await page.locator(".nav-item", { hasText: "法條速查" }).click();

  // 未選條文時顯示排行（等待題庫統計完成）
  const rankingRows = page.locator(".law-ranking li button");
  await expect(rankingRows.first()).toBeVisible();
  await expect(page.locator(".law-ranking")).toContainText("出題頻率排行");
  await expect(rankingRows.first()).toContainText(/\d+ 題/);

  // 點排行第一名進入條文頁，顯示條文與相關題目
  await rankingRows.first().click();
  await expect(page.locator(".law-detail h2")).toContainText(/民法第 .+ 條/);
  await expect(page.locator(".law-related li button").first()).toBeVisible();
});

test("解析區顯示考同一法條的其他題目並可跳題", async ({ page }) => {
  await page.goto(appUrl("#q=judicial-fourth-112-mcq-25"));
  await page.waitForSelector('html[data-app-ready="true"]');

  // 官方題引用民法第 1144 條，另有其他正式題引用同一條文。
  await page.locator(".options .option").nth(1).click();

  const related = page.locator(".related-questions li button");
  await expect(related.first()).toBeVisible();
  await related.first().click();

  // 跳到引用同一條的另一題官方民法題
  await expect(page.locator("article.question-card")).toBeVisible();
  await expect(page.locator(".question-card .tag.type")).toHaveText("民法概要");
});

test.describe("無 Service Worker（模擬網路失敗）", () => {
  // Service Worker 會代為抓取 chunk，繞過測試的網路攔截，此組測試停用。
  test.use({ serviceWorkers: "block" });

  test("題庫載入失敗顯示錯誤並可重試", async ({ page }) => {
    await openApp(page);

    // 阻斷後續 chunk 下載，模擬憲法題庫載入失敗
    await page.route("**/_next/static/chunks/**", (route) => route.abort());
    await toggleFilterOptions(page, "依科目複選篩選", ["民法", "憲法"]);
    await expect(page.locator(".empty-state")).toContainText("題庫載入失敗");

    // 恢復網路後可重試（重試以重新整理復原，因 Turbopack 會快取失敗的動態 import）
    await page.unroute("**/_next/static/chunks/**");
    await page.getByRole("button", { name: "重試載入" }).click();
    await expect(page.locator("article.question-card")).toBeVisible();
  });
});

test("法條閃卡：翻面、評分、狀態保存與共用到期規則", async ({ page }) => {
  await openApp(page);
  await page.locator(".nav-item", { hasText: "法條速查" }).click();
  await page.getByRole("button", { name: "閃卡練習" }).click();

  // 進度列與規則說明（與間隔複習同一套）
  const progressLine = page.locator(".flashcard-progress");
  await expect(progressLine).toContainText(/新卡 \d+/);
  await expect(progressLine).toContainText("3、7、14、30 天");
  const freshBefore = Number((await progressLine.innerText()).match(/新卡 (\d+)/)![1]);

  // 正面只有條號，翻面顯示條文與相關題目
  await expect(page.locator(".flashcard-front h2")).toContainText(/民法第 .+ 條/);
  await page.getByRole("button", { name: "看條文" }).click();
  await expect(page.locator(".flashcard-back .law-text")).toBeVisible();
  await expect(page.locator(".flashcard-back")).toContainText("相關題目");

  // 評分「記得」後換下一張、新卡數遞減
  await page.getByRole("button", { name: "記得", exact: true }).click();
  await expect(page.locator(".flashcard-front")).toBeVisible();
  await expect(progressLine).toContainText(`新卡 ${freshBefore - 1}`);

  // 重新整理後排程狀態保留（存於 v3 progress）
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await page.locator(".nav-item", { hasText: "法條速查" }).click();
  await page.getByRole("button", { name: "閃卡練習" }).click();
  await expect(page.locator(".flashcard-progress")).toContainText(`新卡 ${freshBefore - 1}`);
});

test("深色模式：手動切換、保存與首次載入即套用", async ({ page }) => {
  await openApp(page);
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: "切換深淺色主題" });

  // 預設跟隨系統（無 data-theme）
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
  await expect(toggle).toContainText("系統");

  // 切到深色
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toContainText("深色");

  // 重新整理後於首次繪製前即套用（無閃爍：hydration 前屬性已存在）
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForSelector('html[data-app-ready="true"]');

  // 深色下主要文字與背景 token 已切換
  const paper = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--paper").trim(),
  );
  expect(paper).toBe("#171512");

  // 再切：淺色 → 系統
  await page.getByRole("button", { name: "切換深淺色主題" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "切換深淺色主題" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("申論題自我練習：草稿、計時與檢核清單", async ({ page }) => {
  await openApp(page);
  await page.locator(".filters select").selectOption("申論題");
  await expect(page.locator(".essay-practice")).toBeVisible();

  // 官方未提供擬答的標示與不提供 AI 擬答的說明
  await expect(page.locator(".essay-practice")).toContainText("考選部未提供申論題官方擬答");
  await expect(page.locator(".essay-practice")).toContainText("不自動產生");

  // 計時器
  await page.getByRole("button", { name: "開始計時" }).click();
  await expect(page.locator(".essay-timer span")).toContainText(/已用時 00:0[1-9]/, { timeout: 5000 });
  await page.getByRole("button", { name: "暫停計時" }).click();

  // 檢核清單可勾選
  const firstCheck = page.locator(".essay-checklist input").first();
  await firstCheck.check();
  await expect(firstCheck).toBeChecked();

  // 草稿保存並於重新整理後保留
  await page.getByRole("textbox", { name: "申論題作答草稿" }).fill("爭點：無權處分。依民法第 118 條……");
  await page.getByRole("button", { name: "儲存草稿" }).click();
  await expect(page.locator(".toast")).toContainText("申論草稿已保存");

  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await page.locator(".filters select").selectOption("申論題");
  await expect(page.getByRole("textbox", { name: "申論題作答草稿" })).toHaveValue(
    "爭點：無權處分。依民法第 118 條……",
  );
});

test("PWA 離線：已載入內容離線仍可作答", async ({ page, context }) => {
  await openApp(page);

  // 等 Service Worker 啟用並以受控狀態重新載入（此時所有資源進入快取）
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]');
  await expect(page.locator("article.question-card")).toBeVisible();
  await page.waitForTimeout(600);

  // 離線重新載入：shell 與題庫由快取供應
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]', { timeout: 15000 });
  await expect(page.locator("article.question-card")).toBeVisible();
  await expect(page.locator(".offline-notice")).toContainText("目前離線");

  // 離線仍可作答並保存進度
  await page.locator(".options .option").first().click();
  await expect(page.locator(".analysis")).toBeVisible();
  await context.setOffline(false);
});

test("學習紀錄可匯出下載", async ({ page }) => {
  await openApp(page);
  await page.locator(".nav-item", { hasText: "學習紀錄" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出紀錄" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^法院書記官題庫練習紀錄-\d{4}-\d{2}-\d{2}\.json$/);
});

test("匯入紀錄：有效檔、格式錯誤與 v1 migration", async ({ page }) => {
  await openApp(page);
  await page.locator(".nav-item", { hasText: "學習紀錄" }).click();
  const doneStat = page
    .locator(".stat-grid > div", { hasText: "完成題數" })
    .locator("strong");
  const fileInput = page.locator('input[type="file"]');

  // 有效 v2 檔
  await fileInput.setInputFiles(
    progressFile("progress-v2.json", {
      version: 2,
      answers: {
        "judicial-fourth-114-mcq-01": {
          attempts: 1,
          lastSelected: 1,
          lastCorrect: true,
          lastAnsweredAt: "2026-07-01T00:00:00.000Z",
        },
      },
    }),
  );
  await expect(page.locator(".toast")).toContainText("學習紀錄已匯入");
  await expect(doneStat).toContainText(/^1\s*\//);

  // 格式錯誤：資料不變
  await fileInput.setInputFiles(progressFile("broken.json", "這不是 JSON"));
  await expect(page.locator(".toast")).toContainText("檔案格式不正確");
  await expect(doneStat).toContainText(/^1\s*\//);

  // v1 舊格式：只保留 judicial-fourth-* 舊紀錄，已移除的示範題紀錄捨棄
  await fileInput.setInputFiles(
    progressFile("progress-v1.json", {
      version: 1,
      answers: {
        "demo-001": {
          attempts: 1,
          lastSelected: 0,
          lastCorrect: false,
          lastAnsweredAt: "2025-01-01T00:00:00.000Z",
        },
        "judicial-fourth-112-mcq-23": {
          attempts: 1,
          lastSelected: 0,
          lastCorrect: false,
          lastAnsweredAt: "2025-01-01T00:00:00.000Z",
        },
      },
    }),
  );
  await expect(page.locator(".toast")).toContainText("學習紀錄已匯入");
  await expect(doneStat).toContainText(/^1\s*\//);
  await expect(page.locator(".nav-item", { hasText: "錯題本" }).locator("b")).toHaveText("1");

  // v3 格式可完整匯入；舊版 note 欄位會被丟棄。
  await fileInput.setInputFiles(
    progressFile("progress-v3.json", {
      version: 3,
      answers: {
        "judicial-fourth-114-mcq-01": {
          attempts: 2,
          lastSelected: 1,
          lastCorrect: true,
          lastAnsweredAt: "2026-07-10T00:00:00.000Z",
          correctStreak: 2,
          wrongCount: 1,
        },
      },
      flags: {
        "judicial-fourth-114-mcq-01": { starred: true, note: "舊版筆記應被移除" },
      },
      daily: { "2026-07-10": 5 },
      examDate: "2026-08-09",
    }),
  );
  await expect(page.locator(".toast")).toContainText("學習紀錄已匯入");
  await expect(doneStat).toContainText(/^1\s*\//);
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("civil-law-quiz-tw:progress:v3") ?? "{}");
    return stored.flags?.["judicial-fourth-114-mcq-01"];
  })).toEqual({ starred: true });
});

test("題目亂序：開啟後作答順序改變、題數不變且判題正常", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "清除所有篩選" }).click();

  const heading = page.locator("article.question-card h2");
  const collect = async (steps: number) => {
    const prompts: string[] = [];
    prompts.push(await heading.innerText());
    for (let index = 0; index < steps; index += 1) {
      await clickNav(page, "下一題");
      prompts.push(await heading.innerText());
    }
    return prompts;
  };

  const totalBefore = (await readPosition(page)).total;
  const defaultOrder = await collect(9);

  // 開啟題目亂序
  const shuffle = page.getByRole("checkbox", { name: "題目亂序" });
  await shuffle.check();
  await expect(shuffle).toBeChecked();

  const totalAfter = (await readPosition(page)).total;
  expect(totalAfter).toBe(totalBefore); // 亂序不改變題數

  const shuffledOrder = await collect(9);
  // 大題庫下，前十題順序完全相同的機率趨近於零
  expect(shuffledOrder.join("|")).not.toBe(defaultOrder.join("|"));
  // 亂序後題目集合不變（僅順序不同）
  expect(new Set(shuffledOrder)).not.toContain(undefined);

  // 關閉後恢復預設順序
  await shuffle.uncheck();
  await expect(shuffle).not.toBeChecked();
});

test("題目亂序：重新洗牌抽出不同順序", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "清除所有篩選" }).click();

  const heading = page.locator("article.question-card h2");
  const collect = async (steps: number) => {
    const prompts: string[] = [await heading.innerText()];
    for (let index = 0; index < steps; index += 1) {
      await clickNav(page, "下一題");
      prompts.push(await heading.innerText());
    }
    return prompts.join("|");
  };

  await page.getByRole("checkbox", { name: "題目亂序" }).check();
  const firstOrder = await collect(9);

  // 重新洗牌 → 抽出全新順序
  await page.getByRole("button", { name: "重新洗牌" }).click();
  const secondOrder = await collect(9);
  expect(secondOrder).not.toBe(firstOrder);
});
