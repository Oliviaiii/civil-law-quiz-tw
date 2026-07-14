// 英文題庫：法學知識與英文試卷中的英文題，附繁中翻譯與詞性整理。
import combinedPaperRecordsJson from "../legal-knowledge-and-english-questions.json";
import { buildEnglishAnalysis } from "../english-analyses";
import type { CombinedPaperRecord } from "../record-types";
import type { Question } from "../questions";

export const bank: Question[] = (
  combinedPaperRecordsJson as CombinedPaperRecord[]
)
  .filter((record) => record.subject === "english")
  .map((record) => ({
    ...record,
    subjectLabel: "英文",
    category: "待分類" as const,
    type: "概念型" as const,
    difficulty: "進階" as const,
    source: `${record.rocYear} 年司法特考四等｜法學知識與英文｜官方第 ${record.officialQuestionNumber} 題`,
    confidence: "中" as const,
    englishAnalysis: buildEnglishAnalysis(record),
    statutes: [],
    references: [
      {
        type: "official-material" as const,
        title: "考選部官方試題",
        locator: `第 ${record.officialQuestionNumber} 題`,
        url: record.sourceUrl,
      },
      {
        type: "official-material" as const,
        title: record.answerSource,
        locator: `第 ${record.officialQuestionNumber} 題`,
        url: record.answerUrl,
      },
    ],
  }))
  .sort(
    (left, right) =>
      right.rocYear - left.rocYear ||
      left.officialQuestionNumber - right.officialQuestionNumber,
  );
