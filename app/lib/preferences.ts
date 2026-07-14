export const PREFERENCES_STORAGE_KEY = "civil-law-quiz-tw:preferences:v1";

/** 「繼續上次練習」保存的畫面與篩選條件快照（不含任何作答內容）。 */
export type SessionSnapshot = {
  view?: "practice" | "wrong";
  scope?: string;
  subjects?: string[];
  corpora?: string[];
  format?: string;
  years?: number[];
  categories?: string[];
};

/** 本機偏好設定；欄位皆可缺漏，之後的功能（深色模式、考試日期等）在此擴充。 */
export type Preferences = {
  version: 1;
  /** 練習模式選項亂序。 */
  shuffleOptions?: boolean;
  /** 深淺色主題；未設定時跟隨系統。 */
  theme?: "dark" | "light";
  /** 最後一次練習的畫面與篩選條件。 */
  lastSession?: SessionSnapshot;
};

export function createDefaultPreferences(): Preferences {
  return { version: 1 };
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : undefined;
}

function sanitizeSession(value: unknown): SessionSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  const session = value as SessionSnapshot;
  const sanitized: SessionSnapshot = {
    view: session.view === "wrong" ? "wrong" : "practice",
    scope: typeof session.scope === "string" ? session.scope : undefined,
    subjects: stringArray(session.subjects),
    corpora: stringArray(session.corpora),
    format: typeof session.format === "string" ? session.format : undefined,
    years:
      Array.isArray(session.years) && session.years.every((item) => typeof item === "number")
        ? session.years
        : undefined,
    categories: stringArray(session.categories),
  };
  return sanitized;
}

export function parsePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") return createDefaultPreferences();
  const stored = value as Partial<Preferences>;
  if (stored.version !== 1) return createDefaultPreferences();
  return {
    version: 1,
    shuffleOptions: typeof stored.shuffleOptions === "boolean" ? stored.shuffleOptions : undefined,
    theme: stored.theme === "dark" || stored.theme === "light" ? stored.theme : undefined,
    lastSession: sanitizeSession(stored.lastSession),
  };
}

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") return createDefaultPreferences();
  try {
    const saved = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!saved) return createDefaultPreferences();
    return parsePreferences(JSON.parse(saved));
  } catch {
    return createDefaultPreferences();
  }
}

export function savePreferences(preferences: Preferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
