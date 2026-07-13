import criminalCodeJson from "./criminal-code-articles.json";
import analyses108 from "./analyses/criminal-law-108.json";
import analyses109 from "./analyses/criminal-law-109.json";
import analyses110 from "./analyses/criminal-law-110.json";
import analyses111 from "./analyses/criminal-law-111.json";
import analyses112 from "./analyses/criminal-law-112.json";
import analyses113 from "./analyses/criminal-law-113.json";
import analyses114 from "./analyses/criminal-law-114.json";

type AnalysisSeed = {
  issue: string;
  rule: string;
  application: string;
  trap: string;
  articles: string[];
  confidence?: "高" | "中";
};

type CriminalQuestionForAnalysis = {
  id: string;
  options: string[];
  answer: number | null;
  acceptedAnswers?: number[];
  allCredit: boolean;
};

const seeds = {
  ...analyses108,
  ...analyses109,
  ...analyses110,
  ...analyses111,
  ...analyses112,
  ...analyses113,
  ...analyses114,
} as Record<string, AnalysisSeed>;

const criminalCode = criminalCodeJson as { articles: Record<string, string> };
const criminalCodeUrl = (article: string) =>
  `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=${article}`;

export function buildCriminalAnalysis(question: CriminalQuestionForAnalysis) {
  const seed = seeds[question.id];
  if (!seed) return null;

  const accepted = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : question.answer === null ? [] : [question.answer];
  const labels = accepted.map((index) => String.fromCharCode(65 + index)).join("、");
  const conclusion = question.allCredit
    ? "考選部更正為一律給分；各選項均不作為唯一正解。"
    : accepted.length > 1
      ? `考選部更正接受 ${labels}，兩個選項均按官方公告判定正確。`
      : `依命題時法及考選部官方答案，應選 ${labels}。`;

  return {
    confidence: seed.confidence ?? "中",
    analysis: { ...seed, conclusion },
    statutes: seed.articles.map((article) => ({
      article,
      lawName: "刑法",
      text: criminalCode.articles[article] ?? "請點擊查看官方現行條文。",
      url: criminalCodeUrl(article),
    })),
  };
}

export const criminalAnalysisCount = Object.keys(seeds).length;
