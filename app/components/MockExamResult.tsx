"use client";

import type { Question } from "../data/questions";
import {
  judgeMockAnswer,
  mockScorePerQuestion,
  roundScore,
  type MockExamState,
} from "../lib/mock-exam";

function answerLabelOf(question: Question): string {
  if (question.allCredit) return "一律給分";
  const accepted = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : question.answer === null ? [] : [question.answer];
  return accepted.map((index) => String.fromCharCode(65 + index)).join(" 或 ") || "未公布";
}

/** 交卷後的成績頁：總分、分科結果與錯題清單。 */
export function MockExamResult({
  exam,
  questions,
  onReviewQuestion,
  onDismiss,
}: {
  exam: MockExamState;
  questions: (Question | undefined)[];
  onReviewQuestion: (question: Question) => void;
  onDismiss: () => void;
}) {
  const resolved = exam.ids
    .map((id, index) => ({ id, index, question: questions[index] }))
    .filter((item): item is { id: string; index: number; question: Question } =>
      Boolean(item.question),
    );
  const perQuestion = mockScorePerQuestion(exam.ids.length);
  const judged = resolved.map((item) => ({
    ...item,
    selected: exam.answers[item.id],
    correct: judgeMockAnswer(item.question, exam.answers[item.id]),
  }));
  const correctCount = judged.filter((item) => item.correct).length;
  const totalScore = roundScore(correctCount * perQuestion);
  const wrongItems = judged.filter((item) => !item.correct);

  const subjectGroups = Array.from(
    judged.reduce((groups, item) => {
      const label = item.question.subjectLabel;
      const group = groups.get(label) ?? { label, correct: 0, total: 0 };
      group.total += 1;
      if (item.correct) group.correct += 1;
      groups.set(label, group);
      return groups;
    }, new Map<string, { label: string; correct: number; total: number }>()).values(),
  );

  return (
    <div className="mock-result">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RESULT</p>
          <h1>模擬考結果</h1>
          <p>{exam.label}</p>
        </div>
        <div className="result-summary">
          <span>總分</span>
          <strong>{totalScore}</strong>
          <small>{correctCount} / {exam.ids.length} 題答對</small>
        </div>
      </div>

      <p className="mock-scoring-note">
        配分規則（自訂）：每題 {perQuestion.toFixed(1)} 分、滿分 100。答對得分；官方一律給分題一律得分；
        官方公告複數答案任一皆得分；未作答與答錯不得分、不倒扣。成績只保存在這台裝置的瀏覽器。
      </p>

      <section className="mock-subject-breakdown" aria-label="分科結果">
        {subjectGroups.map((group) => (
          <div className="chapter-row" key={group.label}>
            <strong>{group.label}</strong>
            <div className="chapter-track">
              <i style={{ width: `${(group.correct / group.total) * 100}%` }} />
            </div>
            <span>{group.correct}/{group.total} 答對</span>
            <b>{roundScore(group.correct * perQuestion)} 分</b>
          </div>
        ))}
      </section>

      <section className="mock-wrong-list" aria-label="錯題清單">
        <div className="section-title">
          <div>
            <p className="eyebrow">REVIEW</p>
            <h2>錯題與未作答清單（{wrongItems.length} 題）</h2>
          </div>
        </div>
        {wrongItems.length === 0 ? (
          <p className="mock-scoring-note">全部答對，太強了！</p>
        ) : (
          <ul>
            {wrongItems.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onReviewQuestion(item.question)}>
                  <span className="search-result-meta">
                    第 {item.index + 1} 題｜{item.question.subjectLabel}
                    ｜官方答案 {answerLabelOf(item.question)}
                    ｜你的答案 {item.selected === undefined ? "未作答" : String.fromCharCode(65 + item.selected)}
                  </span>
                  <span className="search-result-prompt">{item.question.prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mock-result-actions">
        <button type="button" className="practice-set-start" onClick={onDismiss}>
          關閉結果並結束模擬考
        </button>
      </div>
    </div>
  );
}
