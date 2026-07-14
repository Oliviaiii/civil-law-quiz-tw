"use client";

import { MultiSelectFilter } from "./MultiSelectFilter";
import taxonomyJson from "../data/taxonomy/taxonomy.json";
import {
  corpusOptions,
  questionYears,
  subjectLabels,
  subjectOptions,
  type Corpus,
  type FormatFilter,
  type Scope,
  type SubjectFilter,
} from "../lib/quiz-filters";

// 各科章節 taxonomy；只有列在此檔的科目開放章節篩選（分類完成前不對外宣稱可篩）。
const taxonomy = taxonomyJson as Partial<
  Record<SubjectFilter, { label: string; chapters: string[] }>
>;

/** 題目篩選列：作答範圍、科目、來源、題型、年度與一鍵清除。 */
export function FiltersBar({
  scope,
  subjects,
  corpora,
  format,
  years,
  categories,
  matchCount,
  hasActiveFilters,
  shuffleOptions,
  onScopeChange,
  onSubjectsChange,
  onCorporaChange,
  onFormatChange,
  onYearsChange,
  onCategoriesChange,
  onShuffleChange,
  onClearFilters,
}: {
  scope: Scope;
  subjects: SubjectFilter[];
  corpora: Corpus[];
  format: FormatFilter;
  years: number[];
  categories: string[];
  matchCount: number;
  hasActiveFilters: boolean;
  shuffleOptions: boolean;
  onScopeChange: (scope: Scope) => void;
  onSubjectsChange: (subjects: SubjectFilter[]) => void;
  onCorporaChange: (corpora: Corpus[]) => void;
  onFormatChange: (format: FormatFilter) => void;
  onYearsChange: (years: number[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  onShuffleChange: (enabled: boolean) => void;
  onClearFilters: () => void;
}) {
  // 章節篩選只在單一科目且該科 taxonomy 已完成時顯示。
  const chapterConfig = subjects.length === 1 ? taxonomy[subjects[0]] : undefined;
  const categorySummary = categories.length === 0
    ? "全部章節"
    : categories.length === 1
      ? categories[0]
      : `已選 ${categories.length} 章節`;
  const subjectSummary = subjects.length === 0
    ? "全部科目"
    : subjects.length <= 2
      ? subjects.map((subject) => subjectLabels[subject]).join("＋")
      : `已選 ${subjects.length} 科`;
  const corpusSummary = corpora.length === 0
    ? "全部來源"
    : corpora.length === 1
      ? corpora[0]
      : `已選 ${corpora.length} 個來源`;
  const yearSummary = years.length === 0
    ? "全部年度"
    : years.length === 1
      ? `${years[0]} 年`
      : `已選 ${years.length} 年`;

  return (
    <div className="filters" aria-label="題目篩選">
      <div className="segmented">
        {(
          [
            ["all", "全部"],
            ["unanswered", "未作答"],
            ["wrong", "曾答錯"],
            ["due", "到期複習"],
            ["starred", "收藏"],
            ["uncertain", "不確定"],
          ] as [Scope, string][]
        ).map(([item, label]) => (
          <button
            key={item}
            className={scope === item ? "selected" : ""}
            onClick={() => onScopeChange(item)}
          >
            {label}
          </button>
        ))}
      </div>
      <MultiSelectFilter
        ariaLabel="依科目複選篩選"
        allLabel="全部科目"
        options={subjectOptions}
        selected={subjects}
        summary={subjectSummary}
        onChange={onSubjectsChange}
      />
      <MultiSelectFilter
        ariaLabel="依題庫來源複選篩選"
        className="corpus-filter"
        allLabel="全部來源"
        options={corpusOptions}
        selected={corpora}
        summary={corpusSummary}
        onChange={onCorporaChange}
      />
      <label>
        <span className="sr-only">依題型篩選</span>
        <select
          value={format}
          onChange={(event) => onFormatChange(event.target.value as FormatFilter)}
        >
          <option>選擇題</option>
          <option>申論題</option>
          <option>全部題型</option>
        </select>
      </label>
      <MultiSelectFilter
        ariaLabel="依年度複選篩選"
        className="year-filter"
        allLabel="全部年度"
        options={questionYears.map((year) => ({ value: year, label: `${year} 年` }))}
        selected={years}
        summary={yearSummary}
        onChange={onYearsChange}
      />
      {chapterConfig && (
        <MultiSelectFilter
          ariaLabel="依章節複選篩選"
          className="chapter-filter"
          allLabel="全部章節"
          options={chapterConfig.chapters.map((chapter) => ({ value: chapter, label: chapter }))}
          selected={categories}
          summary={categorySummary}
          onChange={onCategoriesChange}
        />
      )}
      <label className="shuffle-toggle" title="含「以上皆是」等順序敏感選項的題目不會亂序">
        <input
          type="checkbox"
          checked={shuffleOptions}
          onChange={(event) => onShuffleChange(event.target.checked)}
        />
        <span>選項亂序</span>
      </label>
      <span className="filter-count">符合 {matchCount} 題</span>
      <button
        type="button"
        className="clear-filters"
        onClick={onClearFilters}
        disabled={!hasActiveFilters}
        title="只清除篩選條件，不會刪除作答紀錄"
      >
        清除所有篩選
      </button>
    </div>
  );
}
