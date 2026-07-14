import { localDateKey, type ProgressData } from "./progress-store";

// 簡單、可解釋的固定間隔規則（Leitner 式），不依賴後端排程：
// 答錯 → 1 天後複習；連續答對 1、2、3、4 次以上 → 3、7、14、30 天後複習。
const WRONG_INTERVAL_DAYS = 1;
const CORRECT_INTERVAL_DAYS = [3, 7, 14, 30];

/** 依本次作答結果計算下次複習時間（correctStreak 為更新後的連續答對數）。 */
export function nextDueAt(correctStreak: number, isCorrect: boolean, from: Date): string {
  const days = isCorrect
    ? CORRECT_INTERVAL_DAYS[Math.min(correctStreak, CORRECT_INTERVAL_DAYS.length) - 1] ??
      CORRECT_INTERVAL_DAYS[CORRECT_INTERVAL_DAYS.length - 1]
    : WRONG_INTERVAL_DAYS;
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

export type ReviewQueue = { dueToday: string[]; overdue: string[] };

/** 以本機日期切分「今日到期」與「逾期」。 */
export function reviewQueueOf(progress: ProgressData, now: Date): ReviewQueue {
  const todayKey = localDateKey(now);
  const dueToday: string[] = [];
  const overdue: string[] = [];
  for (const [id, answer] of Object.entries(progress.answers)) {
    if (!answer.dueAt) continue;
    const dueKey = localDateKey(new Date(answer.dueAt));
    if (dueKey === todayKey) dueToday.push(id);
    else if (dueKey < todayKey) overdue.push(id);
  }
  return { dueToday, overdue };
}
