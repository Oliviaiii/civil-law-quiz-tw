// 憲法題庫：法學知識與英文試卷中的憲法題。
import combinedPaperRecordsJson from "../legal-knowledge-and-english-questions.json";
import { buildConstitutionAnalysis } from "../constitution-analyses";
import type { CombinedPaperRecord } from "../record-types";
import type { Question } from "../questions";

export const bank: Question[] = (
  combinedPaperRecordsJson as CombinedPaperRecord[]
)
  .filter((record) => record.subject === "constitution")
  .map((record) => {
    const explanation = buildConstitutionAnalysis(record);
    return {
      ...record,
      subjectLabel: "憲法",
      category: "待分類" as const,
      type: "概念型" as const,
      difficulty: "進階" as const,
      source: `${record.rocYear} 年司法特考四等｜法學知識與英文｜官方第 ${record.officialQuestionNumber} 題`,
      confidence: explanation?.confidence,
      analysis: explanation?.analysis,
      statutes: [],
      references: explanation?.references ?? [],
    };
  })
  .sort(
    (left, right) =>
      right.rocYear - left.rocYear ||
      left.officialQuestionNumber - right.officialQuestionNumber,
  );
