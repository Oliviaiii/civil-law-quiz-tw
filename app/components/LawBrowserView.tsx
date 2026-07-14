"use client";

import { useEffect, useMemo, useState } from "react";
import type { Question } from "../data/questions";
import type { StatuteCardState } from "../lib/progress-store";
import { questionsCitingArticle, statuteKeysOf } from "../lib/statute-links";
import { LawFlashcards } from "./LawFlashcards";

type LawCode = "civil" | "criminal";

const lawMeta: Record<
  LawCode,
  { label: string; chapters: { label: string; from: number; to: number }[] }
> = {
  civil: {
    label: "民法",
    chapters: [
      { label: "總則", from: 1, to: 152 },
      { label: "債編", from: 153, to: 756 },
      { label: "物權", from: 757, to: 966 },
      { label: "親屬", from: 967, to: 1137 },
      { label: "繼承", from: 1138, to: 1225 },
    ],
  },
  criminal: {
    label: "刑法",
    chapters: [
      { label: "總則", from: 1, to: 99 },
      { label: "分則", from: 100, to: 363 },
    ],
  },
};

// 法條全文按需載入；與題庫解析共用同一份 JSON chunk，不進首頁 bundle。
const lawLoaders: Record<LawCode, () => Promise<{ default: { articles: Record<string, string> } }>> = {
  civil: () => import("../data/civil-code-articles.json"),
  criminal: () => import("../data/criminal-code-articles.json"),
};

function articleSortKey(article: string): [number, number] {
  const [main, sub] = article.split("-");
  return [Number.parseInt(main, 10) || 0, Number.parseInt(sub ?? "0", 10) || 0];
}

/** 法條速查：站內瀏覽民法、刑法條文，並列出考過同一條的題目。 */
export function LawBrowserView({
  questions,
  statuteCards,
  onGradeCard,
  onOpenQuestion,
}: {
  questions: Question[];
  statuteCards?: Record<string, StatuteCardState>;
  onGradeCard: (key: string, remembered: boolean) => void;
  onOpenQuestion: (question: Question) => void;
}) {
  const [code, setCode] = useState<LawCode>("civil");
  const [mode, setMode] = useState<"browse" | "flash">("browse");
  const [articles, setArticles] = useState<Record<string, string> | null>(null);
  const [chapterIndex, setChapterIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    lawLoaders[code]().then((module_) => {
      if (!cancelled) setArticles(module_.default.articles);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const meta = lawMeta[code];
  const entries = useMemo(() => {
    if (!articles) return [];
    let list = Object.keys(articles);
    if (chapterIndex !== null) {
      const chapter = meta.chapters[chapterIndex];
      list = list.filter((article) => {
        const [main] = articleSortKey(article);
        return main >= chapter.from && main <= chapter.to;
      });
    }
    const trimmed = query.trim();
    if (trimmed) list = list.filter((article) => article.startsWith(trimmed));
    return list.sort((left, right) => {
      const [lm, ls] = articleSortKey(left);
      const [rm, rs] = articleSortKey(right);
      return lm - rm || ls - rs;
    });
  }, [articles, chapterIndex, meta, query]);

  const relatedQuestions = selected
    ? questionsCitingArticle(questions, meta.label, selected)
    : [];

  // 出題頻率排行：由題庫 statutes 欄位靜態統計，不引入分析追蹤服務。
  const ranking = useMemo(() => {
    const counts = new Map<string, { count: number; years: Map<number, number> }>();
    const prefix = `${meta.label}|`;
    for (const question of questions) {
      for (const key of statuteKeysOf(question)) {
        if (!key.startsWith(prefix)) continue;
        const article = key.slice(prefix.length);
        const entry = counts.get(article) ?? { count: 0, years: new Map() };
        entry.count += 1;
        if (question.rocYear !== undefined) {
          entry.years.set(question.rocYear, (entry.years.get(question.rocYear) ?? 0) + 1);
        }
        counts.set(article, entry);
      }
    }
    return Array.from(counts.entries())
      .map(([article, entry]) => ({
        article,
        count: entry.count,
        yearText: Array.from(entry.years.entries())
          .sort(([left], [right]) => right - left)
          .map(([year, count]) => (count > 1 ? `${year}×${count}` : `${year}`))
          .join("、"),
      }))
      .sort(
        (left, right) =>
          right.count - left.count ||
          articleSortKey(left.article)[0] - articleSortKey(right.article)[0],
      );
  }, [meta, questions]);

  function switchCode(next: LawCode) {
    setCode(next);
    setArticles(null);
    setChapterIndex(null);
    setQuery("");
    setSelected(null);
  }

  return (
    <div className="law-browser">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STATUTES</p>
          <h1>法條速查</h1>
          <p>站內瀏覽民法、刑法現行條文，並可從條文找出近十年考過同一條的題目。</p>
        </div>
      </div>

      <div className="law-toolbar">
        <div className="segmented">
          {(Object.keys(lawMeta) as LawCode[]).map((item) => (
            <button
              key={item}
              type="button"
              className={code === item ? "selected" : ""}
              onClick={() => switchCode(item)}
            >
              {lawMeta[item].label}
            </button>
          ))}
        </div>
        <div className="segmented">
          <button
            type="button"
            className={mode === "browse" ? "selected" : ""}
            onClick={() => setMode("browse")}
          >
            瀏覽條文
          </button>
          <button
            type="button"
            className={mode === "flash" ? "selected" : ""}
            onClick={() => setMode("flash")}
          >
            閃卡練習
          </button>
        </div>
        {mode === "browse" && (
          <>
            <div className="segmented law-chapters">
              <button
                type="button"
                className={chapterIndex === null ? "selected" : ""}
                onClick={() => setChapterIndex(null)}
              >
                全部
              </button>
              {meta.chapters.map((chapter, index) => (
                <button
                  key={chapter.label}
                  type="button"
                  className={chapterIndex === index ? "selected" : ""}
                  onClick={() => setChapterIndex(index)}
                >
                  {chapter.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="輸入條號，例如 184"
              aria-label="搜尋條號"
            />
          </>
        )}
      </div>

      {mode === "flash" ? (
        <LawFlashcards
          lawLabel={meta.label}
          articles={articles}
          questions={questions}
          cards={statuteCards}
          onGrade={onGradeCard}
          onOpenQuestion={onOpenQuestion}
        />
      ) : (
      <div className="law-layout">
        <ul className="law-article-list" aria-label="條文清單">
          {!articles && <li className="law-note">條文載入中…</li>}
          {articles && entries.length === 0 && <li className="law-note">找不到符合的條號。</li>}
          {entries.slice(0, 300).map((article) => (
            <li key={article}>
              <button
                type="button"
                className={selected === article ? "selected" : ""}
                onClick={() => setSelected(article)}
              >
                第 {article} 條
              </button>
            </li>
          ))}
          {entries.length > 300 && <li className="law-note">僅顯示前 300 條，請用條號縮小範圍。</li>}
        </ul>

        <div className="law-detail">
          {selected && articles?.[selected] ? (
            <>
              <h2>{meta.label}第 {selected} 條</h2>
              <p className="law-text">{articles[selected]}</p>
              <a
                href={`https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${code === "civil" ? "B0000001" : "C0000001"}&flno=${selected}`}
                target="_blank"
                rel="noreferrer"
              >
                在全國法規資料庫查看 ↗
              </a>
              <section className="law-related" aria-label="考過此條的題目">
                <p className="eyebrow">考過此條的題目（{relatedQuestions.length}）</p>
                {relatedQuestions.length === 0 ? (
                  <p className="law-note">近十年題庫中尚未有解析引用此條。</p>
                ) : (
                  <ul>
                    {relatedQuestions.map((question) => (
                      <li key={question.id}>
                        <button type="button" onClick={() => onOpenQuestion(question)}>
                          <span className="search-result-meta">
                            {question.subjectLabel}
                            {question.rocYear ? `｜${question.rocYear} 年` : "｜未標年度"}
                            {question.officialQuestionNumber ? `｜第 ${question.officialQuestionNumber} 題` : ""}
                          </span>
                          <span className="search-result-prompt">{question.prompt}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <div className="law-ranking" aria-label="出題頻率排行">
              <p className="eyebrow">出題頻率排行（{meta.label}・近十年）</p>
              <p className="law-note">
                由每題人工解析引用的法條靜態統計；點條號可看條文與相關題目。
              </p>
              {ranking.length === 0 ? (
                <p className="law-note">題庫載入中，或此法尚無解析引用統計。</p>
              ) : (
                <ol>
                  {ranking.slice(0, 20).map((item) => (
                    <li key={item.article}>
                      <button type="button" onClick={() => setSelected(item.article)}>
                        <strong>第 {item.article} 條</strong>
                        <span>{item.count} 題</span>
                        <small>{item.yearText ? `${item.yearText} 年` : "未標年度"}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
