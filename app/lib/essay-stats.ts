import type { SubjectFilter } from "./quiz-filters";

/**
 * 申論考點章節層級歷屆統計（public/data/essay-issue-stats.json）。
 * 只做「章節層級」統計；葉節點繁中名稱與真人複核完成前不發布葉節點排行。
 * 統計把已收錄歷屆題目的主要＋次要爭點合併計章，同題同章只計一次、同年多題只計一個出現年度。
 */
export type EssayStatMatch = "primary" | "secondary";

export type EssayStatQuestion = {
  id: string;
  number?: number;
  source: string;
  sourceUrl: string;
  gist: string;
  match: EssayStatMatch;
};

export type EssayStatYear = {
  year: number;
  questions: EssayStatQuestion[];
};

export type EssayStatChapter = {
  chapter: string;
  label: string;
  questionsByYear: EssayStatYear[];
};

export type EssayStatSubject = {
  key: string;
  subject: SubjectFilter;
  label: string;
  examLabel: string;
  years: number[];
  essayCountsByYear: Record<string, number>;
  chapters: EssayStatChapter[];
};

export type EssayIssueStats = {
  version: number;
  reviewStatus: "draft";
  note: string;
  subjects: EssayStatSubject[];
};

let statsCache: EssayIssueStats | null = null;

/** 載入申論考點統計（fetch 一次後全站共用；失敗時拋出讓呼叫端顯示錯誤）。 */
export async function loadEssayIssueStats(): Promise<EssayIssueStats> {
  if (statsCache) return statsCache;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const response = await fetch(`${basePath}/data/essay-issue-stats.json`);
  if (!response.ok) throw new Error(`essay issue stats ${response.status}`);
  statsCache = (await response.json()) as EssayIssueStats;
  return statsCache;
}

export type EssaySortKey = "coverage" | "questions";

/** 單一章節考點在選取年度範圍內的統計列（分子／分母皆隨範圍重算）。 */
export type EssayChapterRow = {
  chapter: string;
  label: string;
  /** 出現過該章節考點的年度數（分子）。 */
  yearCoverage: number;
  /** 收錄年度數（分母）。 */
  totalYears: number;
  coverageRatio: number;
  /** 標有該章節考點的題目數（分子）。 */
  questionCount: number;
  /** 收錄申論題總數（分母）。 */
  totalEssays: number;
  questionRatio: number;
  /** 出現年度（由小到大）。 */
  years: number[];
  latestYear: number | null;
  /** 主要爭點題數（供日後分開統計；第一版占比仍以主＋次合併計）。 */
  primaryCount: number;
  secondaryCount: number;
  questionsByYear: EssayStatYear[];
};

/** 選取年度範圍內的科目統計（收錄年度、收錄題數皆隨範圍重算）。 */
export type EssaySubjectView = {
  totalYears: number;
  totalEssays: number;
  years: number[];
  rows: EssayChapterRow[];
};

function inRange(year: number, fromYear: number, toYear: number): boolean {
  return year >= fromYear && year <= toYear;
}

/**
 * 依選取年度範圍與排序鍵，計算某科目各章節考點的統計列。
 * 年度覆蓋率＝出現年度數 ÷ 收錄年度數；題目占比＝標記題數 ÷ 收錄申論題數，兩者的分母都限縮在選取範圍內。
 */
export function deriveSubjectView(
  subject: EssayStatSubject,
  fromYear: number,
  toYear: number,
  sortKey: EssaySortKey,
): EssaySubjectView {
  const years = subject.years.filter((year) => inRange(year, fromYear, toYear));
  const totalYears = years.length;
  const totalEssays = years.reduce(
    (sum, year) => sum + (subject.essayCountsByYear[year] ?? 0),
    0,
  );

  const rows: EssayChapterRow[] = subject.chapters
    .map((chapter) => {
      const questionsByYear = chapter.questionsByYear.filter((entry) =>
        inRange(entry.year, fromYear, toYear),
      );
      const appearedYears = questionsByYear.map((entry) => entry.year);
      const allQuestions = questionsByYear.flatMap((entry) => entry.questions);
      const yearCoverage = appearedYears.length;
      const questionCount = allQuestions.length;
      return {
        chapter: chapter.chapter,
        label: chapter.label,
        yearCoverage,
        totalYears,
        coverageRatio: totalYears > 0 ? yearCoverage / totalYears : 0,
        questionCount,
        totalEssays,
        questionRatio: totalEssays > 0 ? questionCount / totalEssays : 0,
        years: appearedYears,
        latestYear: appearedYears.length ? Math.max(...appearedYears) : null,
        primaryCount: allQuestions.filter((question) => question.match === "primary").length,
        secondaryCount: allQuestions.filter((question) => question.match === "secondary").length,
        questionsByYear,
      };
    })
    .filter((row) => row.questionCount > 0);

  rows.sort((left, right) => {
    if (sortKey === "questions") {
      return (
        right.questionCount - left.questionCount ||
        right.yearCoverage - left.yearCoverage ||
        (right.latestYear ?? 0) - (left.latestYear ?? 0) ||
        left.label.localeCompare(right.label)
      );
    }
    return (
      right.coverageRatio - left.coverageRatio ||
      right.questionCount - left.questionCount ||
      (right.latestYear ?? 0) - (left.latestYear ?? 0) ||
      left.label.localeCompare(right.label)
    );
  });

  return { totalYears, totalEssays, years, rows };
}

/** 以百分比整數呈現（統計卡與排行共用）。 */
export function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}
