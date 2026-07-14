"use client";

import { useState } from "react";
import type { Question } from "../data/questions";
import { isMockEligible } from "../lib/mock-exam";
import { MultiSelectFilter } from "./MultiSelectFilter";
import {
  questionYears,
  subjectLabels,
  subjectOptions,
  type SubjectFilter,
} from "../lib/quiz-filters";

const SIZE_PRESETS = [10, 25, 50];
const DURATION_PRESETS = [15, 30, 60, 90];

/** 模擬考設定：科目、年度、題數與考試時間。 */
export function MockExamSetup({
  questions,
  loading,
  onStart,
}: {
  questions: Question[];
  loading: boolean;
  onStart: (pool: Question[], size: number, durationMinutes: number, label: string) => void;
}) {
  const [subjects, setSubjects] = useState<SubjectFilter[]>(["civil-law"]);
  const [years, setYears] = useState<number[]>([]);
  const [presetSize, setPresetSize] = useState(25);
  const [customSize, setCustomSize] = useState("");
  const [duration, setDuration] = useState(30);

  const pool = questions.filter(
    (question) =>
      isMockEligible(question) &&
      (subjects.length === 0 || subjects.includes(question.subject)) &&
      (years.length === 0 || (question.rocYear !== undefined && years.includes(question.rocYear))),
  );
  const requestedSize = customSize ? Number.parseInt(customSize, 10) : presetSize;
  const validSize = Number.isFinite(requestedSize) && requestedSize >= 1;
  const actualSize = validSize ? Math.min(requestedSize, pool.length) : 0;

  const subjectSummary = subjects.length === 0
    ? "全部科目"
    : subjects.length <= 2
      ? subjects.map((subject) => subjectLabels[subject]).join("＋")
      : `已選 ${subjects.length} 科`;
  const yearSummary = years.length === 0
    ? "全部年度"
    : years.length === 1
      ? `${years[0]} 年`
      : `已選 ${years.length} 年`;

  function start() {
    if (!pool.length || !validSize) return;
    const label = `${subjectSummary}｜${yearSummary}｜${actualSize} 題｜${duration} 分鐘`;
    onStart(pool, requestedSize, duration, label);
  }

  return (
    <div className="mock-setup">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MOCK EXAM</p>
          <h1>選擇題模擬考</h1>
          <p>只納入有官方答案的選擇題；作答期間不顯示答案與解析，交卷後統一判分。</p>
        </div>
      </div>

      <div className="mock-setup-form">
        <div className="practice-set-field">
          <span>科目與年度</span>
          <div className="mock-setup-filters">
            <MultiSelectFilter
              ariaLabel="模擬考科目"
              allLabel="全部科目"
              options={subjectOptions}
              selected={subjects}
              summary={subjectSummary}
              onChange={setSubjects}
            />
            <MultiSelectFilter
              ariaLabel="模擬考年度"
              allLabel="全部年度"
              options={questionYears.map((year) => ({ value: year, label: `${year} 年` }))}
              selected={years}
              summary={yearSummary}
              onChange={setYears}
            />
            <span className="filter-count">
              {loading ? "題庫載入中…" : `可抽 ${pool.length} 題`}
            </span>
          </div>
        </div>

        <div className="practice-set-field">
          <span>題數</span>
          <div className="segmented">
            {SIZE_PRESETS.map((size) => (
              <button
                key={size}
                type="button"
                className={!customSize && presetSize === size ? "selected" : ""}
                onClick={() => {
                  setPresetSize(size);
                  setCustomSize("");
                }}
              >
                {size} 題
              </button>
            ))}
            <input
              type="number"
              min={1}
              placeholder="自訂"
              aria-label="自訂模擬考題數"
              value={customSize}
              onChange={(event) => setCustomSize(event.target.value)}
            />
          </div>
        </div>

        <div className="practice-set-field">
          <span>考試時間</span>
          <div className="segmented">
            {DURATION_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={duration === minutes ? "selected" : ""}
                onClick={() => setDuration(minutes)}
              >
                {minutes} 分鐘
              </button>
            ))}
          </div>
        </div>

        <p className="mock-scoring-note">
          配分規則（自訂）：滿分 100 平均分配，每題 {actualSize > 0 ? (100 / actualSize).toFixed(1) : "—"} 分。
          答對得分；官方一律給分題一律得分；官方公告複數答案任一皆得分；未作答與答錯不得分、不倒扣。
          計時使用本機時間，重新整理後依截止時間繼續倒數。
        </p>
        {validSize && pool.length > 0 && pool.length < requestedSize && (
          <p className="practice-set-note">目前條件只有 {pool.length} 題，將全部納入。</p>
        )}

        <button
          type="button"
          className="practice-set-start"
          disabled={loading || pool.length === 0 || !validSize}
          onClick={start}
        >
          開始模擬考
        </button>
      </div>
    </div>
  );
}
