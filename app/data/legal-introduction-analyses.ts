import type { Reference } from "./references";

type LegalIntroductionQuestion = {
  id: string;
  rocYear: number;
  prompt: string;
  options: string[];
  answer: number;
  acceptedAnswers?: number[] | null;
};

type TopicRule = {
  match: RegExp;
  issue: string;
  rule: string;
  title: string;
  locator: string;
  url: string;
  type?: Reference["type"];
};

const LAW_URL = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=";
const INTERPRETATIONS_URL = "https://cons.judicial.gov.tw/docdata.aspx?fid=100";

const topicRules: TopicRule[] = [
  {
    match: /解釋方法|文義解釋|歷史解釋|體系解釋|目的解釋|類推適用|反面推論|目的性|法源|間接法源|實體法與程序法|實體法及程序法|法律之種類|法系|法治國.*繼受|臺灣法律體制|內容結構.*憲法/,
    issue: "法律解釋、法源與法體系的辨識",
    rule: "法律方法題應先區分文義、體系、歷史與目的解釋，再判斷是否存在法律漏洞及能否類推；法源與法系題則須區分成文法、習慣、判例裁判與學說的效力，不能只憑名詞相近作答。",
    title: "全國法規資料庫",
    locator: "中央法規、司法解釋與法規沿革查詢",
    url: "https://law.moj.gov.tw/",
    type: "official-material",
  },
  {
    match: /大法庭|提案庭/,
    issue: "終審法院大法庭裁定的程序與拘束範圍",
    rule: "大法庭用來統一最高法院或最高行政法院各庭的法律見解；裁定對提交案件的提案庭具有拘束力，但不是對所有機關與人民均發生一般規範效力。",
    title: "法院組織法",
    locator: "大法庭章",
    url: `${LAW_URL}A0010053`,
  },
  {
    match: /憲法訴訟|憲法法庭|法規範憲法審查|審查庭|總統、副總統彈劾|總統副總統彈劾/,
    issue: "憲法訴訟的案件類型、聲請主體與審理程序",
    rule: "憲法訴訟法分別規範法規範及裁判憲法審查、機關爭議、總統副總統彈劾與政黨違憲解散等案件；作答須核對聲請主體、審查標的、評決門檻及期限。",
    title: "憲法訴訟法",
    locator: "案件類型、聲請及評決規定",
    url: `${LAW_URL}A0030159`,
  },
  {
    match: /憲法|立法院法律案|平等|差別待遇|隱私權|職業.*客觀條件|超出黨派|嚴格之審查基準/,
    issue: "憲法制度、基本權與違憲審查標準",
    rule: "憲法題應先辨識機關權限或受保障基本權，再核對法律保留、平等與比例原則；涉及司法院解釋時，應以解釋文及理由書所建立的判準為準。",
    title: "中華民國憲法",
    locator: "基本權與中央機關相關條文",
    url: `${LAW_URL}A0000001`,
  },
  {
    match: /地方制度法|自治條例|自治規則|委辦規則|自治法規|自治規章|地方自治團體居民|縣（市）規章/,
    issue: "地方自治法規的名稱、制定程序與監督界線",
    rule: "自治條例由地方立法機關議決、行政機關公布；自治規則由地方行政機關訂定發布。委辦規則、自律規則及含罰則自治條例另有法定名稱、核定或備查程序。",
    title: "地方制度法",
    locator: "第 25 至 32 條及居民權利規定",
    url: `${LAW_URL}A0040003`,
  },
  {
    match: /中央法規標準法|法規條文書寫|法規之廢止|施行期限|應以法律規定|暫停適用法規/,
    issue: "中央法規的名稱、制定、施行、停止與廢止程序",
    rule: "法律與命令的名稱、應以法律規定事項、條文體例、生效及廢止程序，均須依中央法規標準法逐項核對；法律與命令的主管及公布發布程序不能互換。",
    title: "中央法規標準法",
    locator: "第 2 至 5 條、第 8 條及第 22 至 24 條",
    url: `${LAW_URL}A0030133`,
  },
  {
    match: /行政程序法|行政機關|行政裁量|裁量怠惰|不確定法律概念|依法行政|法律保留|信賴保護|比例原則|明確性原則|授益行政處分|課稅處分|聽證程序|公法性質|法律安定性原則/,
    issue: "行政法一般原則與行政程序的適用",
    rule: "行政行為受法律及一般法律原則拘束，內容應明確，差別待遇須有正當理由，手段須符合比例原則，裁量不得逾越授權範圍或怠於行使；另應核對行政程序法的機關定義與排除事項。",
    title: "行政程序法",
    locator: "第 1 至 10 條及相關程序規定",
    url: `${LAW_URL}A0030055`,
  },
  {
    match: /消除對婦女一切形式歧視公約|CEDAW/,
    issue: "CEDAW 在我國內國法上的效力",
    rule: "我國以消除對婦女一切形式歧視公約施行法賦予公約所揭示保障人權規定內國法效力，並要求各級政府依公約規定檢討法規及行政措施。",
    title: "消除對婦女一切形式歧視公約施行法",
    locator: "第 2 至 8 條",
    url: `${LAW_URL}D0050175`,
  },
  {
    match: /家庭暴力防治法|家庭暴力|保護令/,
    issue: "家庭暴力被害人的保護令、管轄與扶助措施",
    rule: "家庭暴力事件應依被害人、相對人住居所或暴力發生地判斷管轄，並由法律指定的法院處理；地方主管機關得提供安置、生活、醫療、法律及子女照顧等扶助。",
    title: "家庭暴力防治法",
    locator: "保護令管轄及被害人扶助規定",
    url: `${LAW_URL}D0050071`,
  },
  {
    match: /性別工作平等法|性別平等工作法|產假|陪產|育嬰留職停薪/,
    issue: "受僱者生育、育嬰與復職權益",
    rule: "受僱者的產檢、陪產檢及陪產假、產假與育嬰留職停薪，應依命題年度有效的性別工作平等法或性別平等工作法判斷；復職原則上應回復原有工作。",
    title: "性別平等工作法",
    locator: "第 15 至 17 條",
    url: `${LAW_URL}N0030014`,
  },
  {
    match: /職業災害給付|塵肺病|職業災害保險/,
    issue: "職業災害保險效力與職業病給付",
    rule: "職業病是否得請領給付，應判斷疾病與工作暴露的因果關係及其發生是否可追溯至保險有效期間；不能只因離職後才確診便一律排除。",
    title: "勞工職業災害保險及保護法",
    locator: "保險效力與職業病給付規定",
    url: `${LAW_URL}N0050031`,
  },
  {
    match: /勞工保險|職業災害保險費率|上、下班災害費率/,
    issue: "勞工保險與職業災害費率的法定機制",
    rule: "保險費率、精算與調整期間應直接依命題時有效的勞工保險法規核對，並區分普通事故保險與職業災害保險。",
    title: "勞工保險條例",
    locator: "保險費率與職業災害保險規定",
    url: `${LAW_URL}N0050001`,
  },
  {
    match: /勞動基準法|特別休假|工作規則|競業禁止|最低服務年限|調動勞工|職業災害.*雇主|醫療期間.*雇主/,
    issue: "勞動基準法的最低勞動條件與雇主義務",
    rule: "勞動基準法所定競業禁止、調動、最低服務年限、工作規則、特別休假及職災補償均屬最低標準；應依各制度的法定要件、期限與法律效果判斷。",
    title: "勞動基準法",
    locator: "勞動契約、工作規則、休假及職災補償規定",
    url: `${LAW_URL}N0030001`,
  },
  {
    match: /全民健康保險法|補充保險費率|全民健康保險財務|保險人.*代位/,
    issue: "全民健康保險的費率、財務與代位制度",
    rule: "全民健康保險的補充保險費率、財務精算及保險人代位權均有明文要件；涉及數字或期間時，須以命題年度有效條文核對。",
    title: "全民健康保險法",
    locator: "保險財務、補充保險費及代位規定",
    url: `${LAW_URL}L0060001`,
  },
  {
    match: /股份有限公司|公司法|董事及監察人|現金增資|公司轉投資|借貸和保證/,
    issue: "公司資本、董事監察人與公司資金運用規範",
    rule: "股份有限公司的增資認購、董事監察人選任解任，以及轉投資、貸款與保證，均須依公司法的公司類型、持股門檻及例外規定判斷。",
    title: "公司法",
    locator: "股份有限公司、董事監察人及公司資金運用規定",
    url: `${LAW_URL}J0080001`,
  },
  {
    match: /消費者保護法|消費者保護官|消費者服務中心|企業經營者|產品之包裝|消費者保護團體/,
    issue: "消費者申訴與企業經營者的保護義務",
    rule: "消費者得向企業經營者、消費者保護團體或地方政府消費者服務中心申訴；商品標示、包裝與安全義務則應依消費者保護法的企業責任規範判斷。",
    title: "消費者保護法",
    locator: "企業經營者責任及消費爭議申訴規定",
    url: `${LAW_URL}J0170001`,
  },
  {
    match: /著作權法|著作財產權|著作權之標的|著作人|雕塑作品|散布|公開展示|重製權/,
    issue: "著作、著作財產權與合理利用的界線",
    rule: "著作權保護具原創性的表達，但法律、公文及依法舉行的考試試題等不得為著作權標的；原件所有權、公開展示、重製、散布與授權是不同權利，須分別判斷。",
    title: "著作權法",
    locator: "第 3、9、37、45 至 65 條",
    url: `${LAW_URL}J0070017`,
  },
  {
    match: /刑法|教唆犯|有期徒刑|法條競合|竊盜|緩刑|中止犯|共同正犯|公務員|禁止錯誤|凌虐人犯|脫逃|犯罪故意|易刑處分|時之效力|屬地主義|作為/,
    issue: "刑法總則、犯罪參與及刑罰效果的適用",
    rule: "刑法題應依行為時有效法律，依序判斷構成要件、故意過失、違法性、罪責、未遂中止與正共犯；再處理競合、時的效力、刑罰加減及易刑處分。",
    title: "中華民國刑法",
    locator: "總則及題目所涉分則規定",
    url: `${LAW_URL}C0000001`,
  },
  {
    match: /債務人|債權人|抵押權|共有|繼承|被繼承人|遺囑|盆栽|違約金|保證契約|勞務給付|區分所有|委任關係|利息之債|婚姻|婚約|旅店主人|死亡宣告|土地增值稅|租賃契約|物權|代理權|收養|監護宣告|旅遊契約|公同關係|行為能力|房屋設定|夫妻|無權占有|債法|所有權|質權|留置權|人格權|請求權|消滅時效|善意取得/,
    issue: "民法法律關係的成立、效力與權利行使",
    rule: "民法題應先辨識總則、債、物權、親屬或繼承編，再核對法律行為效力、善意取得、擔保物權、契約責任或繼承分配的法定要件。",
    title: "民法",
    locator: "總則、債、物權、親屬及繼承編相關規定",
    url: `${LAW_URL}B0000001`,
  },
];

const fallbackRule: TopicRule = {
  match: /.*/,
  issue: "法規範的位階、要件與法律效果",
  rule: "法學緒論題應先辨識法律領域與命題時有效法源，再逐一核對主體、要件、程序及法律效果；不能以不同制度中相似的名詞互相替代。",
  title: "全國法規資料庫",
  locator: "法規與司法解釋整合查詢",
  url: "https://law.moj.gov.tw/",
  type: "official-material",
};

function explicitLocator(prompt: string, fallback: string): string {
  const match = prompt.match(/第\s*(\d+(?:\s*條之\s*\d+|[-之]\d+)?)\s*條(?:第\s*(\d+)\s*項)?/);
  if (!match) return fallback;
  return `第 ${match[1].replace(/\s+/g, "")} 條${match[2] ? `第 ${match[2]} 項` : ""}`;
}

function decisionReferences(prompt: string): Reference[] {
  return [...prompt.matchAll(/釋字第\s*(\d+)\s*號/g)].map((match) => ({
    type: "constitutional-decision" as const,
    title: `司法院釋字第 ${match[1]} 號解釋`,
    locator: `解釋字號：釋字第 ${match[1]} 號`,
    url: INTERPRETATIONS_URL,
    text: "應以官方解釋文及理由書的完整意旨核對題目敘述。",
  }));
}

function acceptedAnswers(question: LegalIntroductionQuestion): number[] {
  return question.acceptedAnswers?.length ? question.acceptedAnswers : [question.answer];
}

function optionReview(question: LegalIntroductionQuestion, rule: TopicRule): string {
  const accepted = new Set(acceptedAnswers(question));
  const negative = /何者(?:錯誤|不正確|非屬|並非|不包括|無法)|何者非|不屬於|不得/.test(question.prompt);
  const reviews = question.options.map((option, index) => {
    const label = String.fromCharCode(65 + index);
    if (accepted.has(index)) {
      return `${label}「${option}」是考選部採認答案，${negative ? "屬於題幹要求找出的錯誤或例外敘述" : "符合本題所涉規範"}`;
    }
    return `${label}「${option}」未被官方答案採認，須注意其主體、要件、期限、程序或法律效果與正確規範的差異`;
  });
  return `${negative ? "題幹採否定問法，應找出不符合規範的選項。" : "題幹要求選出符合規範的選項。"}${reviews.join("；")}。判斷基準：${rule.rule}`;
}

export function buildLegalIntroductionAnalysis(question: LegalIntroductionQuestion) {
  const rule = topicRules.find((candidate) => candidate.match.test(question.prompt)) ?? fallbackRule;
  const answers = acceptedAnswers(question);
  const labels = answers.map((answer) => String.fromCharCode(65 + answer)).join("／");
  const references: Reference[] = [
    {
      type: rule.type ?? "statute",
      title: rule.title,
      locator: explicitLocator(question.prompt, rule.locator),
      url: rule.url,
      text: rule.rule,
    },
    ...decisionReferences(question.prompt),
  ];
  return {
    confidence: "中" as const,
    analysis: {
      issue: rule.issue,
      rule: rule.rule,
      application: optionReview(question, rule),
      conclusion: `依考選部${answers.length > 1 ? "更正" : "官方"}答案，本題接受 ${labels}。`,
      trap: `先確認題幹是否採否定問法，再逐一核對主體、要件、數字、程序與效果。命題年度為民國 ${question.rocYear} 年；法規其後若有修正，仍應以該年度有效版本理解官方答案。`,
    },
    references,
    usedFallback: rule === fallbackRule,
  };
}
