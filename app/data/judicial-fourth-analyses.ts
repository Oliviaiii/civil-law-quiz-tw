import civilCodeJson from "./civil-code-articles.json";
import analyses108 from "./analyses/judicial-fourth-108.json";
import analyses109 from "./analyses/judicial-fourth-109.json";
import analyses110 from "./analyses/judicial-fourth-110.json";
import analyses111 from "./analyses/judicial-fourth-111.json";
import analyses112 from "./analyses/judicial-fourth-112.json";
import analyses113 from "./analyses/judicial-fourth-113.json";
import analyses114 from "./analyses/judicial-fourth-114.json";
import reviews108 from "./analyses/civil-option-reviews-108.json";
import reviews109 from "./analyses/civil-option-reviews-109.json";
import reviews110 from "./analyses/civil-option-reviews-110.json";
import reviews111 from "./analyses/civil-option-reviews-111.json";
import reviews112 from "./analyses/civil-option-reviews-112.json";
import reviews113 from "./analyses/civil-option-reviews-113.json";
import reviews114 from "./analyses/civil-option-reviews-114.json";

type StatuteSeed =
  | string
  | {
      article: string;
      text: string;
      lawName?: string;
      url?: string;
    };

type AnalysisSeed = {
  issue: string;
  rule: string;
  application: string;
  trap: string;
  articles: StatuteSeed[];
  confidence?: "高" | "中";
};

type OptionReview = {
  intro?: string;
  A: string;
  B: string;
  C: string;
  D: string;
};

type OfficialQuestionForAnalysis = {
  id: string;
  prompt: string;
  options: string[];
  answer: number | null;
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

const optionReviews = {
  ...reviews108,
  ...reviews109,
  ...reviews110,
  ...reviews111,
  ...reviews112,
  ...reviews113,
  ...reviews114,
} as Record<string, OptionReview>;

const civilCode = civilCodeJson as {
  articles: Record<string, string>;
};

const civilCodeUrl = (article: string) =>
  `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=${article}`;

export function buildOfficialAnalysis(question: OfficialQuestionForAnalysis) {
  const seed = seeds[question.id];
  const optionReview = optionReviews[question.id];
  if (!seed || !optionReview) return null;

  const answerLabel = question.allCredit
    ? "一律給分"
    : question.answer === null
      ? "未公告"
      : String.fromCharCode(65 + question.answer);
  const answerText =
    question.answer === null ? "" : question.options[question.answer] ?? "";

  return {
    confidence: seed.confidence ?? (question.allCredit ? "中" : "高"),
    analysis: {
      issue: seed.issue,
      rule: seed.rule,
      application: optionReview,
      conclusion: question.allCredit
        ? "考選部更正為一律給分；各選項均不宜作為唯一正解。"
        : `關鍵敘述是「${answerText}」，依官方答案應選 ${answerLabel}。`,
      trap: seed.trap,
    },
    statutes: seed.articles.map((item) => {
      if (typeof item !== "string") {
        return {
          article: item.article,
          lawName: item.lawName ?? "民法",
          text: item.text,
          url: item.url ?? civilCodeUrl(item.article),
        };
      }
      return {
        article: item,
        lawName: "民法",
        text: civilCode.articles[item] ?? "請點擊查看官方現行條文。",
        url: civilCodeUrl(item),
      };
    }),
  };
}

export const officialAnalysisCount = Object.keys(seeds).length;
export const officialOptionReviewCount = Object.keys(optionReviews).length;
