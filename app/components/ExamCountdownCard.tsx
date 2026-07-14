"use client";

import { useState } from "react";
import { localDateKey } from "../lib/progress-store";

/**
 * 考試倒數與讀書節奏：目標日期存於 v3 progress（隨匯出匯入），
 * 建議題數＝剩餘未完成官方題 ÷ 剩餘天數（無條件進位），只做頁面顯示、不發通知。
 */
export function ExamCountdownCard({
  examDate,
  remainingQuestions,
  onSet,
  onClear,
}: {
  examDate?: string;
  remainingQuestions: number;
  onSet: (date: string) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState("");
  const todayKey = localDateKey(new Date());

  if (!examDate) {
    return (
      <section className="sidebar-card exam-countdown" aria-label="考試倒數">
        <p className="eyebrow">考試倒數</p>
        <span>設定目標考試日期，計算每日建議題數</span>
        <div className="exam-countdown-form">
          <input
            type="date"
            aria-label="目標考試日期"
            min={todayKey}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="button" disabled={!draft || draft < todayKey} onClick={() => onSet(draft)}>
            設定
          </button>
        </div>
      </section>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.round((Date.parse(examDate) - Date.parse(todayKey)) / (24 * 60 * 60 * 1000)),
  );
  const dailySuggestion = Math.ceil(remainingQuestions / Math.max(1, daysLeft));

  return (
    <section className="sidebar-card exam-countdown" aria-label="考試倒數">
      <p className="eyebrow">考試倒數</p>
      <strong>{daysLeft} 天</strong>
      <span>距離 {examDate}</span>
      <p className="exam-countdown-pace">
        剩餘 {remainingQuestions} 題官方題，每日建議 {dailySuggestion} 題
      </p>
      <div className="exam-countdown-actions">
        <button type="button" onClick={onClear}>清除</button>
      </div>
    </section>
  );
}
