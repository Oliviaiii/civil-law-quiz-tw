"use client";

import type { Question } from "../data/questions";
import type { PracticeSetState } from "../lib/practice-set";
import type { ProgressData } from "../lib/progress-store";
import { QuestionCard } from "./QuestionCard";

/** 進行中的練習集：進度列＋固定順序的題目卡。 */
export function PracticeSetSession({
  practiceSet,
  questions,
  progress,
  loading,
  shuffleOptions,
  onChoose,
  onMarkRead,
  onMove,
  onLeave,
}: {
  practiceSet: PracticeSetState;
  questions: Question[];
  progress: ProgressData;
  loading: boolean;
  shuffleOptions?: boolean;
  onChoose: (index: number) => void;
  onMarkRead: () => void;
  onMove: (direction: 1 | -1) => void;
  onLeave: () => void;
}) {
  const total = practiceSet.ids.length;
  const remaining = total - practiceSet.completed.length;
  const current = questions[Math.min(practiceSet.cursor, questions.length - 1)];

  return (
    <>
      <div className="practice-set-bar" aria-label="練習集進度">
        <div>
          <strong>練習集進行中</strong>
          <span>{practiceSet.label}</span>
        </div>
        <div className="practice-set-stats">
          <span>第 {practiceSet.cursor + 1} / {total} 題</span>
          <span>剩餘 {remaining} 題</span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("要離開目前的練習集嗎？離開後需重新抽題才能再開始。")) {
                onLeave();
              }
            }}
          >
            離開練習集
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state" aria-live="polite">
          <span>…</span>
          <h2>題庫載入中</h2>
          <p>正在載入練習集需要的科目題庫。</p>
        </div>
      ) : current ? (
        <QuestionCard
          key={`set-${practiceSet.createdAt}-${current.id}`}
          question={current}
          position={practiceSet.cursor + 1}
          total={total}
          previousAnswer={progress.answers[current.id]}
          shuffleOptions={shuffleOptions}
          onChoose={onChoose}
          onMarkRead={onMarkRead}
          onMove={onMove}
        />
      ) : (
        <div className="empty-state">
          <span>!</span>
          <h2>練習集題目載入不完整</h2>
          <p>題庫內容可能已更新，建議離開後重新建立練習集。</p>
          <button onClick={onLeave}>離開練習集</button>
        </div>
      )}
    </>
  );
}
