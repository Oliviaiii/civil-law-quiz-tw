import administrativeLawJson from "./essay-issues/administrative-law.json";
import civilLawJson from "./essay-issues/civil-law.json";
import civilProcedureJson from "./essay-issues/civil-procedure.json";
import criminalLawJson from "./essay-issues/criminal-law.json";
import criminalProcedureJson from "./essay-issues/criminal-procedure.json";
import taxonomyJson from "./essay-issues/taxonomy.json";
import type { Subject } from "./questions";

export type EssayReviewStatus = "draft" | "reviewed";
export type EssayConfidence = "low" | "medium" | "high";

export type EssaySubpart = {
  label: string;
  issueIds: string[];
};

export type EssayAnnotation = {
  questionId: string;
  gist: string;
  primaryIssueIds: string[];
  secondaryIssueIds: string[];
  subparts: EssaySubpart[];
  lawVersionNote: string | null;
  confidence: EssayConfidence;
  reviewStatus: EssayReviewStatus;
  references: string[];
};

type StoredEssayAnnotation = Omit<EssayAnnotation, "questionId">;

export type EssayIssueTaxonomy = {
  version: number;
  description: string;
  subjects: Record<string, { subject: Subject; label: string }>;
  chapters: Record<string, Record<string, string>>;
};

const annotationSources = [
  civilLawJson,
  criminalLawJson,
  administrativeLawJson,
  civilProcedureJson,
  criminalProcedureJson,
] as Record<string, StoredEssayAnnotation>[];

export const essayAnnotations: EssayAnnotation[] = annotationSources.flatMap((source) =>
  Object.entries(source).map(([questionId, annotation]) => ({
    questionId,
    ...annotation,
  })),
);

export const essayAnnotationByQuestionId = Object.fromEntries(
  essayAnnotations.map((annotation) => [annotation.questionId, annotation]),
) as Record<string, EssayAnnotation>;

export const essayIssueTaxonomy = taxonomyJson as EssayIssueTaxonomy;
