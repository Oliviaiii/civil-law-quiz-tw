// 刑法題庫：司法特考四等刑法概要官方題。
import criminalRecordsJson from "../criminal-law-questions.json";
import { buildCriminalAnalysis } from "../criminal-law-analyses";
import type { OfficialQuestionRecord } from "../record-types";
import type { Question } from "../questions";
import { byYearSubjectNumber, statuteReferences } from "./shared";

export const bank: Question[] = (
  criminalRecordsJson as OfficialQuestionRecord[]
).map((record) => {
  const explanation = buildCriminalAnalysis(record);
  return {
    ...record,
    subject: "criminal-law" as const,
    subjectLabel: record.subject,
    paper: "criminal-law-summary" as const,
    category: "待分類" as const,
    type: (record.format === "申論題" ? "個案型" : "概念型") as Question["type"],
    difficulty: "進階" as const,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜第 ${record.officialQuestionNumber} 題`,
    confidence: explanation?.confidence,
    analysis: explanation?.analysis,
    statutes: explanation?.statutes ?? [],
    references: statuteReferences(explanation?.statutes ?? [], "刑法"),
  };
}).sort(byYearSubjectNumber);
