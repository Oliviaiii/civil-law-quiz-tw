import type { SubjectFilter } from "./quiz-filters";

export const PRACTICE_SET_STORAGE_KEY = "civil-law-quiz-tw:practice-set:v1";

/** 一個進行中的自訂練習集：題目順序在建立時抽定，之後保持穩定。 */
export type PracticeSetState = {
  version: 1;
  label: string;
  ids: string[];
  subjects: SubjectFilter[];
  cursor: number;
  completed: string[];
  createdAt: string;
};

/** Fisher–Yates 洗牌；只在建立練習集時執行一次，順序隨 state 保存。 */
export function shuffleIds(ids: string[]): string[] {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parsePracticeSet(value: unknown): PracticeSetState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<PracticeSetState>;
  if (
    state.version !== 1 ||
    typeof state.label !== "string" ||
    !isStringArray(state.ids) ||
    state.ids.length === 0 ||
    !isStringArray(state.subjects) ||
    typeof state.cursor !== "number" ||
    !isStringArray(state.completed) ||
    typeof state.createdAt !== "string"
  ) {
    return null;
  }
  return {
    version: 1,
    label: state.label,
    ids: state.ids,
    subjects: state.subjects as SubjectFilter[],
    cursor: Math.min(Math.max(0, Math.floor(state.cursor)), state.ids.length - 1),
    completed: state.completed,
    createdAt: state.createdAt,
  };
}

export function loadPracticeSet(): PracticeSetState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(PRACTICE_SET_STORAGE_KEY);
    if (!saved) return null;
    return parsePracticeSet(JSON.parse(saved));
  } catch {
    return null;
  }
}

export function savePracticeSet(state: PracticeSetState | null) {
  if (typeof window === "undefined") return;
  if (state) window.localStorage.setItem(PRACTICE_SET_STORAGE_KEY, JSON.stringify(state));
  else window.localStorage.removeItem(PRACTICE_SET_STORAGE_KEY);
}
