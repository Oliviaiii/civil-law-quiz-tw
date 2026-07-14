// 各科 bank 模組共用的小工具。
import type { Question } from "../questions";

/** 將法條清單轉成解析區顯示用的官方依據連結。 */
export function statuteReferences(
  statutes: Question["statutes"],
  defaultLawName: string,
): Question["references"] {
  return statutes.map((statute) => ({
    type: "statute" as const,
    title: statute.lawName ?? defaultLawName,
    locator: `第 ${statute.article} 條`,
    url: statute.url,
    text: statute.text,
  }));
}

/** 官方題目的固定排序：年度新到舊、科目名稱、官方題號。 */
export function byYearSubjectNumber(left: Question, right: Question): number {
  return (
    (right.rocYear ?? 0) - (left.rocYear ?? 0) ||
    left.subjectLabel.localeCompare(right.subjectLabel, "zh-Hant") ||
    (left.officialQuestionNumber ?? 0) - (right.officialQuestionNumber ?? 0)
  );
}
