// 各題庫 JSON 檔的原始紀錄型別，供各科 bank 模組與資料產生腳本共用。

export type OfficialQuestionRecord = {
  id: string;
  exam: string;
  rocYear: number;
  gregorianYear: number;
  subject: string;
  studySubject?: string;
  paper?: "civil-law-summary" | "criminal-law-summary";
  applicableCategories: string[];
  sourceUrl: string;
  format: "選擇題" | "申論題";
  officialQuestionNumber: number;
  prompt: string;
  options: string[];
  answer: number | null;
  acceptedAnswers?: number[];
  allCredit: boolean;
  answerSource: string | null;
  answerUrl: string | null;
};

export type CombinedPaperRecord = {
  id: string;
  exam: string;
  rocYear: number;
  gregorianYear: number;
  paper: "legal-knowledge-and-english";
  paperTitle: string;
  subject: "constitution" | "legal-introduction" | "english";
  applicableCategories: string[];
  sourceUrl: string;
  format: "選擇題";
  officialQuestionNumber: number;
  prompt: string;
  options: string[];
  answer: number;
  acceptedAnswers: number[] | null;
  allCredit: boolean;
  answerSource: string;
  answerUrl: string;
  humanVerified: boolean;
  passageId?: string;
  passage?: string;
};

export type RemainingClerkRecord = {
  id: string;
  exam: "司法特考四等";
  rocYear: number;
  gregorianYear: number;
  subject: string;
  studySubject: "chinese" | "administrative-law" | "civil-procedure" | "criminal-procedure";
  paper: "chinese" | "administrative-law-summary" | "civil-criminal-procedure-summary";
  applicableCategories: string[];
  sourceUrl: string;
  format: "選擇題" | "申論題";
  officialQuestionNumber: number;
  questionKind: string;
  prompt: string;
  options: string[];
  answer: number | null;
  acceptedAnswers: number[];
  allCredit: boolean;
  answerSource: string | null;
  answerUrl: string | null;
};

export type DemoQuestionRecord = {
  id: string;
  category: "總則" | "債編" | "物權" | "親屬與繼承";
  type: "概念型" | "個案型";
  difficulty: "基礎" | "進階";
  source: string;
  prompt: string;
  options: string[];
  answer: number;
  confidence: "高" | "中";
  analysis: {
    issue: string;
    rule: string;
    application: string;
    conclusion: string;
    trap: string;
  };
  statutes: { article: string; text: string; url: string }[];
};
