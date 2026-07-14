// 國文、行政法概要、民事訴訟法概要、刑事訴訟法概要共用的轉換邏輯
// （四科同存於 clerk-remaining-questions.json）。
import remainingClerkRecordsJson from "../clerk-remaining-questions.json";
import { buildChineseAnalysis } from "../chinese-analyses";
import type { RemainingClerkRecord } from "../record-types";
import type { Question } from "../questions";
import { byYearSubjectNumber } from "./shared";

export function clerkBank(studySubject: RemainingClerkRecord["studySubject"]): Question[] {
  return (remainingClerkRecordsJson as RemainingClerkRecord[])
    .filter((record) => record.studySubject === studySubject)
    .map((record) => {
      const explanation = record.studySubject === "chinese"
        ? buildChineseAnalysis(record)
        : undefined;
      return {
        ...record,
        subject: record.studySubject,
        subjectLabel: record.subject,
        category: "待分類" as const,
        type: (record.format === "申論題" ? "個案型" : "概念型") as Question["type"],
        difficulty: "進階" as const,
        source: `${record.rocYear} 年司法特考四等｜${record.subject}｜${record.questionKind}第 ${record.officialQuestionNumber} 題`,
        confidence: explanation?.confidence,
        analysis: explanation?.analysis,
        statutes: [],
        references: [
          {
            type: "official-material" as const,
            title: "考選部官方試題",
            locator: `第 ${record.officialQuestionNumber} 題`,
            url: record.sourceUrl,
          },
          ...(record.answerUrl && record.answerSource
            ? [{
                type: "official-material" as const,
                title: record.answerSource,
                locator: `第 ${record.officialQuestionNumber} 題`,
                url: record.answerUrl,
              }]
            : []),
        ],
      };
    })
    .sort(byYearSubjectNumber);
}
