// 憲法逐題解析：內容為人工複核的種子檔（app/data/analyses/constitution-*.json），
// 依公開題解與官方法規、司法解釋改寫；不再使用主題模板自動產生。
import type { Reference } from "./references";
import seeds105 from "./analyses/constitution-105.json";
import seeds106 from "./analyses/constitution-106.json";
import seeds107 from "./analyses/constitution-107.json";
import seeds108 from "./analyses/constitution-108.json";
import seeds109 from "./analyses/constitution-109.json";
import seeds110 from "./analyses/constitution-110.json";
import seeds111 from "./analyses/constitution-111.json";
import seeds112 from "./analyses/constitution-112.json";
import seeds113 from "./analyses/constitution-113.json";
import seeds114 from "./analyses/constitution-114.json";

type ConstitutionQuestion = {
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
const JUDGMENTS_URL = "https://cons.judicial.gov.tw/docdata.aspx?fid=52";

// 題幹出現釋字或憲判字號時，補上官方解釋／裁判來源連結。
function decisionReferences(prompt: string): Reference[] {
  const references: Reference[] = [];
  for (const match of prompt.matchAll(/釋字第\s*(\d+)\s*號/g)) {
    references.push({
      type: "constitutional-decision",
      title: `司法院釋字第 ${match[1]} 號解釋`,
      locator: `解釋字號：釋字第 ${match[1]} 號；公布日期與完整意旨見官方解釋頁`,
      url: INTERPRETATIONS_URL,
      text: "本題應以該號解釋的解釋文及理由書所示具體意旨判斷，不以題目關鍵字代替原文核對。",
    });
  }
  for (const match of prompt.matchAll(/(\d{3})\s*年憲判字第\s*(\d+)\s*號/g)) {
    references.push({
      type: "constitutional-decision",
      title: `憲法法庭 ${match[1]} 年憲判字第 ${match[2]} 號判決`,
      locator: `裁判字號：${match[1]} 年憲判字第 ${match[2]} 號；判決日期與完整意旨見官方裁判頁`,
      url: JUDGMENTS_URL,
      text: "本題應依該判決主文及理由所建立的審查標準，並注意其與舊制司法院解釋的承接關係。",
    });
  }
  return references;
}

export function buildConstitutionAnalysis(question: ConstitutionQuestion) {
  const seed = seeds[question.id];
  if (!seed) throw new Error(`缺少憲法解析種子：${question.id}`);

  const accepted = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : question.answer === null
      ? []
      : [question.answer];
  const labels = accepted.map((index) => String.fromCharCode(65 + index)).join("／");
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

export const constitutionAnalysisCount = Object.keys(seeds).length;
