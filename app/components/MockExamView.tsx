"use client";

import { useMemo } from "react";
import type { Question } from "../data/questions";
import type { MockExamState } from "../lib/mock-exam";
import { MockExamResult } from "./MockExamResult";
import { MockExamSession } from "./MockExamSession";
import { MockExamSetup } from "./MockExamSetup";

/** 模擬考分頁：依狀態顯示設定表單、進行中畫面或成績頁。 */
export function MockExamView({
  mockExam,
  questions,
  loading,
  onStart,
  onSelect,
  onJump,
  onSubmit,
  onDismiss,
  onReviewQuestion,
}: {
  mockExam: MockExamState | null;
  questions: Question[];
  loading: boolean;
  onStart: (pool: Question[], size: number, durationMinutes: number, label: string) => void;
  onSelect: (id: string, index: number) => void;
  onJump: (cursor: number) => void;
  onSubmit: (auto: boolean) => void;
  onDismiss: () => void;
  onReviewQuestion: (question: Question) => void;
}) {
  const resolvedExamQuestions = useMemo(() => {
    if (!mockExam) return [];
    const byId = new Map(questions.map((question) => [question.id, question]));
    return mockExam.ids.map((id) => byId.get(id));
  }, [mockExam, questions]);

  if (mockExam?.status === "running") {
    return (
      <MockExamSession
        exam={mockExam}
        questions={resolvedExamQuestions}
        onSelect={onSelect}
        onJump={onJump}
        onSubmit={onSubmit}
      />
    );
  }
  if (mockExam?.status === "finished") {
    return (
      <MockExamResult
        exam={mockExam}
        questions={resolvedExamQuestions}
        onReviewQuestion={onReviewQuestion}
        onDismiss={onDismiss}
      />
    );
  }
  return <MockExamSetup questions={questions} loading={loading} onStart={onStart} />;
}
