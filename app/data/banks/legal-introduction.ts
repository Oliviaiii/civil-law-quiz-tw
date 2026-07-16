// 法學緒論題庫：法學知識與英文試卷中的法學緒論題。
import combinedPaperRecordsJson from "../legal-knowledge-and-english-questions.json";
import { buildLegalIntroductionAnalysis } from "../legal-introduction-analyses";
import type { CombinedPaperRecord } from "../record-types";
import type { Question } from "../questions";

export const bank: Question[] = (
  combinedPaperRecordsJson as CombinedPaperRecord[]
)
  .filter((record) => record.subject === "legal-introduction")
  .map((record) => {
    const explanation = buildLegalIntroductionAnalysis(record);
    return {
      ...record,
      subjectLabel: "法學緒論",
      category: "待分類" as const,
      type: "概念型" as const,
      difficulty: "進階" as const,
      source: `${record.rocYear} 年司法特考四等｜法學知識與英文｜官方第 ${record.officialQuestionNumber} 題`,
      confidence: explanation?.confidence,
      analysis: explanation?.analysis,
      statutes: (explanation?.references ?? [])
        .filter((reference) => reference.type === "statute")
        .map((reference) => ({
          article: reference.locator ?? "相關規定",
          lawName: reference.title,
          text: reference.text ?? "請開啟官方來源核對命題時有效規定。",
          url: reference.url,
        })),
      references: explanation?.references ?? [],
    };
  })
  .sort(
    (left, right) =>
      right.rocYear - left.rocYear ||
      left.officialQuestionNumber - right.officialQuestionNumber,
  );
