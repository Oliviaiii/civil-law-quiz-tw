export const PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v1";

export type ProgressData = {
  version: 1;
  answers: Record<
    string,
    {
      attempts: number;
      lastSelected: number;
      lastCorrect: boolean;
      lastAnsweredAt: string;
    }
  >;
};

export function createEmptyProgress(): ProgressData {
  return { version: 1, answers: {} };
}

export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return createEmptyProgress();
  try {
    const saved = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!saved) return createEmptyProgress();
    const parsed = JSON.parse(saved) as ProgressData;
    if (parsed.version !== 1 || typeof parsed.answers !== "object") {
      return createEmptyProgress();
    }
    return parsed;
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(progress: ProgressData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
