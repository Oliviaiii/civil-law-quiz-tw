"use client";

import { useState } from "react";
import type { Question } from "../data/questions";
import { identityOrder, shuffledOptionOrder } from "../lib/option-order";
import type { EssayPracticeState, ProgressData, QuestionFlags } from "../lib/progress-store";
import { buildIssueUrl } from "../lib/report-issue";
import { EssayPracticePanel } from "./EssayPracticePanel";
import { QuestionAnalysis } from "./QuestionAnalysis";

function formatDate(value?: string) {
  if (!value) return "尚未作答";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** 單題作答卡：題目、選項、判題與解析、換題導航。 */
export function QuestionCard({
  question,
  position,
  total,
  previousAnswer,
  relatedQuestions,
  shuffleOptions = false,
  flags,
  onChoose,
  onMarkRead,
  onMove,
  onOpenRelated,
  onToggleStarred,
  onToggleUncertain,
  essay,
  onSaveEssay,
}: {
  question: Question;
  position: number;
  total: number;
  previousAnswer?: ProgressData["answers"][string];
  relatedQuestions?: Question[];
  shuffleOptions?: boolean;
  flags?: QuestionFlags;
  onChoose: (index: number) => void;
  onMarkRead: () => void;
  onMove: (direction: 1 | -1) => void;
  onOpenRelated?: (question: Question) => void;
  onToggleStarred?: () => void;
  onToggleUncertain?: () => void;
  essay?: EssayPracticeState;
  onSaveEssay?: (draft: string, seconds: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const isEssay = question.format === "申論題";
  // 顯示順序在掛載時決定一次，單次作答內穩定；判題一律以原始 index 為準。
  const [optionOrder] = useState<number[]>(() =>
    shuffleOptions && !isEssay
      ? shuffledOptionOrder(question)
      : identityOrder(question.options.length),
  );
  const acceptedAnswers = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : question.answer === null ? [] : [question.answer];
  const answeredCorrect = Boolean(
    revealed && (question.allCredit || (selected !== null && acceptedAnswers.includes(selected))),
  );
  // 答案字母以「畫面上的位置」顯示，亂序時才不會對不上。
  const answerLabel = question.allCredit
    ? "本題一律給分"
    : acceptedAnswers.length === 0
      ? "未公布"
      : acceptedAnswers
          .map((index) => optionOrder.indexOf(index))
          .sort((left, right) => left - right)
          .map((displayIndex) => String.fromCharCode(65 + displayIndex))
          .join(" 或 ");

  function handleChoose(index: number) {
    if (revealed || isEssay) return;
    setSelected(index);
    setRevealed(true);
    onChoose(index);
  }

  const hasQuickTools = Boolean(onToggleStarred && onToggleUncertain);
  const navigation = (
    <div className={hasQuickTools ? "question-quick-nav has-tools" : "question-quick-nav"} aria-label="題目切換">
      {hasQuickTools && (
        <>
          <button
            type="button"
            aria-label={flags?.starred ? "取消收藏" : "收藏"}
            aria-pressed={flags?.starred ?? false}
            className={flags?.starred ? "quick-tool active" : "quick-tool"}
            onClick={() => onToggleStarred?.()}
          >
            ★<small>收藏</small>
          </button>
          <button
            type="button"
            aria-label={flags?.uncertain ? "取消不確定標記" : "不確定"}
            aria-pressed={flags?.uncertain ?? false}
            className={flags?.uncertain ? "quick-tool active" : "quick-tool"}
            onClick={() => onToggleUncertain?.()}
          >
            ？<small>不確定</small>
          </button>
        </>
      )}
      <button onClick={() => onMove(-1)}>← 上一題</button>
      <button className="next-button" onClick={() => onMove(1)}>下一題 →</button>
    </div>
  );

  return (
    <article className="question-card">
      <div className="question-meta">
        <div>
          <span className="tag category">{question.exam ?? question.category}</span>
          {question.exam && <span className="tag type">{question.subjectLabel}</span>}
          {question.rocYear && <span className="tag year">民國 {question.rocYear} 年</span>}
          <span className="tag difficulty">{question.format ?? "選擇題"}</span>
          {!question.exam && (
            <span className={`tag type ${question.type === "個案型" ? "case" : ""}`}>{question.type}</span>
          )}
        </div>
        <span className="question-number">第 {position} / {total} 題</span>
      </div>

      <div className="source-line">
        <span>{question.source}</span>
        {question.applicableCategories && <span>適用類科：{question.applicableCategories.join("、")}</span>}
        {question.sourceUrl && (
          <a href={question.sourceUrl} target="_blank" rel="noreferrer">官方試題 PDF ↗</a>
        )}
        {previousAnswer && <span>上次作答 {formatDate(previousAnswer.lastAnsweredAt)}</span>}
        <a
          className="report-issue-link"
          href={buildIssueUrl(question)}
          target="_blank"
          rel="noreferrer"
          title="以 GitHub Issue 回報題目、答案或解析的問題"
        >
          回報問題 ↗
        </a>
      </div>

      {(onToggleStarred || onToggleUncertain) && (
        <div className="question-tools" aria-label="題目工具">
          {onToggleStarred && (
            <button
              type="button"
              aria-label="收藏"
              aria-pressed={flags?.starred ?? false}
              className={flags?.starred ? "tool active" : "tool"}
              onClick={onToggleStarred}
            >
              ★ {flags?.starred ? "已收藏" : "收藏"}
            </button>
          )}
          {onToggleUncertain && (
            <button
              type="button"
              aria-label="不確定"
              aria-pressed={flags?.uncertain ?? false}
              className={flags?.uncertain ? "tool active" : "tool"}
              onClick={onToggleUncertain}
            >
              ？{flags?.uncertain ? "已標不確定" : "不確定"}
            </button>
          )}
        </div>
      )}

      {question.passage && (
        <section className="passage-box" aria-label="共用文章">
          <p className="eyebrow">PASSAGE｜第 {question.officialQuestionNumber} 題所屬題組</p>
          <p>{question.passage}</p>
        </section>
      )}
      <h2>{question.prompt}</h2>
      {isEssay ? (
        <>
          <p className="instruction">申論題依原始試卷完整收錄；考選部未提供官方擬答。</p>
          <div className="essay-callout">
            <div>
              <strong>{previousAnswer ? "已標記閱讀" : "讀完後可標記進度"}</strong>
              <p>目前保留原題與官方試卷連結，不以 AI 擬答冒充官方答案。</p>
            </div>
            <button onClick={onMarkRead}>{previousAnswer ? "再次標記" : "標記已閱讀"}</button>
          </div>
          {onSaveEssay && <EssayPracticePanel essay={essay} onSave={onSaveEssay} />}
          {navigation}
        </>
      ) : (
        <>
          <p className="instruction">請選出最適當的答案。點選選項後立即顯示官方答案。</p>
          <div className="options">
            {optionOrder.map((originalIndex, displayIndex) => {
              const option = question.options[originalIndex];
              const isCorrect = revealed && (
                question.allCredit ? selected === originalIndex : acceptedAnswers.includes(originalIndex)
              );
              const isWrong =
                revealed && !question.allCredit && selected === originalIndex && !acceptedAnswers.includes(originalIndex);
              return (
                <button
                  key={`${originalIndex}-${option}`}
                  className={`option ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  onClick={() => handleChoose(originalIndex)}
                  disabled={revealed}
                >
                  <span className="option-letter">{String.fromCharCode(65 + displayIndex)}</span>
                  <span>{option}</span>
                  {isCorrect && <b>{question.allCredit ? "給分" : "正確"}</b>}
                  {isWrong && <b>你的答案</b>}
                </button>
              );
            })}
          </div>
          {navigation}
        </>
      )}

      {!isEssay && !revealed ? (
        <div className="answer-hint">
          <span>答題提醒</span>
          先圈出關鍵事實，確認題目真正問的法律效果，再逐一套用要件。
        </div>
      ) : !isEssay ? (
        <QuestionAnalysis
          question={question}
          answeredCorrect={answeredCorrect}
          answerLabel={answerLabel}
          relatedQuestions={relatedQuestions}
          onOpenRelated={onOpenRelated}
        />
      ) : null}

      <footer className="question-footer">
        <button onClick={() => onMove(-1)}>← 上一題</button>
        <button className="next-button" onClick={() => onMove(1)}>下一題 →</button>
      </footer>
    </article>
  );
}
