import type { Question, Subject } from "../data/questions";

export { questionYears } from "../data/bank-manifest";

export type View = "about" | "practice" | "wrong" | "mock" | "law" | "stats";
export type Scope = "all" | "unanswered" | "wrong" | "due" | "starred" | "uncertain";
export type Corpus = "司法特考四等" | "示範題";
export type FormatFilter = "選擇題" | "申論題" | "全部題型";
export type SubjectFilter = Subject;

export const subjectLabels: Record<SubjectFilter, string> = {
  "civil-law": "民法",
  "criminal-law": "刑法",
  constitution: "憲法",
  "legal-introduction": "法學緒論",
  english: "英文",
  chinese: "國文",
  "administrative-law": "行政法概要",
  "civil-procedure": "民事訴訟法概要",
  "criminal-procedure": "刑事訴訟法概要",
};

export const subjectOptions: { value: SubjectFilter; label: string }[] = [
  { value: "chinese", label: "國文" },
  { value: "civil-law", label: "民法" },
  { value: "criminal-law", label: "刑法" },
  { value: "administrative-law", label: "行政法概要" },
  { value: "civil-procedure", label: "民事訴訟法概要" },
  { value: "criminal-procedure", label: "刑事訴訟法概要" },
  { value: "constitution", label: "憲法" },
  { value: "legal-introduction", label: "法學緒論" },
  { value: "english", label: "英文" },
];

export const corpusOptions: { value: Corpus; label: string }[] = [
  { value: "司法特考四等", label: "司法特考四等" },
  { value: "示範題", label: "示範題" },
];

export const viewLabels: Record<View, string> = {
  about: "網站介紹",
  practice: "開始練習",
  wrong: "錯題本",
  mock: "模擬考",
  law: "法條速查",
  stats: "學習紀錄",
};

export type FilterState = {
  view: View;
  scope: Scope;
  subjects: SubjectFilter[];
  corpora: Corpus[];
  format: FormatFilter;
  years: number[];
  /** 章節篩選；只在單一科目且該科 taxonomy 完成時由 UI 開放。 */
  categories: string[];
};

export type FilterContext = {
  answeredIds: string[];
  wrongIds: string[];
  /** 間隔複習到期（今日到期＋逾期）的題目 id。 */
  dueIds: string[];
  /** 收藏的題目 id。 */
  starredIds: string[];
  /** 標記不確定的題目 id。 */
  uncertainIds: string[];
  reviewingId: string | null;
};

/** 依目前篩選條件計算可見題目；reviewingId 讓剛作答的題目留在畫面上。 */
export function filterQuestions(
  allQuestions: Question[],
  state: FilterState,
  context: FilterContext,
): Question[] {
  const { view, scope, subjects, corpora, format, years, categories } = state;
  const { answeredIds, wrongIds, dueIds, starredIds, uncertainIds, reviewingId } = context;
  return allQuestions.filter((question) => {
    const categoryMatch = categories.length === 0 || categories.includes(question.category);
    if (!categoryMatch) return false;
    const corpusMatch =
      corpora.length === 0 ||
      (corpora.includes("司法特考四等") && question.exam === "司法特考四等") ||
      (corpora.includes("示範題") && !question.exam);
    const subjectMatch = subjects.length === 0 || subjects.includes(question.subject);
    const formatMatch = format === "全部題型" || question.format === format;
    const yearMatch =
      years.length === 0 || (question.rocYear !== undefined && years.includes(question.rocYear));
    const scopeMatch =
      scope === "all" ||
      (scope === "unanswered" &&
        (!answeredIds.includes(question.id) || question.id === reviewingId)) ||
      (scope === "wrong" && (wrongIds.includes(question.id) || question.id === reviewingId)) ||
      (scope === "due" && (dueIds.includes(question.id) || question.id === reviewingId)) ||
      (scope === "starred" && (starredIds.includes(question.id) || question.id === reviewingId)) ||
      (scope === "uncertain" && (uncertainIds.includes(question.id) || question.id === reviewingId));
    const viewMatch =
      view !== "wrong" || wrongIds.includes(question.id) || question.id === reviewingId;
    return subjectMatch && corpusMatch && formatMatch && yearMatch && scopeMatch && viewMatch;
  });
}
