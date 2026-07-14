import type { Question } from "../data/questions";
import type { SubjectFilter } from "./quiz-filters";

export const MOCK_EXAM_STORAGE_KEY = "civil-law-quiz-tw:mock-exam:v1";

/**
 * 模擬考狀態。配分為自訂規則並於畫面明確標示：
 * 每題 100/題數 分，答對得分；官方一律給分題一律得分；
 * 官方公告複數答案者任一皆得分；未作答與答錯不得分、不倒扣。
 * 計時只用本機 startedAt 與 deadlineAt 重新計算，不依賴伺服器。
 */
export type MockExamState = {
  version: 1;
  status: "running" | "finished";
  label: string;
  subjects: SubjectFilter[];
  ids: string[];
  answers: Record<string, number>;
  cursor: number;
  startedAt: string;
  durationMinutes: number;
  deadlineAt: string;
  finishedAt?: string;
};

/** 第一版只納入有官方答案的選擇題（含更正之複數答案與一律給分）。 */
export function isMockEligible(question: Question): boolean {
  if (!question.exam || question.format !== "選擇題") return false;
  return (
    question.answer !== null ||
    Boolean(question.allCredit) ||
    Boolean(question.acceptedAnswers?.length)
  );
}

/** 依官方答案判分；selected 為 undefined 代表未作答。 */
export function judgeMockAnswer(question: Question, selected: number | undefined): boolean {
  if (question.allCredit) return true;
  if (selected === undefined) return false;
  const accepted = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : question.answer === null ? [] : [question.answer];
  return accepted.includes(selected);
}

/** 每題分數（自訂配分：滿分 100 平均分配）。 */
export function mockScorePerQuestion(totalQuestions: number): number {
  return totalQuestions > 0 ? 100 / totalQuestions : 0;
}

export function roundScore(score: number): number {
  return Math.round(score * 10) / 10;
}

function isAnswerRecord(value: unknown): value is Record<string, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((item) => typeof item === "number")
  );
}

export function parseMockExam(value: unknown): MockExamState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<MockExamState>;
  if (
    state.version !== 1 ||
    (state.status !== "running" && state.status !== "finished") ||
    typeof state.label !== "string" ||
    !Array.isArray(state.ids) ||
    state.ids.length === 0 ||
    !state.ids.every((id) => typeof id === "string") ||
    !Array.isArray(state.subjects) ||
    !isAnswerRecord(state.answers) ||
    typeof state.cursor !== "number" ||
    typeof state.startedAt !== "string" ||
    typeof state.durationMinutes !== "number" ||
    typeof state.deadlineAt !== "string"
  ) {
    return null;
  }
  return {
    version: 1,
    status: state.status,
    label: state.label,
    subjects: state.subjects as SubjectFilter[],
    ids: state.ids,
    answers: state.answers,
    cursor: Math.min(Math.max(0, Math.floor(state.cursor)), state.ids.length - 1),
    startedAt: state.startedAt,
    durationMinutes: state.durationMinutes,
    deadlineAt: state.deadlineAt,
    finishedAt: typeof state.finishedAt === "string" ? state.finishedAt : undefined,
  };
}

export function loadMockExam(): MockExamState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(MOCK_EXAM_STORAGE_KEY);
    if (!saved) return null;
    return parseMockExam(JSON.parse(saved));
  } catch {
    return null;
  }
}

export function saveMockExam(state: MockExamState | null) {
  if (typeof window === "undefined") return;
  if (state) window.localStorage.setItem(MOCK_EXAM_STORAGE_KEY, JSON.stringify(state));
  else window.localStorage.removeItem(MOCK_EXAM_STORAGE_KEY);
}
