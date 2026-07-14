"use client";

import { useState } from "react";
import {
  loadSearchIndex,
  searchEntries,
  type SearchEntry,
} from "../lib/search";
import type { FilterState } from "../lib/quiz-filters";

const RESULT_LIMIT = 50;

/** 全文搜尋與題號快速跳轉：結果沿用目前科目、來源、年度與題型篩選。 */
export function SearchPanel({
  filters,
  onJump,
  onClearFilters,
}: {
  filters: FilterState;
  onJump: (entry: SearchEntry) => void;
  onClearFilters: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // 第一次輸入時才載入索引檔，避免增加首頁初始下載量。
  function loadIndex() {
    setStatus("loading");
    loadSearchIndex()
      .then((entries) => {
        setIndex(entries);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  const results = index && query.trim() ? searchEntries(index, query, filters) : [];
  const shown = results.slice(0, RESULT_LIMIT);

  return (
    <section className="search-panel" aria-label="搜尋題目">
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (event.target.value.trim() && status === "idle") loadIndex();
        }}
        placeholder="搜尋題幹、選項、法條或解析，也可輸入「114 法緒 18」直接跳題"
        aria-label="搜尋題目"
      />
      {query.trim() && (
        <div className="search-results">
          {status === "loading" && <p className="search-note">搜尋索引載入中…</p>}
          {status === "error" && (
            <p className="search-note" role="alert">
              搜尋索引載入失敗，請檢查網路後
              <button type="button" onClick={loadIndex}>重試</button>
            </p>
          )}
          {status === "ready" && results.length > 0 && (
            <>
              <p className="search-note">
                在目前篩選範圍找到 {results.length} 題
                {results.length > RESULT_LIMIT ? `，顯示前 ${RESULT_LIMIT} 題` : ""}
              </p>
              <ul>
                {shown.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        onJump(entry);
                      }}
                    >
                      <span className="search-result-meta">
                        {entry.subjectLabel}
                        {entry.rocYear ? `｜${entry.rocYear} 年` : "｜示範題"}
                        {entry.number ? `｜第 ${entry.number} 題` : ""}
                        ｜{entry.format}
                      </span>
                      <span className="search-result-prompt">{entry.prompt}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {status === "ready" && results.length === 0 && (
            <div className="search-empty">
              <p>目前篩選範圍內找不到符合「{query.trim()}」的題目。</p>
              <div>
                <button type="button" onClick={() => setQuery("")}>清除搜尋</button>
                <button type="button" onClick={onClearFilters}>清除所有篩選再找一次</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
