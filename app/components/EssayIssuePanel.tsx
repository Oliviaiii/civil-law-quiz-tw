"use client";

import { useEffect, useMemo, useState } from "react";
import type { EssayAnnotation } from "../data/essay-issues";
import type { Question } from "../data/questions";

type EssayIssueModule = typeof import("../data/essay-issues");

const ISSUE_SUBJECTS = new Set<Question["subject"]>([
  "civil-law",
  "criminal-law",
  "administrative-law",
  "civil-procedure",
  "criminal-procedure",
]);

type IssueItem = {
  id: string;
  kind: "primary" | "secondary";
  index: number;
};

function issueIdsOf(annotation: EssayAnnotation) {
  return [...annotation.primaryIssueIds, ...annotation.secondaryIssueIds];
}

function chapterLabelOf(module: EssayIssueModule, issueId: string) {
  const [subject, chapter] = issueId.split(".");
  return module.essayIssueTaxonomy.chapters[subject]?.[chapter] ?? "其他爭點";
}

function subpartLabelsOf(annotation: EssayAnnotation, issueId: string) {
  return annotation.subparts
    .filter((subpart) => subpart.issueIds.includes(issueId))
    .map((subpart) => subpart.label);
}

/** 申論題的本站整理考點：按需載入資料，避免增加首頁初始題庫負擔。 */
export function EssayIssuePanel({
  question,
  availableQuestions,
  onOpenQuestion,
}: {
  question: Question;
  availableQuestions: Question[];
  onOpenQuestion?: (question: Question) => void;
}) {
  const [issueModule, setIssueModule] = useState<EssayIssueModule | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const hasIssueCoverage = ISSUE_SUBJECTS.has(question.subject);

  useEffect(() => {
    if (!hasIssueCoverage) return;
    let active = true;
    import("../data/essay-issues").then((module) => {
      if (active) setIssueModule(module);
    });
    return () => {
      active = false;
    };
  }, [hasIssueCoverage]);

  const questionById = useMemo(
    () => new Map(availableQuestions.map((item) => [item.id, item])),
    [availableQuestions],
  );

  if (!hasIssueCoverage) return null;

  if (!issueModule) {
    return (
      <section className="essay-issues loading" aria-label="申論考點" aria-busy="true">
        <p>正在載入本站整理的申論考點…</p>
      </section>
    );
  }

  const annotation = issueModule.essayAnnotationByQuestionId[question.id];
  if (!annotation) return null;

  const issues: IssueItem[] = [
    ...annotation.primaryIssueIds.map((id, index) => ({ id, kind: "primary" as const, index })),
    ...annotation.secondaryIssueIds.map((id, index) => ({ id, kind: "secondary" as const, index })),
  ];
  const activeIssueId = selectedIssueId && issues.some((issue) => issue.id === selectedIssueId)
    ? selectedIssueId
    : null;
  const activeIssue = issues.find((issue) => issue.id === activeIssueId);
  const activeRelatedAnnotations = activeIssue
    ? issueModule.essayAnnotations.filter((item) => issueIdsOf(item).includes(activeIssue.id))
    : [];

  return (
    <section className="essay-issues" aria-labelledby={`essay-issues-${question.id}`}>
      <div className="essay-issues-heading">
        <div>
          <p className="eyebrow">本站整理・資料草稿</p>
          <h3 id={`essay-issues-${question.id}`}>申論考點</h3>
        </div>
        <span className="essay-review-badge">尚未人工複核</span>
      </div>

      <p className="essay-gist">{annotation.gist}</p>
      {annotation.lawVersionNote && (
        <p className="essay-law-version">
          <strong>法規版本提醒</strong>
          {annotation.lawVersionNote}
        </p>
      )}

      <div className="essay-issue-actions" aria-label="本題爭點">
        {issues.map((issue) => {
          const relatedCount = issueModule.essayAnnotations.filter((item) =>
            issueIdsOf(item).includes(issue.id),
          ).length;
          const kindLabel = issue.kind === "primary" ? "主要爭點" : "次要爭點";
          const subparts = subpartLabelsOf(annotation, issue.id);
          return (
            <button
              key={issue.id}
              type="button"
              className={activeIssueId === issue.id ? "active" : ""}
              aria-expanded={activeIssueId === issue.id}
              aria-controls={`essay-issue-detail-${question.id}`}
              onClick={() => setSelectedIssueId(activeIssueId === issue.id ? null : issue.id)}
            >
              <span>{kindLabel} {issue.index + 1}</span>
              <strong>{chapterLabelOf(issueModule, issue.id)}</strong>
              <small>
                {subparts.length > 0 ? `子題：${subparts.join("、")}・` : ""}
                相關 {relatedCount} 題
              </small>
            </button>
          );
        })}
      </div>

      {activeIssue && (
        <div
          className="essay-issue-detail"
          id={`essay-issue-detail-${question.id}`}
          aria-live="polite"
        >
          <div className="essay-issue-detail-heading">
            <div>
              <span>{activeIssue.kind === "primary" ? "主要爭點" : "次要爭點"}</span>
              <h4>{chapterLabelOf(issueModule, activeIssue.id)}</h4>
            </div>
            <code title="本站內部使用的穩定爭點代碼">{activeIssue.id}</code>
          </div>

          <p>
            目前有 {activeRelatedAnnotations.length} 題使用同一爭點標籤；點選其他題目即可直接切換練習。
          </p>
          <ul>
            {activeRelatedAnnotations.map((relatedAnnotation) => {
              const relatedQuestion = questionById.get(relatedAnnotation.questionId);
              const isCurrent = relatedAnnotation.questionId === question.id;
              return (
                <li key={relatedAnnotation.questionId} className={isCurrent ? "current" : ""}>
                  {isCurrent || !relatedQuestion ? (
                    <div>
                      <strong>{isCurrent ? "目前題目" : relatedAnnotation.questionId}</strong>
                      <span>{relatedQuestion?.source ?? "題目尚未載入"}</span>
                    </div>
                  ) : (
                    <button type="button" onClick={() => onOpenQuestion?.(relatedQuestion)}>
                      <strong>前往題目</strong>
                      <span>{relatedQuestion.source}</span>
                    </button>
                  )}
                  <p>{relatedAnnotation.gist}</p>
                </li>
              );
            })}
          </ul>
          <p className="essay-issue-disclaimer">
            此處是歷屆題目的整理標籤，不是官方擬答，也不代表未來命題預測。
          </p>
        </div>
      )}
    </section>
  );
}
