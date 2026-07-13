export const PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v2";
const LEGACY_PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v1";

type AnswerProgress = {
  attempts: number;
  lastSelected: number;
  lastCorrect: boolean;
  lastAnsweredAt: string;
};

export type ProgressData = {
  version: 2;
  answers: Record<string, AnswerProgress>;
};

export function createEmptyProgress(): ProgressData {
  return { version: 2, answers: {} };
}

function isAnswerProgress(value: unknown): value is AnswerProgress {
  if (!value || typeof value !== "object") return false;
  const answer = value as Partial<AnswerProgress>;
  return (
    typeof answer.attempts === "number" &&
    typeof answer.lastSelected === "number" &&
    typeof answer.lastCorrect === "boolean" &&
    typeof answer.lastAnsweredAt === "string"
  );
}

export function parseProgress(value: unknown): ProgressData {
  if (!value || typeof value !== "object") throw new Error("invalid progress");

  const stored = value as {
    version?: unknown;
    answers?: unknown;
  };
  if ((stored.version !== 1 && stored.version !== 2) || !stored.answers || typeof stored.answers !== "object") {
    throw new Error("invalid progress");
  }

  const answers = Object.fromEntries(
    Object.entries(stored.answers).filter(([id, answer]) => {
      if (!isAnswerProgress(answer)) return false;
      // v1 是只有示範題時使用的格式；升級時移除示範題舊紀錄，避免正式題庫顯示幽靈錯題。
      return stored.version === 2 || id.startsWith("judicial-fourth-");
    }),
  );

  return { version: 2, answers };
}

export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return createEmptyProgress();
  try {
    const saved = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (saved) return parseProgress(JSON.parse(saved));

    const legacySaved = window.localStorage.getItem(LEGACY_PROGRESS_STORAGE_KEY);
    if (legacySaved) return parseProgress(JSON.parse(legacySaved));

    return createEmptyProgress();
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(progress: ProgressData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
