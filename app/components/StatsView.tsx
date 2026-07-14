"use client";

import type { Question } from "../data/questions";
import { totalQuestionCount } from "../data/bank-manifest";
import { ActivityHeatmap } from "./ActivityHeatmap";
import type { ProgressData } from "../lib/progress-store";
import { subjectLabels } from "../lib/quiz-filters";

/** 學習紀錄畫面：整體統計、分科分年度進度與本機資料備份。 */
export function StatsView({
  questions,
  progress,
  accuracy,
  attemptAccuracy,
  wrongCount,
  answeredCount,
  dueIds,
  onExport,
  onImport,
  onReset,
}: {
  questions: Question[];
  progress: ProgressData;
  accuracy: number;
  attemptAccuracy: number;
  wrongCount: number;
  answeredCount: number;
  dueIds: string[];
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}) {
  const dueSet = new Set(dueIds);
  const groups = [
    ...Object.entries(subjectLabels).flatMap(([subject, label]) =>
      Array.from(new Set(questions.flatMap((question) => question.rocYear ?? [])))
        .sort((a, b) => b - a)
        .map((year) => ({
          label: `${label}｜民國 ${year} 年`,
          questions: questions.filter(
            (question) => question.subject === subject && question.rocYear === year,
          ),
        }))
        .filter((group) => group.questions.length > 0),
    ),
    {
      label: "自行編寫示範題",
      questions: questions.filter((question) => !question.rocYear),
    },
  ];
  return (
    <div className="stats-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROGRESS</p>
          <h1>看見進度，也保留帶得走的紀錄</h1>
          <p>第一版資料存在瀏覽器，可隨時匯出備份。</p>
        </div>
      </div>

      <div className="stat-grid">
        <div><span>完成題數</span><strong>{answeredCount}<small> / {totalQuestionCount}</small></strong></div>
        <div><span>最後一次答對率</span><strong>{accuracy}<small>%</small></strong></div>
        <div><span>所有嘗試正確率</span><strong>{attemptAccuracy}<small>%</small></strong></div>
        <div><span>錯題待複習</span><strong>{wrongCount}<small> 題</small></strong></div>
      </div>
      <p className="stats-note">
        「最後一次答對率」只看每題最近一次作答；「所有嘗試正確率」把重作的每一次都算進去。
        統計只由本機進度計算，不保存逐次作答歷程，也不使用任何追蹤服務。
      </p>

      <ActivityHeatmap daily={progress.daily} />

      <section className="chapter-progress">
        <div className="section-title">
          <div><p className="eyebrow">依科目</p><h2>獨立學習進度</h2></div>
          <span>以每題最後一次作答為準</span>
        </div>
        {groups.map((group) => {
          const answered = group.questions.filter((question) => progress.answers[question.id]).length;
          const correct = group.questions.filter((question) => progress.answers[question.id]?.lastCorrect).length;
          const due = group.questions.filter((question) => dueSet.has(question.id)).length;
          return (
            <div className="chapter-row" key={group.label}>
              <strong>{group.label}</strong>
              <div className="chapter-track"><i style={{ width: `${(answered / group.questions.length) * 100}%` }} /></div>
              <span>{answered}/{group.questions.length} 完成・{correct} 對・{due} 待複習</span>
              <b>{answered ? Math.round((correct / answered) * 100) : 0}%</b>
            </div>
          );
        })}
      </section>

      <section className="data-card">
        <div>
          <p className="eyebrow">本機資料</p>
          <h2>備份與搬移學習紀錄</h2>
          <p>換電腦、換瀏覽器或清除網站資料前，先匯出 JSON。未來接上帳號同步時，這裡可換成雲端資料服務。</p>
        </div>
        <div className="data-actions">
          <button className="primary-action" onClick={onExport}>匯出紀錄</button>
          <button onClick={onImport}>匯入紀錄</button>
          <button className="danger-action" onClick={onReset}>清除全部</button>
        </div>
      </section>
    </div>
  );
}
