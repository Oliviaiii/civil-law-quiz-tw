// 民法題庫：司法特考四等民法概要官方題＋自行編寫示範題。
import officialRecordsJson from "../judicial-fourth-questions.json";
import demoRecordsJson from "../demo-questions.json";
import civilChapterTagsJson from "../taxonomy/civil-law-tags.json";
import { buildOfficialAnalysis } from "../judicial-fourth-analyses";
import type { DemoQuestionRecord, OfficialQuestionRecord } from "../record-types";
import type { Question } from "../questions";
import { byYearSubjectNumber, statuteReferences } from "./shared";

// 章節標籤由 scripts/generate-question-data.mjs 依人工解析引用的民法條文產生。
const chapterTags = civilChapterTagsJson as Record<string, Question["category"]>;

const officialQuestions: Question[] = (
  officialRecordsJson as OfficialQuestionRecord[]
).map((record) => {
  const normalized = {
    ...record,
    acceptedAnswers: record.acceptedAnswers?.length
      ? record.acceptedAnswers
      : record.answer === null ? [] : [record.answer],
  };
  const explanation = buildOfficialAnalysis(normalized);
  return {
    ...normalized,
    subject: "civil-law" as const,
    subjectLabel: record.subject,
    paper: "civil-law-summary" as const,
    category: chapterTags[record.id] ?? ("待分類" as const),
    type: (record.format === "申論題" ? "個案型" : "概念型") as Question["type"],
    difficulty: "進階" as const,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜第 ${record.officialQuestionNumber} 題`,
    confidence: explanation?.confidence,
    analysis: explanation?.analysis,
    statutes: explanation?.statutes ?? [],
    references: statuteReferences(explanation?.statutes ?? [], "民法"),
  };
}).sort(byYearSubjectNumber);

const demoQuestions: Question[] = (demoRecordsJson as DemoQuestionRecord[]).map((record) => ({
  ...record,
  subject: "civil-law" as const,
  subjectLabel: "民法",
  paper: "civil-law-summary" as const,
  format: "選擇題" as const,
  references: statuteReferences(record.statutes, "民法"),
}));

export const bank: Question[] = [...officialQuestions, ...demoQuestions];
