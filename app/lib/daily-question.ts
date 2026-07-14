import { officialMcqCountsBySubject } from "../data/bank-manifest";
import type { Question } from "../data/questions";
import type { SubjectFilter } from "./quiz-filters";

// 每日一題：以本機日期字串為種子做確定性選題，同一天所有訪客題目相同，
// 不需要伺服器。指標只依賴 bank-manifest 的各科選擇題數，無需先載入題庫。

const subjectOrder = Object.keys(officialMcqCountsBySubject) as SubjectFilter[];

function hashOfDate(dateKey: string): number {
  // djb2：簡單、確定性、跨瀏覽器一致。
  let hash = 5381;
  for (let index = 0; index < dateKey.length; index += 1) {
    hash = ((hash << 5) + hash + dateKey.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export type DailyPointer = { subject: SubjectFilter; offset: number };

/** 由日期決定「第幾科的第幾題官方選擇題」。 */
export function dailyPointer(dateKey: string): DailyPointer {
  const counts = officialMcqCountsBySubject as Record<SubjectFilter, number>;
  const total = subjectOrder.reduce((sum, subject) => sum + counts[subject], 0);
  let remaining = hashOfDate(dateKey) % total;
  for (const subject of subjectOrder) {
    if (remaining < counts[subject]) return { subject, offset: remaining };
    remaining -= counts[subject];
  }
  return { subject: subjectOrder[0], offset: 0 };
}

/** 從已載入題目中解析今日題目；該科題庫未載入時回傳 undefined。 */
export function dailyQuestionFrom(
  questions: Question[],
  pointer: DailyPointer,
): Question | undefined {
  const officialMcqs = questions.filter(
    (question) =>
      question.subject === pointer.subject &&
      Boolean(question.exam) &&
      question.format === "選擇題",
  );
  return officialMcqs[pointer.offset];
}
