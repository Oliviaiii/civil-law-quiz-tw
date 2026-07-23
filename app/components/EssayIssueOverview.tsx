"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubjectFilter } from "../lib/quiz-filters";
import {
  deriveSubjectView,
  loadEssayIssueStats,
  toPercent,
  type EssayIssueStats,
  type EssaySortKey,
  type EssayStatSubject,
} from "../lib/essay-stats";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; stats: EssayIssueStats };

/**
 * 申論考點總覽：以章節層級呈現歷屆出題率排行與年度分布。
 * 統計只描述「已收錄歷屆官方題目考過什麼、出現在哪些年度」，不是未來命題預測。
 */
export function EssayIssueOverview({
  onOpenQuestion,
}: {
  onOpenQuestion: (questionId: string, subject: SubjectFilter) => void;
}) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [subjectKey, setSubjectKey] = useState<string | null>(null);
  const [fromYear, setFromYear] = useState<number | null>(null);
  const [toYear, setToYear] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<EssaySortKey>("coverage");
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadEssayIssueStats()
      .then((stats) => {
        if (!active) return;
        setLoad({ status: "ready", stats });
        const first = stats.subjects[0];
        if (first) {
          setSubjectKey(first.key);
          setFromYear(first.years[0]);
          setToYear(first.years[first.years.length - 1]);
        }
      })
      .catch(() => {
        if (active) setLoad({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  const subject: EssayStatSubject | null = useMemo(() => {
    if (load.status !== "ready") return null;
    return load.stats.subjects.find((item) => item.key === subjectKey) ?? load.stats.subjects[0] ?? null;
  }, [load, subjectKey]);

  function selectSubject(next: EssayStatSubject) {
    setSubjectKey(next.key);
    setFromYear(next.years[0]);
    setToYear(next.years[next.years.length - 1]);
    setOpenChapter(null);
  }

  const view = useMemo(() => {
    if (!subject || fromYear === null || toYear === null) return null;
    const low = Math.min(fromYear, toYear);
    const high = Math.max(fromYear, toYear);
    return deriveSubjectView(subject, low, high, sortKey);
  }, [subject, fromYear, toYear, sortKey]);

  if (load.status === "loading") {
    return (
      <div className="essay-overview" aria-busy="true">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ESSAY TOPICS</p>
            <h1>申論考點總覽</h1>
          </div>
        </div>
        <p className="essay-overview-note">正在載入本站整理的申論考點統計…</p>
      </div>
    );
  }

  if (load.status === "error" || !subject || !view || fromYear === null || toYear === null) {
    return (
      <div className="essay-overview">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ESSAY TOPICS</p>
            <h1>申論考點總覽</h1>
          </div>
        </div>
        <div className="empty-state" role="alert">
          <span>!</span>
          <h2>統計載入失敗</h2>
          <p>請確認網路連線後重試；本機作答紀錄不受影響。</p>
          <button onClick={() => window.location.reload()}>重試載入</button>
        </div>
      </div>
    );
  }

  const stats = load.stats;
  const rangeIsFull =
    fromYear === subject.years[0] && toYear === subject.years[subject.years.length - 1];

  return (
    <div className="essay-overview">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ESSAY TOPICS</p>
          <h1>申論考點總覽</h1>
          <p>
            以章節層級整理已收錄歷屆官方申論題的出題年度與題數；統計描述「考過什麼、出現在哪些年度」，
            <strong>不是未來命題預測</strong>。
          </p>
        </div>
        <span className="essay-review-badge">草稿統計・尚未人工複核</span>
      </div>

      <div className="essay-overview-toolbar">
        <div className="essay-overview-field">
          <span className="essay-overview-field-label">科目</span>
          <div className="segmented" role="group" aria-label="依科目切換">
            {stats.subjects.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === subject.key ? "selected" : ""}
                aria-pressed={item.key === subject.key}
                onClick={() => selectSubject(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="essay-overview-field">
          <span className="essay-overview-field-label">收錄年度範圍</span>
          <div className="essay-overview-years">
            <label>
              <span className="sr-only">起始年度</span>
              <select
                value={fromYear}
                aria-label="起始年度"
                onChange={(event) => {
                  setFromYear(Number(event.target.value));
                  setOpenChapter(null);
                }}
              >
                {subject.years.map((year) => (
                  <option key={year} value={year}>
                    {year} 年
                  </option>
                ))}
              </select>
            </label>
            <span aria-hidden="true">–</span>
            <label>
              <span className="sr-only">結束年度</span>
              <select
                value={toYear}
                aria-label="結束年度"
                onChange={(event) => {
                  setToYear(Number(event.target.value));
                  setOpenChapter(null);
                }}
              >
                {subject.years.map((year) => (
                  <option key={year} value={year}>
                    {year} 年
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="essay-overview-field">
          <span className="essay-overview-field-label">排序</span>
          <div className="segmented" role="group" aria-label="排序方式">
            <button
              type="button"
              className={sortKey === "coverage" ? "selected" : ""}
              aria-pressed={sortKey === "coverage"}
              onClick={() => setSortKey("coverage")}
            >
              年度覆蓋率
            </button>
            <button
              type="button"
              className={sortKey === "questions" ? "selected" : ""}
              aria-pressed={sortKey === "questions"}
              onClick={() => setSortKey("questions")}
            >
              出題題數
            </button>
          </div>
        </div>
      </div>

      <section className="essay-overview-scope" aria-label="目前資料範圍與統計公式">
        <p>
          <strong>資料範圍：</strong>
          {subject.label}・{subject.examLabel}・
          {view.totalYears > 0
            ? `${Math.min(fromYear, toYear)}–${Math.max(fromYear, toYear)} 年，共 ${view.totalYears} 個收錄年度、${view.totalEssays} 題申論題`
            : "選取範圍內尚無收錄年度"}
          {rangeIsFull ? "" : "（已依選取年度範圍重算分母）"}。
        </p>
        <p>
          <strong>歷屆出題年度覆蓋率＝</strong>出現過該章節考點的年度數 ÷ 該科目收錄年度數（同一年考兩題以上只計一個出現年度）。
        </p>
        <p>
          <strong>題目占比＝</strong>標有該章節考點的題目數 ÷ 該科目收錄申論題總數（同一題同章只計一次，主要＋次要爭點合併計；一題可同屬不同章節，故各章占比不會合計為 100%）。
        </p>
        <p className="essay-overview-disclaimer">
          歷屆統計不代表未來命題預測；資料為草稿統計，尚未經真人法律複核。其他考試尚未匯入，數字不代表所有國考的整體趨勢。
        </p>
      </section>

      {view.rows.length === 0 ? (
        <p className="essay-overview-note">選取的年度範圍內尚無已整理的申論考點。</p>
      ) : (
        <ol className="essay-ranking" aria-label={`${subject.label}申論考點排行`}>
          {view.rows.map((row, index) => {
            const expanded = openChapter === row.chapter;
            const detailId = `essay-chapter-${subject.key}-${row.chapter}`;
            return (
              <li key={row.chapter} className={expanded ? "expanded" : ""}>
                <button
                  type="button"
                  className="essay-ranking-row"
                  aria-expanded={expanded}
                  aria-controls={detailId}
                  onClick={() => setOpenChapter(expanded ? null : row.chapter)}
                >
                  <span className="essay-ranking-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="essay-ranking-main">
                    <strong>{row.label}</strong>
                    <small>
                      {row.years.length > 0
                        ? `出現年度：${row.years.join("、")} 年${row.latestYear ? `・最近出題 ${row.latestYear} 年` : ""}`
                        : "選取範圍內未出現"}
                    </small>
                  </span>
                  <span className="essay-ranking-metric">
                    <b>歷屆出題率 {toPercent(row.coverageRatio)}%</b>
                    <small>
                      年度覆蓋 {row.yearCoverage}／{row.totalYears} 年・題目 {row.questionCount}／{row.totalEssays} 題（
                      {toPercent(row.questionRatio)}%）
                    </small>
                  </span>
                  <span className="essay-ranking-caret" aria-hidden="true">
                    {expanded ? "▾" : "▸"}
                  </span>
                </button>

                {expanded && (
                  <div className="essay-ranking-detail" id={detailId}>
                    <p className="essay-ranking-detail-summary">
                      {row.label}在 {Math.min(fromYear, toYear)}–{Math.max(fromYear, toYear)} 年間，
                      {row.totalYears} 個收錄年度中有 {row.yearCoverage} 年出現，共 {row.questionCount} 題
                      （主要爭點 {row.primaryCount} 題、次要爭點 {row.secondaryCount} 題）。點題目即可切換到練習模式核對原題。
                    </p>
                    <ul className="essay-ranking-years">
                      {row.questionsByYear.map((entry) => (
                        <li key={entry.year}>
                          <p className="essay-ranking-year">{entry.year} 年（{entry.questions.length} 題）</p>
                          <ul>
                            {entry.questions.map((question) => (
                              <li key={question.id}>
                                <button
                                  type="button"
                                  onClick={() => onOpenQuestion(question.id, subject.subject)}
                                >
                                  <span className="essay-ranking-question-heading">
                                    <strong>
                                      {question.match === "primary" ? "主要爭點" : "次要爭點"}・前往題目
                                    </strong>
                                    <span>{question.source}</span>
                                  </span>
                                  <p>{question.gist}</p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                    <p className="essay-ranking-detail-note">
                      此處是歷屆題目的整理標籤，不是官方擬答，也不代表未來命題預測。
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
