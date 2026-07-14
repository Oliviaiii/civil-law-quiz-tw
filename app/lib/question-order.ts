import type { Question } from "../data/questions";

/**
 * 跨科合併時的全站題目順序，維持與單一題庫時代相同的排列：
 * 民法＋刑法官方題（年度新到舊交錯）→ 憲法 → 法學緒論 → 英文 →
 * 國文與其餘書記官科目。
 */
export function sortGroupOf(question: Question): number {
  if (!question.exam) return 5;
  switch (question.subject) {
    case "civil-law":
    case "criminal-law":
      return 0;
    case "constitution":
      return 1;
    case "legal-introduction":
      return 2;
    case "english":
      return 3;
    default:
      return 4;
  }
}

export function compareQuestions(left: Question, right: Question): number {
  return (
    sortGroupOf(left) - sortGroupOf(right) ||
    (right.rocYear ?? 0) - (left.rocYear ?? 0) ||
    left.subjectLabel.localeCompare(right.subjectLabel, "zh-Hant") ||
    (left.officialQuestionNumber ?? 0) - (right.officialQuestionNumber ?? 0)
  );
}
