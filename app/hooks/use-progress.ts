"use client";

import { useEffect, useMemo, useState } from "react";
import type { Question } from "../data/questions";
import {
  createEmptyProgress,
  loadProgress,
  localDateKey,
  saveProgress,
  type ProgressData,
  type QuestionFlags,
} from "../lib/progress-store";
import { nextDueAt } from "../lib/spaced-repetition";

/**
 * 作答進度：載入／保存 localStorage、記錄作答，並提供錯題與答對率等衍生資料。
 */
export function useProgress() {
  const [progress, setProgress] = useState<ProgressData>(createEmptyProgress());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProgress(loadProgress());
      setReady(true);
      // 供瀏覽器互動測試等待 hydration 完成，避免點擊落在事件綁定之前。
      document.documentElement.dataset.appReady = "true";
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (ready) saveProgress(progress);
  }, [progress, ready]);

  const answeredIds = useMemo(() => Object.keys(progress.answers), [progress]);
  // 申論題標記閱讀時 lastSelected 記為 -1，因此不需載入全部題庫
  // 即可從紀錄本身區分選擇題與申論題。
  const answeredMultipleChoiceIds = answeredIds.filter(
    (id) => progress.answers[id].lastSelected >= 0,
  );
  const wrongIds = useMemo(
    () =>
      Object.entries(progress.answers)
        .filter(([, answer]) => !answer.lastCorrect)
        .map(([id]) => id),
    [progress],
  );
  const correctCount = answeredMultipleChoiceIds.filter(
    (id) => progress.answers[id]?.lastCorrect,
  ).length;
  const accuracy = answeredMultipleChoiceIds.length
    ? Math.round((correctCount / answeredMultipleChoiceIds.length) * 100)
    : 0;
  // 所有作答嘗試的正確率：以 attempts 與 wrongCount 統計，
  // 不保存逐次作答歷程（v3 之前的紀錄以最後結果近似）。
  const attemptTotals = answeredMultipleChoiceIds.reduce(
    (totals, id) => {
      const answer = progress.answers[id];
      const wrong = answer.wrongCount ?? (answer.lastCorrect ? 0 : answer.attempts);
      totals.attempts += answer.attempts;
      totals.wrong += Math.min(wrong, answer.attempts);
      return totals;
    },
    { attempts: 0, wrong: 0 },
  );
  const attemptAccuracy = attemptTotals.attempts
    ? Math.round(((attemptTotals.attempts - attemptTotals.wrong) / attemptTotals.attempts) * 100)
    : 0;

  /** 每日作答計數（熱力圖與讀書節奏使用）。 */
  function withTodayCount(previous: ProgressData): ProgressData["daily"] {
    const today = localDateKey(new Date());
    return { ...previous.daily, [today]: (previous.daily[today] ?? 0) + 1 };
  }

  /** 記錄選擇題作答並回寫最後一次選擇、正誤、連續答對與答錯次數。 */
  function recordAnswer(question: Question, selectedIndex: number) {
    const isCorrect = Boolean(
      question.allCredit ||
        (question.acceptedAnswers?.length
          ? question.acceptedAnswers.includes(selectedIndex)
          : selectedIndex === question.answer),
    );
    setProgress((previous) => {
      const oldAnswer = previous.answers[question.id];
      const now = new Date();
      const correctStreak = isCorrect ? (oldAnswer?.correctStreak ?? 0) + 1 : 0;
      return {
        ...previous,
        answers: {
          ...previous.answers,
          [question.id]: {
            ...oldAnswer,
            attempts: (oldAnswer?.attempts ?? 0) + 1,
            lastSelected: selectedIndex,
            lastCorrect: isCorrect,
            lastAnsweredAt: now.toISOString(),
            correctStreak,
            wrongCount: (oldAnswer?.wrongCount ?? 0) + (isCorrect ? 0 : 1),
            // 間隔複習：答錯明天到期，連續答對依固定間隔延後。
            lastReviewedAt: now.toISOString(),
            dueAt: nextDueAt(correctStreak, isCorrect, now),
          },
        },
        daily: withTodayCount(previous),
      };
    });
  }

  /** 申論題標記已閱讀。 */
  function recordEssayRead(question: Question) {
    setProgress((previous) => {
      const oldAnswer = previous.answers[question.id];
      return {
        ...previous,
        answers: {
          ...previous.answers,
          [question.id]: {
            ...oldAnswer,
            attempts: (oldAnswer?.attempts ?? 0) + 1,
            lastSelected: -1,
            lastCorrect: true,
            lastAnsweredAt: new Date().toISOString(),
          },
        },
        daily: withTodayCount(previous),
      };
    });
  }

  /** 更新收藏／不確定／筆記；全空的紀錄自動移除。 */
  function updateFlags(id: string, patch: Partial<QuestionFlags>) {
    setProgress((previous) => {
      const merged: QuestionFlags = { ...previous.flags[id], ...patch };
      if (!merged.starred) delete merged.starred;
      if (!merged.uncertain) delete merged.uncertain;
      if (!merged.note?.trim()) delete merged.note;
      const flags = { ...previous.flags };
      if (Object.keys(merged).length > 0) flags[id] = merged;
      else delete flags[id];
      return { ...previous, flags };
    });
  }

  function toggleStarred(id: string) {
    updateFlags(id, { starred: !progress.flags[id]?.starred });
  }

  function toggleUncertain(id: string) {
    updateFlags(id, { uncertain: !progress.flags[id]?.uncertain });
  }

  function saveNote(id: string, note: string) {
    updateFlags(id, { note });
  }

  /** 保存申論題草稿與練習用時；內容全空時移除該筆。 */
  function saveEssayDraft(id: string, draft: string, seconds: number) {
    setProgress((previous) => {
      const essays = { ...previous.essays };
      if (draft.trim() || seconds > 0) {
        essays[id] = { draft: draft.slice(0, 20000), seconds: Math.floor(seconds) };
      } else {
        delete essays[id];
      }
      return { ...previous, essays };
    });
  }

  /** 法條閃卡評分：與題目間隔複習共用 nextDueAt 到期規則。 */
  function gradeStatuteCard(key: string, remembered: boolean) {
    setProgress((previous) => {
      const oldCard = previous.statuteCards?.[key];
      const correctStreak = remembered ? (oldCard?.correctStreak ?? 0) + 1 : 0;
      const now = new Date();
      return {
        ...previous,
        statuteCards: {
          ...previous.statuteCards,
          [key]: {
            correctStreak,
            wrongCount: (oldCard?.wrongCount ?? 0) + (remembered ? 0 : 1),
            lastReviewedAt: now.toISOString(),
            dueAt: nextDueAt(correctStreak, remembered, now),
          },
        },
      };
    });
  }

  /** 設定或清除目標考試日期（YYYY-MM-DD；隨匯出匯入）。 */
  function setExamDate(date: string | undefined) {
    setProgress((previous) => ({ ...previous, examDate: date }));
  }

  /** 完成每日一題：同日只計一次；昨天有完成則 streak +1，否則歸 1。 */
  function completeDailyQuestion() {
    setProgress((previous) => {
      const today = localDateKey(new Date());
      if (previous.dailyQuestion?.lastCompletedDate === today) return previous;
      const yesterday = localDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const streak =
        previous.dailyQuestion?.lastCompletedDate === yesterday
          ? previous.dailyQuestion.streak + 1
          : 1;
      return { ...previous, dailyQuestion: { streak, lastCompletedDate: today } };
    });
  }

  return {
    progress,
    setProgress,
    ready,
    answeredIds,
    wrongIds,
    correctCount,
    accuracy,
    attemptAccuracy,
    recordAnswer,
    recordEssayRead,
    toggleStarred,
    toggleUncertain,
    saveNote,
    saveEssayDraft,
    completeDailyQuestion,
    setExamDate,
    gradeStatuteCard,
  };
}
