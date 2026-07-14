export const PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v3";
const LEGACY_V2_STORAGE_KEY = "civil-law-quiz-tw:progress:v2";
const LEGACY_PROGRESS_STORAGE_KEY = "civil-law-quiz-tw:progress:v1";

/** 單題作答紀錄；v3 新增欄位皆允許缺漏（間隔複習功能完成前不強制寫入）。 */
export type AnswerProgress = {
  attempts: number;
  lastSelected: number;
  lastCorrect: boolean;
  lastAnsweredAt: string;
  /** 連續答對次數（間隔複習用）。 */
  correctStreak?: number;
  /** 歷史答錯次數。 */
  wrongCount?: number;
  /** 最後複習時間。 */
  lastReviewedAt?: string;
  /** 下次複習時間（到期）。 */
  dueAt?: string;
};

/** 收藏、不確定與純文字筆記（獨立於答對／答錯）。 */
export type QuestionFlags = {
  starred?: boolean;
  uncertain?: boolean;
  note?: string;
};

/** 申論題自我練習：本機草稿與累計用時（秒）。 */
export type EssayPracticeState = {
  draft?: string;
  seconds?: number;
};

/** 法條閃卡複習狀態（key 為「法名|條號」），與間隔複習共用到期規則。 */
export type StatuteCardState = {
  correctStreak: number;
  wrongCount?: number;
  lastReviewedAt?: string;
  dueAt?: string;
};

/**
 * 進度格式 v3：一次擴充間隔複習、收藏／筆記、每日計數、每日一題、
 * 最後檢視位置與考試日期所需欄位，避免連環升版。
 */
export type ProgressData = {
  version: 3;
  answers: Record<string, AnswerProgress>;
  flags: Record<string, QuestionFlags>;
  /** 每日作答計數（本機日期 YYYY-MM-DD → 次數），供熱力圖與讀書節奏使用。 */
  daily: Record<string, number>;
  /** 每日一題完成狀態與連續天數。 */
  dailyQuestion?: { streak: number; lastCompletedDate?: string };
  /** 最後檢視位置（繼續上次練習）。 */
  lastVisited?: { questionId?: string };
  /** 目標考試日期（YYYY-MM-DD），供倒數與每日建議題數。 */
  examDate?: string;
  /** 申論題自我練習草稿。 */
  essays?: Record<string, EssayPracticeState>;
  /** 法條閃卡複習狀態。 */
  statuteCards?: Record<string, StatuteCardState>;
};

export function createEmptyProgress(): ProgressData {
  return { version: 3, answers: {}, flags: {}, daily: {} };
}

/** 本機時區的日期 key（YYYY-MM-DD）。 */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeAnswer(value: unknown): AnswerProgress | null {
  if (!value || typeof value !== "object") return null;
  const answer = value as Partial<AnswerProgress>;
  if (
    typeof answer.attempts !== "number" ||
    typeof answer.lastSelected !== "number" ||
    typeof answer.lastCorrect !== "boolean" ||
    typeof answer.lastAnsweredAt !== "string"
  ) {
    return null;
  }
  const sanitized: AnswerProgress = {
    attempts: answer.attempts,
    lastSelected: answer.lastSelected,
    lastCorrect: answer.lastCorrect,
    lastAnsweredAt: answer.lastAnsweredAt,
  };
  if (typeof answer.correctStreak === "number") sanitized.correctStreak = answer.correctStreak;
  if (typeof answer.wrongCount === "number") sanitized.wrongCount = answer.wrongCount;
  if (typeof answer.lastReviewedAt === "string") sanitized.lastReviewedAt = answer.lastReviewedAt;
  if (typeof answer.dueAt === "string") sanitized.dueAt = answer.dueAt;
  return sanitized;
}

function sanitizeFlags(value: unknown): QuestionFlags | null {
  if (!value || typeof value !== "object") return null;
  const flags = value as Partial<QuestionFlags>;
  const sanitized: QuestionFlags = {};
  if (flags.starred === true) sanitized.starred = true;
  if (flags.uncertain === true) sanitized.uncertain = true;
  // 筆記為本機私人純文字；限制長度避免匯入異常大的檔案。
  if (typeof flags.note === "string" && flags.note.trim()) {
    sanitized.note = flags.note.slice(0, 5000);
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

/** 解析 v1／v2／v3 格式並升級為 v3；格式不符擲出錯誤。 */
export function parseProgress(value: unknown): ProgressData {
  if (!value || typeof value !== "object") throw new Error("invalid progress");

  const stored = value as {
    version?: unknown;
    answers?: unknown;
    flags?: unknown;
    daily?: unknown;
    dailyQuestion?: unknown;
    lastVisited?: unknown;
    examDate?: unknown;
  };
  if (
    (stored.version !== 1 && stored.version !== 2 && stored.version !== 3) ||
    !stored.answers ||
    typeof stored.answers !== "object"
  ) {
    throw new Error("invalid progress");
  }

  const answers: Record<string, AnswerProgress> = {};
  for (const [id, rawAnswer] of Object.entries(stored.answers)) {
    const answer = sanitizeAnswer(rawAnswer);
    if (!answer) continue;
    // v1 是只有示範題時使用的格式；升級時移除示範題舊紀錄，避免正式題庫顯示幽靈錯題。
    if (stored.version === 1 && !id.startsWith("judicial-fourth-")) continue;
    answers[id] = answer;
  }

  const flags: Record<string, QuestionFlags> = {};
  if (stored.flags && typeof stored.flags === "object") {
    for (const [id, rawFlags] of Object.entries(stored.flags)) {
      const entry = sanitizeFlags(rawFlags);
      if (entry) flags[id] = entry;
    }
  }

  const daily: Record<string, number> = {};
  if (stored.daily && typeof stored.daily === "object") {
    for (const [date, count] of Object.entries(stored.daily)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof count === "number" && count > 0) {
        daily[date] = Math.floor(count);
      }
    }
  }

  const progress: ProgressData = { version: 3, answers, flags, daily };

  if (stored.dailyQuestion && typeof stored.dailyQuestion === "object") {
    const dailyQuestion = stored.dailyQuestion as { streak?: unknown; lastCompletedDate?: unknown };
    if (typeof dailyQuestion.streak === "number") {
      progress.dailyQuestion = {
        streak: Math.max(0, Math.floor(dailyQuestion.streak)),
        lastCompletedDate:
          typeof dailyQuestion.lastCompletedDate === "string"
            ? dailyQuestion.lastCompletedDate
            : undefined,
      };
    }
  }
  if (stored.lastVisited && typeof stored.lastVisited === "object") {
    const lastVisited = stored.lastVisited as { questionId?: unknown };
    if (typeof lastVisited.questionId === "string") {
      progress.lastVisited = { questionId: lastVisited.questionId };
    }
  }
  if (typeof stored.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(stored.examDate)) {
    progress.examDate = stored.examDate;
  }
  const storedCards = (stored as { statuteCards?: unknown }).statuteCards;
  if (storedCards && typeof storedCards === "object") {
    const statuteCards: Record<string, StatuteCardState> = {};
    for (const [key, rawCard] of Object.entries(storedCards)) {
      if (!rawCard || typeof rawCard !== "object") continue;
      const card = rawCard as StatuteCardState;
      if (typeof card.correctStreak !== "number") continue;
      const sanitized: StatuteCardState = { correctStreak: Math.max(0, Math.floor(card.correctStreak)) };
      if (typeof card.wrongCount === "number") sanitized.wrongCount = Math.floor(card.wrongCount);
      if (typeof card.lastReviewedAt === "string") sanitized.lastReviewedAt = card.lastReviewedAt;
      if (typeof card.dueAt === "string") sanitized.dueAt = card.dueAt;
      statuteCards[key] = sanitized;
    }
    if (Object.keys(statuteCards).length > 0) progress.statuteCards = statuteCards;
  }
  const storedEssays = (stored as { essays?: unknown }).essays;
  if (storedEssays && typeof storedEssays === "object") {
    const essays: Record<string, EssayPracticeState> = {};
    for (const [id, rawEssay] of Object.entries(storedEssays)) {
      if (!rawEssay || typeof rawEssay !== "object") continue;
      const essay = rawEssay as EssayPracticeState;
      const sanitized: EssayPracticeState = {};
      if (typeof essay.draft === "string" && essay.draft.trim()) {
        sanitized.draft = essay.draft.slice(0, 20000);
      }
      if (typeof essay.seconds === "number" && essay.seconds > 0) {
        sanitized.seconds = Math.floor(essay.seconds);
      }
      if (Object.keys(sanitized).length > 0) essays[id] = sanitized;
    }
    if (Object.keys(essays).length > 0) progress.essays = essays;
  }

  return progress;
}

export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return createEmptyProgress();
  try {
    for (const key of [PROGRESS_STORAGE_KEY, LEGACY_V2_STORAGE_KEY, LEGACY_PROGRESS_STORAGE_KEY]) {
      const saved = window.localStorage.getItem(key);
      if (saved) return parseProgress(JSON.parse(saved));
    }
    return createEmptyProgress();
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(progress: ProgressData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
