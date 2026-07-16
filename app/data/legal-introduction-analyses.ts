// 法學緒論逐題解析：內容為人工複核的種子檔（app/data/analyses/legal-introduction-*.json），
// 依公開題解與官方法規、司法解釋改寫；不再使用主題模板自動產生。
import type { Reference } from "./references";
import seeds105 from "./analyses/legal-introduction-105.json";
import seeds106 from "./analyses/legal-introduction-106.json";
import seeds107 from "./analyses/legal-introduction-107.json";
import seeds108 from "./analyses/legal-introduction-108.json";
import seeds109 from "./analyses/legal-introduction-109.json";
import seeds110 from "./analyses/legal-introduction-110.json";
import seeds111 from "./analyses/legal-introduction-111.json";
import seeds112 from "./analyses/legal-introduction-112.json";
import seeds113 from "./analyses/legal-introduction-113.json";
import seeds114 from "./analyses/legal-introduction-114.json";

type LegalIntroductionQuestion = {
  id: string;
  rocYear: number;
  prompt: string;
  options: string[];
  answer: number | null;
  acceptedAnswers?: number[] | null;
  allCredit?: boolean;
};

type SeedReference = {
  type: Reference["type"];
  title: string;
  locator?: string;
  url: string;
  text?: string;
};

type AnalysisSeed = {
  issue: string;
  rule: string;
  application: string;
  trap: string;
  confidence?: "高" | "中";
  references: SeedReference[];
};

const seeds = {
  ...seeds105,
  ...seeds106,
  ...seeds107,
  ...seeds108,
  ...seeds109,
  ...seeds110,
  ...seeds111,
  ...seeds112,
  ...seeds113,
  ...seeds114,
} as unknown as Record<string, AnalysisSeed>;

const INTERPRETATIONS_URL = "https://cons.judicial.gov.tw/docdata.aspx?fid=100";

// 題幹出現釋字時，補上官方解釋來源連結。
function decisionReferences(prompt: string): Reference[] {
  return [...prompt.matchAll(/釋字第\s*(\d+)\s*號/g)].map((match) => ({
    type: "constitutional-decision" as const,
    title: `司法院釋字第 ${match[1]} 號解釋`,
    locator: `解釋字號：釋字第 ${match[1]} 號`,
    url: INTERPRETATIONS_URL,
    text: "應以官方解釋文及理由書的完整意旨核對題目敘述。",
  }));
}

export function buildLegalIntroductionAnalysis(question: LegalIntroductionQuestion) {
  const seed = seeds[question.id];
  // 尚未補上逐題種子者回傳 null，由題庫降級為「官方答案，解析整理中」卡片，避免整科載入失敗。
  if (!seed) return null;

  const accepted = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : question.answer === null
      ? []
      : [question.answer];
  const labels = accepted.map((answer) => String.fromCharCode(65 + answer)).join("／");
  const conclusion = question.allCredit
    ? "考選部公告本題一律給分；各選項均不作為唯一正解。"
    : accepted.length > 1
      ? `考選部更正答案接受 ${labels}，均依官方公告判定正確。`
      : `依考選部官方答案，本題選 ${labels}。`;

  const seedReferences: Reference[] = seed.references.map((reference) => ({
    type: reference.type,
    title: reference.title,
    locator: reference.locator,
    url: reference.url,
    text: reference.text,
  }));
  const decisions = decisionReferences(question.prompt).filter(
    (decision) => !seedReferences.some((reference) => reference.title === decision.title),
  );

  return {
    confidence: seed.confidence ?? "中",
    analysis: {
      issue: seed.issue,
      rule: seed.rule,
      application: seed.application,
      conclusion,
      trap: seed.trap,
    },
    references: [...seedReferences, ...decisions],
  };
}

export const legalIntroductionAnalysisCount = Object.keys(seeds).length;
