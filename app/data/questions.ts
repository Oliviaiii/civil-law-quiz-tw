// 題目資料型別。實際題庫依科目拆在 app/data/banks/*，由 useQuestionBank 按需載入，
// 避免整包題庫進入首頁 JS bundle。
import type { EnglishAnalysis } from "./english-analyses";
import type { Reference } from "./references";

export type Subject =
  | "civil-law"
  | "criminal-law"
  | "constitution"
  | "legal-introduction"
  | "english"
  | "chinese"
  | "administrative-law"
  | "civil-procedure"
  | "criminal-procedure";

export type Paper =
  | "civil-law-summary"
  | "criminal-law-summary"
  | "legal-knowledge-and-english"
  | "chinese"
  | "administrative-law-summary"
  | "civil-criminal-procedure-summary";

export type Question = {
  id: string;
  category: "總則" | "債編" | "物權" | "親屬與繼承" | "待分類";
  type: "概念型" | "個案型";
  difficulty: "基礎" | "進階";
  format?: "選擇題" | "申論題";
  source: string;
  sourceUrl?: string;
  answerUrl?: string | null;
  answerSource?: string | null;
  rocYear?: number;
  gregorianYear?: number;
  exam?: string;
  subject: Subject;
  subjectLabel: string;
  paper: Paper;
  officialQuestionNumber?: number;
  applicableCategories?: string[];
  prompt: string;
  options: string[];
  answer: number | null;
  allCredit?: boolean;
  acceptedAnswers?: number[] | null;
  confidence?: "高" | "中";
  analysis?: {
    issue: string;
    rule: string;
    application: string;
    conclusion: string;
    trap: string;
  };
  englishAnalysis?: EnglishAnalysis;
  passageId?: string;
  passage?: string;
  statutes: { article: string; lawName?: string; text: string; url: string }[];
  references: Reference[];
};
