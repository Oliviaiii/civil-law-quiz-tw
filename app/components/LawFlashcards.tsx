"use client";

import { useMemo, useState } from "react";
import type { Question } from "../data/questions";
import { localDateKey, type StatuteCardState } from "../lib/progress-store";
import { questionsCitingArticle, statuteKeysOf } from "../lib/statute-links";

/** 法條閃卡：以考過的法條為卡片，遮住條文自測，與間隔複習共用到期規則。 */
export function LawFlashcards({
  lawLabel,
  articles,
  questions,
  cards,
  onGrade,
  onOpenQuestion,
}: {
  lawLabel: string;
  articles: Record<string, string> | null;
  questions: Question[];
  cards?: Record<string, StatuteCardState>;
  onGrade: (key: string, remembered: boolean) => void;
  onOpenQuestion: (question: Question) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  // 卡片池：近十年題目解析引用過、且條文存在的法條，依出題次數排序。
  const pool = useMemo(() => {
    if (!articles) return [];
    const counts = new Map<string, number>();
    const prefix = `${lawLabel}|`;
    for (const question of questions) {
      for (const key of statuteKeysOf(question)) {
        if (!key.startsWith(prefix)) continue;
        const article = key.slice(prefix.length);
        if (!articles[article]) continue;
        counts.set(article, (counts.get(article) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([article, count]) => ({ article, count }))
      .sort((left, right) => right.count - left.count);
  }, [articles, lawLabel, questions]);

  const todayKey = localDateKey(new Date());
  const dueCards = pool.filter((item) => {
    const card = cards?.[`${lawLabel}|${item.article}`];
    return card?.dueAt && localDateKey(new Date(card.dueAt)) <= todayKey;
  });
  const freshCards = pool.filter((item) => !cards?.[`${lawLabel}|${item.article}`]);
  const queue = [...dueCards, ...freshCards];
  const current = queue[0];

  function grade(remembered: boolean) {
    if (!current) return;
    onGrade(`${lawLabel}|${current.article}`, remembered);
    setFlipped(false);
    setSessionCount((count) => count + 1);
  }

  if (!articles) return <p className="law-note">條文載入中…</p>;

  return (
    <div className="law-flashcards">
      <p className="flashcard-progress">
        待複習 {dueCards.length}・新卡 {freshCards.length}・本次已複習 {sessionCount} 張
        <span>（答錯隔天再出現；記得依 3、7、14、30 天延後，與題目複習同一套規則）</span>
      </p>

      {!current ? (
        <div className="empty-state">
          <span>✓</span>
          <h2>今天的法條卡都複習完了</h2>
          <p>已排程的卡片會依間隔規則回到佇列，明天再來看看。</p>
        </div>
      ) : !flipped ? (
        <div className="flashcard flashcard-front">
          <p className="eyebrow">回想條文內容</p>
          <h2>{lawLabel}第 {current.article} 條</h2>
          <p className="flashcard-hint">近十年被 {current.count} 題引用</p>
          <button type="button" className="practice-set-start" onClick={() => setFlipped(true)}>
            看條文
          </button>
        </div>
      ) : (
        <div className="flashcard flashcard-back">
          <h2>{lawLabel}第 {current.article} 條</h2>
          <p className="law-text">{articles[current.article]}</p>
          <div className="flashcard-grade">
            <button type="button" className="grade-forgot" onClick={() => grade(false)}>
              不熟（明天再出現）
            </button>
            <button type="button" className="grade-remembered" onClick={() => grade(true)}>
              記得
            </button>
          </div>
          <section className="law-related" aria-label="相關題目">
            <p className="eyebrow">相關題目</p>
            <ul>
              {questionsCitingArticle(questions, lawLabel, current.article)
                .slice(0, 4)
                .map((question) => (
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
          </section>
        </div>
      )}
    </div>
  );
}
