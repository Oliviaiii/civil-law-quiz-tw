"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "../data/questions";
import type { MockExamState } from "../lib/mock-exam";

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** 進行中的模擬考：倒數計時、答題卡、不即時判分的作答卡。 */
export function MockExamSession({
  exam,
  questions,
  onSelect,
  onJump,
  onSubmit,
}: {
  exam: MockExamState;
  questions: (Question | undefined)[];
  onSelect: (id: string, index: number) => void;
  onJump: (cursor: number) => void;
  onSubmit: (auto: boolean) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);
  const deadline = Date.parse(exam.deadlineAt);

  // 剩餘時間以本機截止時間重新計算；到期自動交卷（僅觸發一次）。
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !expiredRef.current) {
        expiredRef.current = true;
        onSubmit(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSubmit 由父層固定提供
  }, [deadline]);

  const current = questions[exam.cursor];
  const answeredCount = Object.keys(exam.answers).length;
  const unansweredCount = exam.ids.length - answeredCount;
  const remaining = deadline - now;

  function handleSubmit() {
    if (unansweredCount > 0) {
      const confirmed = window.confirm(`尚有 ${unansweredCount} 題未作答，確定要交卷嗎？`);
      if (!confirmed) return;
    }
    onSubmit(false);
  }

  return (
    <div className="mock-session">
      <div className="mock-session-bar" aria-label="模擬考狀態">
        <div>
          <strong>模擬考進行中</strong>
          <span>{exam.label}</span>
        </div>
        <div className="mock-session-stats">
          <span className={remaining < 5 * 60_000 ? "mock-time warning" : "mock-time"}>
            剩餘 {formatRemaining(remaining)}
          </span>
          <span>已答 {answeredCount} / {exam.ids.length}</span>
          <button type="button" onClick={handleSubmit}>交卷</button>
        </div>
      </div>

      <div className="mock-answer-sheet" aria-label="答題卡">
        {exam.ids.map((id, index) => {
          const answered = exam.answers[id] !== undefined;
          const isCurrent = index === exam.cursor;
          return (
            <button
              key={id}
              type="button"
              className={`sheet-cell ${answered ? "answered" : ""} ${isCurrent ? "current" : ""}`}
              onClick={() => onJump(index)}
              aria-label={`第 ${index + 1} 題${answered ? "（已作答）" : "（未作答）"}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      {current ? (
        <article className="question-card mock-question">
          <div className="question-meta">
            <div>
              <span className="tag category">{current.exam}</span>
              <span className="tag type">{current.subjectLabel}</span>
              {current.rocYear && <span className="tag year">民國 {current.rocYear} 年</span>}
            </div>
            <span className="question-number">第 {exam.cursor + 1} / {exam.ids.length} 題</span>
          </div>

          {current.passage && (
            <section className="passage-box" aria-label="共用文章">
              <p className="eyebrow">PASSAGE</p>
              <p>{current.passage}</p>
            </section>
          )}
          <h2>{current.prompt}</h2>
          <p className="instruction">作答期間不顯示答案與解析，可隨時修改選擇，交卷後統一判分。</p>
          <div className="options">
            {current.options.map((option, index) => {
              const selected = exam.answers[current.id] === index;
              return (
                <button
                  key={`${index}-${option}`}
                  className={`option ${selected ? "mock-selected" : ""}`}
                  onClick={() => onSelect(current.id, index)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                  {selected && <b>已選</b>}
                </button>
              );
            })}
          </div>

          <footer className="question-footer">
            <button onClick={() => onJump(exam.cursor - 1)} disabled={exam.cursor === 0}>
              ← 上一題
            </button>
            <button
              className="next-button"
              onClick={() => onJump(exam.cursor + 1)}
              disabled={exam.cursor === exam.ids.length - 1}
            >
              下一題 →
            </button>
          </footer>
        </article>
      ) : (
        <div className="empty-state" aria-live="polite">
          <span>…</span>
          <h2>題庫載入中</h2>
          <p>正在載入模擬考需要的科目題庫。</p>
        </div>
      )}
    </div>
  );
}
