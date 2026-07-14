"use client";

import type { Question } from "../data/questions";

/** 作答後顯示的判題結果與解析區塊。 */
export function QuestionAnalysis({
  question,
  answeredCorrect,
  answerLabel,
  relatedQuestions = [],
  onOpenRelated,
}: {
  question: Question;
  answeredCorrect: boolean;
  answerLabel: string;
  relatedQuestions?: Question[];
  onOpenRelated?: (question: Question) => void;
}) {
  return (
    <section
      className={answeredCorrect ? "analysis correct-analysis" : "analysis wrong-analysis"}
      aria-live="polite"
    >
      <div className="analysis-result">
        <span className="result-icon">{answeredCorrect ? "✓" : "!"}</span>
        <div>
          <p>{question.allCredit ? "官方更正答案" : answeredCorrect ? "判斷正確" : "本題答錯"}</p>
          <strong>{question.allCredit ? answerLabel : `答案是 ${answerLabel}`}</strong>
        </div>
        {question.confidence && (
          <span className={`confidence ${question.confidence === "高" ? "high" : "medium"}`}>
            解析信心 {question.confidence}
          </span>
        )}
      </div>

      {question.englishAnalysis ? (
        <>
          <div className="issue-box">
            <p className="eyebrow">考點</p>
            <h3>{question.englishAnalysis.skill}</h3>
          </div>
          <section className="english-translation-card">
            <p className="eyebrow">題目繁中翻譯</p>
            <p>{question.englishAnalysis.promptTranslation}</p>
            {question.englishAnalysis.passageTranslation && (
              <details>
                <summary>查看共用文章繁中翻譯</summary>
                <p>{question.englishAnalysis.passageTranslation}</p>
              </details>
            )}
          </section>
          <section className="option-study-table" aria-label="選項翻譯與詞性">
            <div className="option-study-heading">
              <p className="eyebrow">選項整理</p>
              <span>英文｜詞性｜繁中意思</span>
            </div>
            {question.englishAnalysis.optionNotes.map((option) => (
              <div
                className={option.correct ? "option-study-row correct" : "option-study-row"}
                key={option.label}
              >
                <b>{option.label}</b>
                <strong>{option.text}</strong>
                <span className="part-of-speech">{option.partOfSpeech}</span>
                <span>{option.translation}</span>
                {option.correct && <em>正解</em>}
              </div>
            ))}
          </section>
          <div className="english-analysis-grid">
            <div><span>01</span><h3>正確答案理由</h3><p>{question.englishAnalysis.answerReason}</p></div>
            <div><span>02</span><h3>關鍵句或文法結構</h3><p>{question.englishAnalysis.keyPoint}</p></div>
            {question.englishAnalysis.supportingSentence && (
              <div><span>03</span><h3>文章定位</h3><p>{question.englishAnalysis.supportingSentence}</p></div>
            )}
          </div>
          <div className="trap-note">
            <strong>干擾選項</strong>
            <p>{question.englishAnalysis.distractors}</p>
          </div>
          <div className="statutes">
            <p className="eyebrow">官方來源</p>
            {question.references.map((reference) => (
              <a
                key={`${reference.title}-${reference.locator ?? ""}`}
                href={reference.url}
                target="_blank"
                rel="noreferrer"
              >
                <span>{reference.title}{reference.locator ? `｜${reference.locator}` : ""}</span>
                <b>查看官方資料 ↗</b>
              </a>
            ))}
          </div>
          <p className="verification-note">
            答案以考選部公告為準；英文解析依官方文章、句法與語境自行整理，不轉載坊間題庫詳解。
          </p>
        </>
      ) : question.analysis ? (
        <>
          <div className="issue-box">
            <p className="eyebrow">題目在問什麼</p>
            <h3>{question.analysis.issue}</h3>
          </div>
          <div className="reasoning-grid">
            <div><span>01</span><h3>{question.subject === "chinese" ? "判讀原則" : "法律規則"}</h3><p>{question.analysis.rule}</p></div>
            <div><span>02</span><h3>{question.subject === "chinese" ? "解析" : "套入本題"}</h3><p>{question.analysis.application}</p></div>
            <div><span>03</span><h3>結論</h3><p>{question.analysis.conclusion}</p></div>
          </div>
          <div className="trap-note">
            <strong>{question.subject === "chinese" ? "選項辨析與常見誤區" : "常見誤區"}</strong>
            <p>{question.analysis.trap}</p>
          </div>
          {question.references.length > 0 && (
            <div className="statutes">
              <p className="eyebrow">官方依據</p>
              {question.references.map((reference) => (
                <a
                  key={`${reference.title}-${reference.locator ?? ""}`}
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{reference.title}{reference.locator ? `｜${reference.locator}` : ""}</span>
                  {reference.text && <p>{reference.text}</p>}
                  <b>查看官方資料 ↗</b>
                </a>
              ))}
            </div>
          )}
          <p className="verification-note">
            {question.subject === "chinese"
              ? "答案以考選部公告為準；解析依題文語境、典故與常用語義自行整理，不轉載坊間題庫詳解。"
              : "答案以考選部公告為準；解析由本站依命題時法、官方法條及實務資料自行整理，遇修法題已另行註明。"}
          </p>
        </>
      ) : (
        <div className="official-answer-note">
          <p className="eyebrow">OFFICIAL ANSWER</p>
          <h3>{question.answerSource ?? "考選部官方資料"}</h3>
          <p>
            考選部只公布標準答案、不提供解析。為避免 AI 誤判個案或引用錯誤法條，本批先忠實匯入題目與官方答案，解析將待逐題人工複核後再補上。
          </p>
          <div>
            {question.answerUrl && (
              <a href={question.answerUrl} target="_blank" rel="noreferrer">查看官方答案 PDF ↗</a>
            )}
            {question.sourceUrl && (
              <a href={question.sourceUrl} target="_blank" rel="noreferrer">查看原始試題 PDF ↗</a>
            )}
          </div>
        </div>
      )}

      {relatedQuestions.length > 0 && onOpenRelated && (
        <section className="related-questions" aria-label="考同一法條的其他題目">
          <p className="eyebrow">考同一法條的其他題目</p>
          <ul>
            {relatedQuestions.map((related) => (
              <li key={related.id}>
                <button type="button" onClick={() => onOpenRelated(related)}>
                  <span className="search-result-meta">
                    {related.subjectLabel}
                    {related.rocYear ? `｜${related.rocYear} 年` : "｜示範題"}
                    {related.officialQuestionNumber ? `｜第 ${related.officialQuestionNumber} 題` : ""}
                  </span>
                  <span className="search-result-prompt">{related.prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
