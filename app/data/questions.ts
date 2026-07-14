import officialRecordsJson from "./judicial-fourth-questions.json";
import criminalRecordsJson from "./criminal-law-questions.json";
import combinedPaperRecordsJson from "./legal-knowledge-and-english-questions.json";
import { buildOfficialAnalysis } from "./judicial-fourth-analyses";
import { buildCriminalAnalysis } from "./criminal-law-analyses";
import { buildConstitutionAnalysis } from "./constitution-analyses";
import { buildLegalIntroductionAnalysis } from "./legal-introduction-analyses";
import { buildEnglishAnalysis, type EnglishAnalysis } from "./english-analyses";
import type { Reference } from "./references";

export type Subject =
  | "civil-law"
  | "criminal-law"
  | "constitution"
  | "legal-introduction"
  | "english";

export type Paper =
  | "civil-law-summary"
  | "criminal-law-summary"
  | "legal-knowledge-and-english";

export type Question = {
  id: string;
  category: "總則" | "債編" | "物權" | "親屬與繼承" | "待分類";
  type: "概念型" | "個案型";
  difficulty: "基礎" | "進階";
  format?: "選擇題" | "申論題";
  source: string;
  sourceUrl?: string;
  answerUrl?: string | null;
  answerSource?: string | null;
  rocYear?: number;
  gregorianYear?: number;
  exam?: string;
  subject: Subject;
  subjectLabel: string;
  paper: Paper;
  officialQuestionNumber?: number;
  applicableCategories?: string[];
  prompt: string;
  options: string[];
  answer: number | null;
  allCredit?: boolean;
  acceptedAnswers?: number[] | null;
  confidence?: "高" | "中";
  analysis?: {
    issue: string;
    rule: string;
    application: string;
    conclusion: string;
    trap: string;
  };
  englishAnalysis?: EnglishAnalysis;
  passageId?: string;
  passage?: string;
  statutes: { article: string; lawName?: string; text: string; url: string }[];
  references: Reference[];
};

const lawUrl = (article: string) =>
  `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=${article}`;

const demoQuestions: Array<Omit<Question, "subject" | "subjectLabel" | "paper" | "references">> = [
  {
    id: "demo-001",
    category: "總則",
    type: "概念型",
    difficulty: "基礎",
    source: "自行編寫示範題｜依現行民法",
    prompt: "依我國現行民法，關於成年的敘述，下列何者正確？",
    options: ["滿十六歲為成年", "滿十八歲為成年", "滿二十歲為成年", "結婚後一律視為成年"],
    answer: 1,
    confidence: "高",
    analysis: {
      issue: "成年年齡的法定界線是多少？",
      rule: "民法第 12 條明定，滿十八歲為成年。",
      application: "題目只問法定成年年齡，不需要加入職業、婚姻或經濟獨立等額外條件。",
      conclusion: "滿十八歲即為成年，應選 B。",
      trap: "我國成年年齡已由二十歲調降為十八歲，舊題或舊教材可能仍留有二十歲的說法。",
    },
    statutes: [{ article: "12", text: "滿十八歲為成年。", url: lawUrl("12") }],
  },
  {
    id: "demo-002",
    category: "總則",
    type: "個案型",
    difficulty: "進階",
    source: "自行編寫示範題｜無權處分",
    prompt: "甲將名錶借給乙。乙未經甲同意，以自己名義將名錶賣給明知乙非所有人的丙，並已交付。甲尚未承認該處分。關於乙移轉名錶所有權的效力，何者最適當？",
    options: ["自始有效，因丙已受交付", "自始無效，且永遠不能補正", "效力未定，經甲承認始生效力", "構成無權代理，由乙負代理人責任"],
    answer: 2,
    confidence: "中",
    analysis: {
      issue: "乙是以自己名義處分他人之物，屬無權處分，還是以甲名義行為的無權代理？",
      rule: "無權利人就權利標的物所為的處分，依民法第 118 條，經有權利人承認始生效力。無權代理則要求行為人以本人名義為法律行為。",
      application: "乙以自己名義讓與甲的名錶，屬無權處分。丙明知乙無權利，無從主張善意取得；在甲承認前，所有權移轉效力未定。",
      conclusion: "須經甲承認才生效，應選 C。",
      trap: "『處分別人的物』不等於『代理別人』。先看乙是用誰的名義行為，再區分無權處分與無權代理。",
    },
    statutes: [{ article: "118", text: "無權利人就權利標的物所為之處分，經有權利人之承認始生效力。", url: lawUrl("118") }],
  },
  {
    id: "demo-003",
    category: "總則",
    type: "個案型",
    difficulty: "進階",
    source: "自行編寫示範題｜表見代理",
    prompt: "甲明知乙長期對外自稱為甲的採購代理人，且多次在場聽見卻從未反對。善意且無過失的丙因而與乙締約。乙實際上並無代理權。下列何者最適當？",
    options: ["甲原則上應對丙負授權人責任", "契約當然無效，甲絕不負責", "僅乙口頭自稱即可使甲負責", "丙是否明知乙無代理權並不重要"],
    answer: 0,
    confidence: "中",
    analysis: {
      issue: "本人知悉他人表示為其代理人而不反對時，是否成立表見代理？",
      rule: "民法第 169 條規定，本人知他人表示為其代理人而不為反對表示者，原則上對第三人負授權人責任；但第三人明知或可得而知無代理權者除外。",
      application: "甲明知乙對外以代理人身分行為而不反對，丙又善意且無過失，符合表見代理保護交易安全的要件。",
      conclusion: "甲原則上應負授權人責任，應選 A。",
      trap: "不是任何人的單方自稱都能成立表見代理；必須有可歸責於本人的外觀，並檢查第三人是否善意無過失。",
    },
    statutes: [{ article: "169", text: "知他人表示為其代理人而不為反對之表示者，對於第三人應負授權人之責任。但第三人明知其無代理權或可得而知者，不在此限。", url: lawUrl("169") }],
  },
  {
    id: "demo-004",
    category: "總則",
    type: "個案型",
    difficulty: "進階",
    source: "自行編寫示範題｜限制行為能力",
    prompt: "十七歲的甲未得法定代理人同意，向乙購買一台價格五萬元、非日常生活所必需的遊戲主機。乙亦不知道甲尚未成年。該買賣契約效力如何？",
    options: ["當然有效", "當然無效", "經甲的法定代理人承認始生效力", "因乙不知情，所以甲不得撤銷"],
    answer: 2,
    confidence: "高",
    analysis: {
      issue: "限制行為能力人未得允許所訂契約，是無效、可撤銷，還是效力未定？",
      rule: "限制行為能力人未得法定代理人允許所訂立的契約，依民法第 79 條，須經法定代理人承認始生效力；純獲法律上利益或日常生活所必需者例外。",
      application: "五萬元遊戲主機並非純獲利益，題目也明示非日常生活必需。甲未得允許，契約效力取決於法定代理人是否承認。",
      conclusion: "契約效力未定，經承認始生效，應選 C。",
      trap: "常把『效力未定』誤選成『無效』或『得撤銷』。另外，相對人不知未成年並不會直接讓契約有效。",
    },
    statutes: [{ article: "79", text: "限制行為能力人未得法定代理人之允許，所訂立之契約，須經法定代理人之承認，始生效力。", url: lawUrl("79") }],
  },
  {
    id: "demo-005",
    category: "債編",
    type: "概念型",
    difficulty: "基礎",
    source: "自行編寫示範題｜契約成立",
    prompt: "商店將商品標定售價後陳列於架上。依民法規定，該行為原則上屬於何者？",
    options: ["要約", "要約之引誘", "承諾", "懸賞廣告"],
    answer: 0,
    confidence: "高",
    analysis: {
      issue: "標價陳列商品是要約，還是僅邀請顧客提出要約？",
      rule: "民法第 154 條第 2 項明定，貨物標定賣價陳列者視為要約；價目表的寄送則不視為要約。",
      application: "題目具備『貨物』『標定賣價』『陳列』三個關鍵字，直接符合條文。",
      conclusion: "原則上視為要約，應選 A。",
      trap: "不要把其他法系或一般商業直覺直接套入；我國民法對標價陳列有明文規定。",
    },
    statutes: [{ article: "154", text: "貨物標定賣價陳列者，視為要約。但價目表之寄送，不視為要約。", url: lawUrl("154") }],
  },
  {
    id: "demo-006",
    category: "債編",
    type: "概念型",
    difficulty: "基礎",
    source: "自行編寫示範題｜消滅時效",
    prompt: "除法律另有較短期間的特別規定外，一般請求權因多久不行使而消滅？",
    options: ["二年", "五年", "十年", "十五年"],
    answer: 3,
    confidence: "高",
    analysis: {
      issue: "一般請求權的消滅時效期間多長？",
      rule: "民法第 125 條規定，請求權因十五年間不行使而消滅；法律所定期間較短者，依其規定。",
      application: "題目已排除特別短期時效，因此適用一般十五年期間。",
      conclusion: "應選 D，十五年。",
      trap: "侵權損害賠償、利息或特定職業報酬另有短期時效，作答前要先看題目是否屬特別規定。",
    },
    statutes: [{ article: "125", text: "請求權，因十五年間不行使而消滅。但法律所定期間較短者，依其規定。", url: lawUrl("125") }],
  },
  {
    id: "demo-007",
    category: "物權",
    type: "個案型",
    difficulty: "進階",
    source: "自行編寫示範題｜善意取得",
    prompt: "乙無權處分甲所有的相機，將相機交付給丙。丙在受讓時明知相機屬於甲。丙能否主張善意取得相機所有權？",
    options: ["可以，只要已完成交付", "可以，只要支付合理價金", "不可以，因丙受讓時並非善意", "不可以，因動產一律不能善意取得"],
    answer: 2,
    confidence: "高",
    analysis: {
      issue: "動產受讓人明知讓與人無權利，是否仍受善意取得制度保護？",
      rule: "民法第 948 條保護善意受讓動產占有者；受讓人明知或因重大過失而不知讓與人無讓與權利時，不受保護。",
      application: "丙在受讓時明知相機屬甲，欠缺善意。即使已有交付或支付合理價金，也不能補足善意要件。",
      conclusion: "丙不能善意取得，應選 C。",
      trap: "交付只是要件之一，不是『一交付就取得』。還要逐一檢查善意、無重大過失及其他要件。",
    },
    statutes: [{ article: "948", text: "善意受讓該動產之占有者，其占有受法律保護。但明知或因重大過失而不知讓與人無權利者，不在此限。", url: lawUrl("948") }],
  },
  {
    id: "demo-008",
    category: "物權",
    type: "概念型",
    difficulty: "基礎",
    source: "自行編寫示範題｜所有物返還",
    prompt: "所有人對於無權占有其所有物者，得依民法行使何種權利？",
    options: ["僅得請求損害賠償", "得請求返還所有物", "只能請求法院代為出售", "占有人善意時一律不得請求"],
    answer: 1,
    confidence: "高",
    analysis: {
      issue: "所有人面對無權占有人，最直接的物權請求權為何？",
      rule: "民法第 767 條第 1 項賦予所有人返還、除去妨害及防止妨害的請求權。",
      application: "題目明示對方是無權占有人，因此所有人得請求返還所有物。",
      conclusion: "應選 B。",
      trap: "返還請求權與損害賠償請求權的成立要件不同；題目只問取回所有物，不必先證明損害。",
    },
    statutes: [{ article: "767", text: "所有人對於無權占有或侵奪其所有物者，得請求返還之。", url: lawUrl("767") }],
  },
  {
    id: "demo-009",
    category: "親屬與繼承",
    type: "個案型",
    difficulty: "基礎",
    source: "自行編寫示範題｜應繼分",
    prompt: "甲死亡，未留遺囑，遺有配偶乙及兩名子女丙、丁，且無其他影響繼承的事由。乙、丙、丁的法定應繼分各為多少？",
    options: ["乙二分之一，丙、丁各四分之一", "三人各三分之一", "乙全部繼承", "乙三分之二，丙、丁各六分之一"],
    answer: 1,
    confidence: "高",
    analysis: {
      issue: "配偶與第一順位直系血親卑親屬共同繼承時，應繼分如何分配？",
      rule: "依民法第 1144 條第 1 款，配偶與第 1138 條第一順位繼承人同為繼承時，應繼分與其他繼承人平均。",
      application: "乙為配偶，丙、丁為第一順位子女，共三名繼承人，依法平均分配。",
      conclusion: "三人各三分之一，應選 B。",
      trap: "配偶不是在所有情形都固定取得二分之一；其比例會依共同繼承人的順位而變化。",
    },
    statutes: [{ article: "1144", text: "配偶與第一千一百三十八條所定第一順序之繼承人同為繼承時，其應繼分與他繼承人平均。", url: lawUrl("1144") }],
  },
  {
    id: "demo-010",
    category: "債編",
    type: "概念型",
    difficulty: "進階",
    source: "自行編寫示範題｜侵權時效",
    prompt: "因侵權行為所生的損害賠償請求權，自請求權人知有損害及賠償義務人時起，原則上多久不行使而消滅？",
    options: ["一年", "二年", "五年", "十五年"],
    answer: 1,
    confidence: "高",
    analysis: {
      issue: "侵權行為損害賠償請求權的主觀短期時效為多久？",
      rule: "民法第 197 條第 1 項規定，自知有損害及賠償義務人時起，二年間不行使而消滅；自侵權行為時起逾十年者亦同。",
      application: "題目問的是『知有損害及賠償義務人時起』的主觀期間，所以是二年。",
      conclusion: "應選 B，二年。",
      trap: "同一條文同時有二年主觀期間與十年客觀期間，要抓準題目指定的起算點。",
    },
    statutes: [{ article: "197", text: "因侵權行為所生之損害賠償請求權，自請求權人知有損害及賠償義務人時起，二年間不行使而消滅。", url: lawUrl("197") }],
  },
];

type OfficialQuestionRecord = {
  id: string;
  exam: string;
  rocYear: number;
  gregorianYear: number;
  subject: string;
  studySubject?: string;
  paper?: "civil-law-summary" | "criminal-law-summary";
  applicableCategories: string[];
  sourceUrl: string;
  format: "選擇題" | "申論題";
  officialQuestionNumber: number;
  prompt: string;
  options: string[];
  answer: number | null;
  acceptedAnswers?: number[];
  allCredit: boolean;
  answerSource: string | null;
  answerUrl: string | null;
};

const civilOfficialQuestions: Question[] = (
  officialRecordsJson as OfficialQuestionRecord[]
).map((record) => {
  const normalized = {
    ...record,
    acceptedAnswers: record.acceptedAnswers?.length
      ? record.acceptedAnswers
      : record.answer === null ? [] : [record.answer],
  };
  const explanation = buildOfficialAnalysis(normalized);
  return {
    ...normalized,
    subject: "civil-law" as const,
    subjectLabel: record.subject,
    paper: "civil-law-summary" as const,
    category: "待分類" as const,
    type: (record.format === "申論題" ? "個案型" : "概念型") as Question["type"],
    difficulty: "進階" as const,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜第 ${record.officialQuestionNumber} 題`,
    confidence: explanation?.confidence,
    analysis: explanation?.analysis,
    statutes: explanation?.statutes ?? [],
    references: (explanation?.statutes ?? []).map((statute) => ({
      type: "statute" as const,
      title: statute.lawName ?? "民法",
      locator: `第 ${statute.article} 條`,
      url: statute.url,
      text: statute.text,
    })),
  };
});

type CombinedPaperRecord = {
  id: string;
  exam: string;
  rocYear: number;
  gregorianYear: number;
  paper: "legal-knowledge-and-english";
  paperTitle: string;
  subject: "constitution" | "legal-introduction" | "english";
  applicableCategories: string[];
  sourceUrl: string;
  format: "選擇題";
  officialQuestionNumber: number;
  prompt: string;
  options: string[];
  answer: number;
  acceptedAnswers: number[] | null;
  allCredit: boolean;
  answerSource: string;
  answerUrl: string;
  humanVerified: boolean;
  passageId?: string;
  passage?: string;
};

const criminalOfficialQuestions: Question[] = (
  criminalRecordsJson as OfficialQuestionRecord[]
).map((record) => {
  const explanation = buildCriminalAnalysis(record);
  return {
    ...record,
    subject: "criminal-law" as const,
    subjectLabel: record.subject,
    paper: "criminal-law-summary" as const,
    category: "待分類" as const,
    type: (record.format === "申論題" ? "個案型" : "概念型") as Question["type"],
    difficulty: "進階" as const,
    source: `${record.rocYear} 年司法特考四等｜${record.subject}｜第 ${record.officialQuestionNumber} 題`,
    confidence: explanation?.confidence,
    analysis: explanation?.analysis,
    statutes: explanation?.statutes ?? [],
    references: (explanation?.statutes ?? []).map((statute) => ({
      type: "statute" as const,
      title: statute.lawName ?? "刑法",
      locator: `第 ${statute.article} 條`,
      url: statute.url,
      text: statute.text,
    })),
  };
});

const officialQuestions = [...civilOfficialQuestions, ...criminalOfficialQuestions].sort(
  (left, right) =>
    (right.rocYear ?? 0) - (left.rocYear ?? 0) ||
    left.subjectLabel.localeCompare(right.subjectLabel, "zh-Hant") ||
    (left.officialQuestionNumber ?? 0) - (right.officialQuestionNumber ?? 0),
);

const constitutionQuestions: Question[] = (
  combinedPaperRecordsJson as CombinedPaperRecord[]
)
  .filter((record) => record.subject === "constitution")
  .map((record) => {
    const explanation = buildConstitutionAnalysis(record);
    return {
      ...record,
      subjectLabel: "憲法",
      category: "待分類" as const,
      type: "概念型" as const,
      difficulty: "進階" as const,
      source: `${record.rocYear} 年司法特考四等｜法學知識與英文｜官方第 ${record.officialQuestionNumber} 題`,
      confidence: explanation.confidence,
      analysis: explanation.analysis,
      statutes: [],
      references: explanation.references,
    };
  })
  .sort(
    (left, right) =>
      right.rocYear - left.rocYear ||
      left.officialQuestionNumber - right.officialQuestionNumber,
  );

const legalIntroductionQuestions: Question[] = (
  combinedPaperRecordsJson as CombinedPaperRecord[]
)
  .filter((record) => record.subject === "legal-introduction")
  .map((record) => {
    const explanation = buildLegalIntroductionAnalysis(record);
    return {
      ...record,
      subjectLabel: "法學緒論",
      category: "待分類" as const,
      type: "概念型" as const,
      difficulty: "進階" as const,
      source: `${record.rocYear} 年司法特考四等｜法學知識與英文｜官方第 ${record.officialQuestionNumber} 題`,
      confidence: explanation.confidence,
      analysis: explanation.analysis,
      statutes: explanation.references
        .filter((reference) => reference.type === "statute")
        .map((reference) => ({
          article: reference.locator ?? "相關規定",
          lawName: reference.title,
          text: reference.text ?? "請開啟官方來源核對命題時有效規定。",
          url: reference.url,
        })),
      references: explanation.references,
    };
  })
  .sort(
    (left, right) =>
      right.rocYear - left.rocYear ||
      left.officialQuestionNumber - right.officialQuestionNumber,
  );

const englishQuestions: Question[] = (
  combinedPaperRecordsJson as CombinedPaperRecord[]
)
  .filter((record) => record.subject === "english")
  .map((record) => ({
    ...record,
    subjectLabel: "英文",
    category: "待分類" as const,
    type: "概念型" as const,
    difficulty: "進階" as const,
    source: `${record.rocYear} 年司法特考四等｜法學知識與英文｜官方第 ${record.officialQuestionNumber} 題`,
    confidence: "中" as const,
    englishAnalysis: buildEnglishAnalysis(record),
    statutes: [],
    references: [
      {
        type: "official-material" as const,
        title: "考選部官方試題",
        locator: `第 ${record.officialQuestionNumber} 題`,
        url: record.sourceUrl,
      },
      {
        type: "official-material" as const,
        title: record.answerSource,
        locator: `第 ${record.officialQuestionNumber} 題`,
        url: record.answerUrl,
      },
    ],
  }))
  .sort(
    (left, right) =>
      right.rocYear - left.rocYear ||
      left.officialQuestionNumber - right.officialQuestionNumber,
  );

export const questions: Question[] = [
  ...officialQuestions,
  ...constitutionQuestions,
  ...legalIntroductionQuestions,
  ...englishQuestions,
  ...demoQuestions.map((question) => ({
    ...question,
    subject: "civil-law" as const,
    subjectLabel: "民法",
    paper: "civil-law-summary" as const,
    references: question.statutes.map((statute) => ({
      type: "statute" as const,
      title: statute.lawName ?? "民法",
      locator: `第 ${statute.article} 條`,
      url: statute.url,
      text: statute.text,
    })),
    format: "選擇題" as const,
  })),
];

const allOfficialQuestions = [...officialQuestions, ...constitutionQuestions, ...legalIntroductionQuestions, ...englishQuestions];

export const officialQuestionCount = allOfficialQuestions.length;
export const officialMultipleChoiceCount = allOfficialQuestions.filter(
  (question) => question.format === "選擇題",
).length;
export const officialEssayCount = allOfficialQuestions.filter(
  (question) => question.format === "申論題",
).length;

export const officialCountsBySubject = {
  "civil-law": civilOfficialQuestions.length,
  "criminal-law": criminalOfficialQuestions.length,
  constitution: constitutionQuestions.length,
  "legal-introduction": legalIntroductionQuestions.length,
  english: englishQuestions.length,
} as const;
