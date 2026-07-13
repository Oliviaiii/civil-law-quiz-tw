import type { Reference } from "./references";

type ConstitutionQuestion = {
  id: string;
  rocYear: number;
  prompt: string;
  options: string[];
  answer: number;
};

type TopicRule = {
  match: RegExp;
  issue: string;
  rule: string;
  article: string;
  law?: "constitution" | "amendments";
};

const CONSTITUTION_URL = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001";
const AMENDMENTS_URL = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000002";
const INTERPRETATIONS_URL = "https://cons.judicial.gov.tw/docdata.aspx?fid=100";
const JUDGMENTS_URL = "https://cons.judicial.gov.tw/docdata.aspx?fid=52";

const topicRules: TopicRule[] = [
  {
    match: /總統|副總統|行政院|行政院院長|不信任|覆議|解散立法院/,
    issue: "中央行政權、總統職權及行政立法關係的憲法界線",
    rule: "總統、副總統的產生、缺位、罷免與彈劾，以及行政院院長任命、不信任案、覆議與解散立法院，須優先適用憲法增修條文；不能再以已停止適用的憲法本文舊制推論。",
    article: "第 2 至 4 條",
    law: "amendments",
  },
  {
    match: /立法院|立法委員|法律案|三讀|質詢|同意權|國會/,
    issue: "立法院的組成、議事程序與職權界線",
    rule: "立法院為國家最高立法機關，議決法律案、預算案等事項；立法委員的任期、選制、同意權、質詢權及不信任案程序，須合併憲法本文與增修條文判斷。",
    article: "第 62 至 76 條及增修條文第 4 條",
  },
  {
    match: /司法院|大法官|憲法法庭|解釋憲法|統一解釋|憲法訴訟|違憲政黨|法規範憲法審查/,
    issue: "司法院、憲法法庭及違憲審查制度的權限與程序",
    rule: "司法院為最高司法機關；大法官組成憲法法庭，依法審理法規範憲法審查、機關爭議、政黨違憲解散、總統副總統彈劾等案件。新舊制度應依命題時點分別適用司法院大法官審理案件法或憲法訴訟法。",
    article: "第 77 至 82 條及增修條文第 5 條",
  },
  {
    match: /監察院|監察委員|彈劾|糾舉|審計/,
    issue: "監察院的組成、彈劾與監察職權",
    rule: "監察院行使彈劾、糾舉及審計權；總統、副總統彈劾另依增修條文由立法院提出並由憲法法庭審理，不能與一般公務員彈劾程序混同。",
    article: "第 90 至 106 條及增修條文第 7 條",
  },
  {
    match: /考試院|考試委員|考選|銓敘|任用|保障|退休/,
    issue: "考試院及國家人事法制的憲法定位",
    rule: "考試院掌理考試、公務人員銓敘、保障、撫卹、退休等法制事項；其組成與人事同意程序以增修條文現制為準。",
    article: "第 83 至 89 條及增修條文第 6 條",
  },
  {
    match: /人身自由|逮捕|拘禁|羈押|管收|感化教育|軍事審判|現行犯/,
    issue: "人身自由限制是否符合憲法第 8 條的嚴格程序保障",
    rule: "憲法第 8 條保障人身自由，逮捕、拘禁及其他實質剝奪自由措施必須有法律依據、正當程序與即時司法審查；軍人亦不因身分而失去基本權與司法救濟保障。",
    article: "第 8 條",
  },
  {
    match: /居住|遷徙|入出國|出境|旅行|住居所/,
    issue: "居住與遷徙自由的保障範圍及限制",
    rule: "憲法第 10 條保障人民選擇住居所、移動、旅行及入出國境等自由；限制仍須具法律依據並符合比例原則，且應區分本國人返國權與外國人入境管制。",
    article: "第 10 條",
  },
  {
    match: /言論|出版|新聞|媒體|廣告|表現自由|集會|遊行|結社|政黨/,
    issue: "表現、集會或結社自由所受保障與限制標準",
    rule: "憲法第 11、14 條保障言論、出版、集會及結社自由。政治性言論原則上受高度保障；商業言論、事前審查、集會許可與團體管制仍須依目的、手段與程序接受比例原則審查。",
    article: "第 11 條及第 14 條",
  },
  {
    match: /宗教|信仰/,
    issue: "宗教信仰自由的內在信念、宗教行為與團體自主",
    rule: "憲法第 13 條保障信仰、不信仰、宗教行為與宗教結社自由；內在信仰受絕對保障，外在行為及團體財產管理仍可能在法律保留與比例原則下受限制。",
    article: "第 13 條",
  },
  {
    match: /財產|工作權|生存權|年金|健保|社會保險|徵收|補償|特別犧牲|特別公課/,
    issue: "生存權、工作權或財產權限制與社會國任務",
    rule: "憲法第 15 條保障生存權、工作權及財產權。法律形成社會保險、職業管制、徵收或金錢負擔時，仍須具正當公益目的並符合比例原則；造成個別人民特別犧牲者原則上應給予合理補償。",
    article: "第 15 條",
  },
  {
    match: /訴訟權|司法救濟|公平審判|審級|上訴|法院救濟/,
    issue: "訴訟權所要求的有效司法救濟與正當審判程序",
    rule: "憲法第 16 條保障人民請願、訴願及訴訟權，核心包括有權利即有救濟、由法院依法公平審判及獲得及時有效救濟；但憲法並不保障固定的審級數目。",
    article: "第 16 條",
  },
  {
    match: /租稅|納稅|稅捐|課稅/,
    issue: "租稅法律主義與量能負擔的平等要求",
    rule: "憲法第 19 條要求人民僅依法律負納稅義務；納稅主體、稅目、稅率、納稅方法及優惠等重要事項應由法律或具體明確授權的命令規定，並兼顧租稅公平。",
    article: "第 19 條",
  },
  {
    match: /教育|受教育|國民教育|大學自治|學術|講學/,
    issue: "受教育權、講學自由與大學自治的保障",
    rule: "憲法第 11、21、159 至 165 條共同保障講學自由、受國民教育權利義務及教育文化制度；大學自治屬講學自由的制度性保障，但仍須在法律框架內運作。",
    article: "第 11、21、159 至 165 條",
  },
  {
    match: /平等|差別待遇|性別|男女|歧視/,
    issue: "差別待遇是否具正當目的及合理關聯",
    rule: "憲法第 7 條保障平等，並非禁止一切差別待遇；應依分類標準與所涉權利的重要性，審查目的是否正當、分類與目的間是否具實質或合理關聯。",
    article: "第 7 條",
  },
  {
    match: /隱私|資訊自主|個人資料|人格權|姓名|性自主|身分認同/,
    issue: "憲法第 22 條所保障的一般人格權或資訊隱私權",
    rule: "憲法第 22 條保障不妨害社會秩序公共利益的其他自由權利，包括一般人格權、資訊隱私、自主決定及身分認同等；國家蒐集、處理或利用個資須具法律依據及正當目的。",
    article: "第 22 條",
  },
  {
    match: /比例原則|法律保留|法治國|信賴保護|法安定性|明確性|正當法律程序|授權明確/,
    issue: "法治國原則、法律保留與比例原則的適用",
    rule: "人民自由權利除為防止妨礙他人自由、避免緊急危難、維持社會秩序或增進公共利益所必要，不得以法律限制；限制基本權亦須符合明確性、正當程序、信賴保護與比例原則。",
    article: "第 23 條",
  },
  {
    match: /地方自治|自治團體|中央與地方|地方制度|直轄市|縣市|鄉鎮|里長|自治事項|委辦事項|地方議會|邊疆/,
    issue: "中央與地方權限劃分及地方自治保障",
    rule: "中央與地方權限依憲法第 107 至 111 條、地方制度法及地方自治保障判斷。自治事項原則上受合法性監督；委辦事項另可能受合目的性監督，不能把地方自治團體視為中央機關的下級機關。",
    article: "第 107 至 111 條及第 118 條",
  },
  {
    match: /領土|修憲|憲法修正|複決|國民大會/,
    issue: "修憲或領土變更的提案、公告與公民複決程序",
    rule: "修憲與領土變更均採國會高門檻提案、公告及自由地區選舉人複決程序；兩者的公告期間與投票門檻應直接依增修條文，不可用一般法律案程序替代。",
    article: "第 1 條及第 12 條",
    law: "amendments",
  },
  {
    match: /基本國策|原住民|全民健康保險|弱勢|社會救助|經費|文化|科學|藝術|勞工|國民經濟/,
    issue: "基本國策、社會國原則及特定群體保障",
    rule: "憲法基本國策與增修條文第 10 條要求國家推動社會安全、全民健康保險、教育文化、環境及原住民族等政策；作答時須區分政策方針、制度性保障與可直接主張的基本權。",
    article: "第 13 章及增修條文第 10 條",
  },
];

const fallbackRule: TopicRule = {
  match: /.*/,
  issue: "憲法本文、增修條文與命題時制度的正確適用",
  rule: "憲法題應先辨識規範位階與命題時有效制度，再核對憲法本文、增修條文及司法院解釋或憲法法庭裁判；增修條文停止適用的本文規定，不得當作現行制度。",
  article: "憲法本文及增修條文",
};

function statuteReference(rule: TopicRule): Reference {
  const amendments = rule.law === "amendments" || rule.article.includes("增修條文");
  return {
    type: "statute",
    title: amendments ? "中華民國憲法增修條文" : "中華民國憲法",
    locator: rule.article,
    url: amendments ? AMENDMENTS_URL : CONSTITUTION_URL,
    text: rule.rule,
  };
}

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

function optionReview(question: ConstitutionQuestion, rule: TopicRule): string {
  const negative = /何者(?:錯誤|不正確|非屬|並非|不包括|無須)|何者非|不受|不得/.test(question.prompt);
  const reviews = question.options.map((option, index) => {
    const label = String.fromCharCode(65 + index);
    if (index === question.answer) {
      return `${label}「${option}」為官方答案，${negative ? "是未通過前述規範核對的敘述" : "符合前述規範或解釋意旨"}`;
    }
    return `${label}「${option}」不是本題答案，應再核對其主體、要件、程序或法律效果是否與命題時制度一致`;
  });
  return `${negative ? "本題使用否定問法，須找出不符規範的選項。" : "本題要求選出符合規範的選項。"}${reviews.join("；")}。核心判準是：${rule.rule}`;
}

export function buildConstitutionAnalysis(question: ConstitutionQuestion) {
  const rule = topicRules.find((candidate) => candidate.match.test(question.prompt)) ?? fallbackRule;
  const answerLabel = String.fromCharCode(65 + question.answer);
  const negative = /何者(?:錯誤|不正確|非屬|並非|不包括|無須)|何者非|不受|不得/.test(question.prompt);
  const references = [statuteReference(rule), ...decisionReferences(question.prompt)];
  return {
    confidence: "中" as const,
    analysis: {
      issue: rule.issue,
      rule: rule.rule,
      application: optionReview(question, rule),
      conclusion: `依考選部官方答案，本題選 ${answerLabel}。${negative ? "因題幹採否定問法，該選項是與命題時憲法規範或解釋意旨不符者。" : "該選項與命題時憲法規範或解釋意旨相符。"}`,
      trap: `${negative ? "先圈出「錯誤、非屬、並非」等否定詞，避免把正確敘述誤當答案。" : "不要只憑機關或基本權名稱作答，仍要核對主體、門檻、期限與法律效果。"}命題年度為民國 ${question.rocYear} 年；若制度或裁判其後變更，作答仍以當年有效規範為主。`,
    },
    references,
  };
}
