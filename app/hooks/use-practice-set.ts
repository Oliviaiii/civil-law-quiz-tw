"use client";

import { useEffect, useState } from "react";
import type { Question } from "../data/questions";
import {
  loadPracticeSet,
  savePracticeSet,
  shuffleIds,
  type PracticeSetState,
} from "../lib/practice-set";
import type { SubjectFilter } from "../lib/quiz-filters";

/** 自訂練習集：建立、續作、換題與完成度追蹤，狀態保存於 localStorage。 */
export function usePracticeSet() {
  const [practiceSet, setPracticeSet] = useState<PracticeSetState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPracticeSet(loadPracticeSet());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (ready) savePracticeSet(practiceSet);
  }, [practiceSet, ready]);

  /** 從題目池抽出練習集；池子小於題數時全部納入（不重複抽題）。回傳實際題數。 */
  function createSet(pool: Question[], size: number, label: string): number {
    const ids = shuffleIds(pool.map((question) => question.id)).slice(0, size);
    const subjects = Array.from(new Set(pool.map((question) => question.subject))) as SubjectFilter[];
    setPracticeSet({
      version: 1,
      label,
      ids,
      subjects,
      cursor: 0,
      completed: [],
      createdAt: new Date().toISOString(),
    });
    return ids.length;
  }

  function leaveSet() {
    setPracticeSet(null);
  }

  function moveCursor(direction: 1 | -1) {
    setPracticeSet((previous) => {
      if (!previous) return previous;
      const next =
        (previous.cursor + direction + previous.ids.length) % previous.ids.length;
      return { ...previous, cursor: next };
    });
  }

  function markCompleted(id: string) {
    setPracticeSet((previous) => {
      if (!previous || previous.completed.includes(id)) return previous;
      return { ...previous, completed: [...previous.completed, id] };
    });
  }

  return { practiceSet, ready, createSet, leaveSet, moveCursor, markCompleted };
}
