import type { Question } from "../data/questions";

// 純靜態做法：以 GitHub Issue 預填 URL 收集題庫勘誤，前端只組字串、不用任何 API 或金鑰。
const REPO_URL = "https://github.com/oliviaiii1224/civil-law-quiz-tw";

/** 產生預填題號、科目、年度與題目資訊的 GitHub Issue 連結。 */
export function buildIssueUrl(question: Question): string {
  const title = [
    `【題庫勘誤】${question.id}｜${question.subjectLabel}`,
    question.rocYear ? `${question.rocYear} 年` : null,
    question.officialQuestionNumber ? `第 ${question.officialQuestionNumber} 題` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const promptSnippet =
    question.prompt.length > 120 ? `${question.prompt.slice(0, 120)}…` : question.prompt;
  const body = [
    "### 題目資訊",
    `- 題目 ID：${question.id}`,
    `- 科目：${question.subjectLabel}`,
    question.rocYear ? `- 年度：民國 ${question.rocYear} 年` : null,
    question.officialQuestionNumber ? `- 官方題號：第 ${question.officialQuestionNumber} 題` : null,
    question.sourceUrl ? `- 官方試題：${question.sourceUrl}` : null,
    "",
    "### 題幹節錄",
    `> ${promptSnippet}`,
    "",
    "### 問題描述",
    "（請說明題目、答案或解析哪裡有誤，並盡量附上依據）",
  ]
    .filter((line) => line !== null)
    .join("\n");
  const params = new URLSearchParams({ title, body, labels: "題庫勘誤" });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}
