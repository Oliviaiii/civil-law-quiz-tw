"use client";

import { useEffect, useState } from "react";
import type { Question } from "../data/questions";
import {
  loadMockExam,
  saveMockExam,
  type MockExamState,
} from "../lib/mock-exam";
import { shuffleIds } from "../lib/practice-set";
import type { SubjectFilter } from "../lib/quiz-filters";

/** 模擬考狀態管理：本機保存、重新整理後恢復；逾時的進行中考試載入時直接結算。 */
export function useMockExam(options?: { onRestoreRunning?: () => void }) {
  const [mockExam, setMockExam] = useState<MockExamState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let saved = loadMockExam();
      if (saved?.status === "running" && Date.parse(saved.deadlineAt) <= Date.now()) {
        // 離開期間已超過截止時間：以截止時間視為交卷。
        saved = { ...saved, status: "finished", finishedAt: saved.deadlineAt };
      }
      setMockExam(saved);
      setReady(true);
      if (saved?.status === "running") options?.onRestoreRunning?.();
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在掛載時載入一次
  }, []);

  useEffect(() => {
    if (ready) saveMockExam(mockExam);
  }, [mockExam, ready]);

  function startExam(
    pool: Question[],
    size: number,
    durationMinutes: number,
    label: string,
  ) {
    const ids = shuffleIds(pool.map((question) => question.id)).slice(0, size);
    const subjects = Array.from(new Set(pool.map((question) => question.subject))) as SubjectFilter[];
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + durationMinutes * 60_000);
    setMockExam({
      version: 1,
      status: "running",
      label,
      subjects,
      ids,
      answers: {},
      cursor: 0,
      startedAt: startedAt.toISOString(),
      durationMinutes,
      deadlineAt: deadlineAt.toISOString(),
    });
  }

  function selectAnswer(id: string, index: number) {
    setMockExam((previous) => {
      if (!previous || previous.status !== "running") return previous;
      return { ...previous, answers: { ...previous.answers, [id]: index } };
    });
  }

  function jumpToIndex(cursor: number) {
    setMockExam((previous) => {
      if (!previous || previous.status !== "running") return previous;
      const clamped = Math.min(Math.max(0, cursor), previous.ids.length - 1);
      return { ...previous, cursor: clamped };
    });
  }

  function submitExam() {
    setMockExam((previous) => {
      if (!previous || previous.status !== "running") return previous;
      return { ...previous, status: "finished", finishedAt: new Date().toISOString() };
    });
  }

  function discardExam() {
    setMockExam(null);
  }

  return { mockExam, ready, startExam, selectAnswer, jumpToIndex, submitExam, discardExam };
}
