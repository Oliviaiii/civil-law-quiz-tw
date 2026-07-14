"use client";

import { useEffect, useState } from "react";

type VocabEntry = {
  word: string;
  partOfSpeech: string;
  translation: string;
  questionIds: string[];
};

let vocabCache: VocabEntry[] | null = null;
const DISPLAY_LIMIT = 300;

/** 英文單字本：由英文科翻譯資料整理，支援瀏覽、遮義自測與連回原題。 */
export function VocabView({ onOpenQuestion }: { onOpenQuestion: (questionId: string) => void }) {
  const [entries, setEntries] = useState<VocabEntry[] | null>(vocabCache);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [hideMeaning, setHideMeaning] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (vocabCache) return;
    let cancelled = false;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/data/vocabulary.json`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: VocabEntry[]) => {
        vocabCache = data;
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = query.trim().toLowerCase();
  const filtered = (entries ?? []).filter(
    (entry) =>
      !trimmed ||
      entry.word.toLowerCase().includes(trimmed) ||
      entry.translation.includes(query.trim()),
  );
  const shown = filtered.slice(0, DISPLAY_LIMIT);

  function toggleReveal(word: string) {
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }

  return (
    <div className="vocab-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">VOCABULARY</p>
          <h1>英文單字本</h1>
          <p>整理近十年英文科考過的單字、詞性與中譯（人工複核翻譯資料），可遮住中文自測。</p>
        </div>
        <div className="result-summary">
          <span>收錄單字</span>
          <strong>{entries?.length ?? "…"}</strong>
          <small>符合 {filtered.length}</small>
        </div>
      </div>

      <div className="vocab-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋單字或中文意思"
          aria-label="搜尋單字"
        />
        <label className="shuffle-toggle">
          <input
            type="checkbox"
            checked={hideMeaning}
            onChange={(event) => {
              setHideMeaning(event.target.checked);
              setRevealed(new Set());
            }}
          />
          <span>遮住中文自測</span>
        </label>
      </div>

      {failed && <p className="law-note">單字資料載入失敗，請檢查網路後重新整理。</p>}
      {!entries && !failed && <p className="law-note">單字資料載入中…</p>}

      <ul className="vocab-list">
        {shown.map((entry) => {
          const isHidden = hideMeaning && !revealed.has(entry.word);
          return (
            <li key={`${entry.word}|${entry.partOfSpeech}`}>
              <div className="vocab-word">
                <strong>{entry.word}</strong>
                <span className="part-of-speech">{entry.partOfSpeech}</span>
              </div>
              {isHidden ? (
                <button
                  type="button"
                  className="vocab-meaning is-hidden"
                  onClick={() => toggleReveal(entry.word)}
                >
                  顯示意思
                </button>
              ) : (
                <span className="vocab-meaning">{entry.translation}</span>
              )}
              <button
                type="button"
                className="vocab-source"
                onClick={() => onOpenQuestion(entry.questionIds[0])}
                title="回到考過這個單字的題目"
              >
                出處 {entry.questionIds.length} 題 ↗
              </button>
            </li>
          );
        })}
      </ul>
      {filtered.length > DISPLAY_LIMIT && (
        <p className="law-note">僅顯示前 {DISPLAY_LIMIT} 筆，請用搜尋縮小範圍。</p>
      )}
    </div>
  );
}
