export const meta = {
  name: 'rewrite-legal-analyses',
  description: '逐題上網搜尋題解並改寫為本站解析種子，附對抗式驗證',
  phases: [
    { title: 'Research', detail: '每題搜尋補習班/網友題解並改寫' },
    { title: 'Verify', detail: '逐題核對答案一致性、法條與品質' },
    { title: 'Redo', detail: '重做未通過驗證的題目' },
  ],
}

const A = typeof args === 'string' ? JSON.parse(args) : args
const subjectLabel = A.subjectLabel
const seedsDir = A.seedsDir
const questionsDir = A.questionsDir
const questions = (A.ids || []).map((item) => ({ id: item.id, rocYear: item.rocYear }))
log(`${subjectLabel}：本批 ${questions.length} 題`)

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    ok: { type: 'boolean' },
    confidence: { type: 'string' },
    sourceCount: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['id', 'ok'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'fixed', 'failed'] },
    issues: { type: 'string' },
  },
  required: ['id', 'verdict'],
}

const PCODES = `常用法規 pcode（url 格式 https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=XXX）：
中華民國憲法 A0000001｜憲法增修條文 A0000002｜憲法訴訟法 A0030159｜法院組織法 A0010053｜中央法規標準法 A0030133｜地方制度法 A0040003｜行政程序法 A0030055｜行政訴訟法 A0030154｜訴願法 A0030020｜國家賠償法 I0020004｜民法 B0000001｜刑法 C0000001｜刑事訴訟法 C0010001｜民事訴訟法 B0010001｜公司法 J0080001｜消費者保護法 J0170001｜著作權法 J0070017｜勞動基準法 N0030001｜性別平等工作法 N0030014｜勞工保險條例 N0050001｜勞工職業災害保險及保護法 N0050031｜全民健康保險法 L0060001｜家庭暴力防治法 D0050071｜CEDAW施行法 D0050175｜公民投票法 D0020050｜公職人員選舉罷免法 D0020010｜提審法 A0030151｜集會遊行法 D0080058｜個人資料保護法 I0050021。若需要其他法規的 pcode，用 WebSearch 搜「全國法規資料庫 <法規名>」，結果 URL 內會帶 pcode。`

function researchPrompt(q, redoNotes) {
  return `你是台灣國考法律科目的解析編輯，為「書記官法科研習室」網站重寫一題${subjectLabel}選擇題的解析。這題目前的解析是模板自動產生的空話，必須換成有實質內容、逐選項講清楚理由的版本。

【第零步：讀題目】
用 Read 讀取 ${questionsDir}/${q.id}.json，內含題幹（prompt）、選項（options，依序為 A/B/C/D）、官方答案（answerLetters，含更正答案）與年度。這是司法特考四等「法學知識與英文」民國 ${q.rocYear} 年的題目。allCredit=true 表示該題送分。

【第一步：上網找題解（必做）】
1. 先用 ToolSearch 載入 WebSearch 工具（query 用 "select:WebSearch"）。本環境只有 WebSearch 能對外查詢；WebFetch、curl 一律會被網路政策擋成 403，不要浪費時間嘗試。WebSearch 的結果摘要本身就會帶回頁面內容片段，足以取得題解內容。
2. 至少做 2 次、最多 6 次搜尋。有效作法：
   - 從題幹或選項挑「最有辨識度的連續字串」加引號搜尋，例如 "<選項片段>" 搭配「阿摩」或「解析」。
   - 台灣常見題解來源：阿摩線上測驗（yamol.tw，搜尋結果標題通常含題目全文與答案）、公職王、志光、保成、高點、6laws.net、個人部落格、PTT、Dcard。
   - 針對涉及的法條或釋字再搜一次原文核對，例如「地方制度法 第25條 條文」「釋字第784號 解釋文」。
3. 記下每個來源對本題的解釋重點與引用法條。若真的找不到任何人討論這題，就改以搜尋到的法條原文、釋字內容作為依據來寫，並把 confidence 設為「中」。

【第二步：改寫成本站解析並寫檔】
用 Write 工具把以下 JSON 寫到 ${seedsDir}/${q.id}.json（UTF-8、合法 JSON、只含以下欄位）：
{
  "issue": "一句話點出本題爭點（15~35 字，可用問句）",
  "rule": "本題依據的法律規則，寫出具體規範內容與條號／釋字號（60~140 字）",
  "application": "逐選項涵攝（120~350 字）。每個選項都要個別講：這個敘述本身對或錯、對在哪／錯在哪（正確規範是什麼、它偷換或漏掉了什麼）。若題幹是否定問法，說明答案選項就是錯誤敘述。四個選項的理由必須各自不同且具體。",
  "trap": "最容易誤選的選項與原因，或本題常見概念混淆（30~100 字）",
  "confidence": "高 或 中（有可靠題解或法條直接可證＝高）",
  "references": [ 1~3 個官方來源，格式 {"type":"statute","title":"法規名","locator":"第 X 條","url":"https://law.moj.gov.tw/...","text":"該條關鍵內容的簡短轉述"}；憲法題涉及大法官解釋用 {"type":"constitutional-decision","title":"司法院釋字第 X 號解釋","locator":"解釋字號：釋字第 X 號","url":"https://cons.judicial.gov.tw/docdata.aspx?fid=100","text":"..."}，憲法法庭判決 url 用 https://cons.judicial.gov.tw/docdata.aspx?fid=52 ],
  "sources": [ 你實際參考的網頁 URL（1~4 個）]
}
${PCODES}

【鐵則】
- 全程台灣繁體中文、台灣法律用語；禁止簡體字。
- 禁止模板空話：不得出現「須注意其主體、要件、期限、程序或法律效果與正確規範的差異」「應再核對其主體、要件、程序或法律效果」這類套在哪題都通的句子；四個選項不得共用同一句理由。
- 不要逐字照抄來源：超過 15 字的連續文字不得與來源相同（法條原文的必要短引除外），要用自己的話改寫；不得殘留「最佳解」「讚」等論壇字樣。
- 官方答案是唯一標準（以題目檔中 answerLetters 欄位為準）。解析必須支持官方答案；若來源見解或你的直覺與官方答案不同，以官方答案為準，並可在 trap 說明爭點。
- 命題年度是民國 ${q.rocYear} 年：法規事後修正（例如 111 年憲法訴訟法施行、性別工作平等法更名）時，以命題當時的法規解釋，可註明新法變化。
- allCredit 送分題：在 application 說明題目瑕疵或修法原因、為何送分。
${redoNotes ? `\n【上一輪驗證未通過，必須修正】\n${redoNotes}\n請重新搜尋並重寫整份檔案。` : ''}
完成後回傳狀態：id=${q.id}、ok、confidence、sourceCount（實際參考來源數）、notes（一句話：主要依據哪個來源/法條）。`
}

function verifyPrompt(q) {
  return `你是嚴格的法律解析審稿人。請驗證檔案 ${seedsDir}/${q.id}.json 的解析品質，必要時直接修正檔案。

【題目資料】
先用 Read 讀取 ${questionsDir}/${q.id}.json（題幹、選項 A/B/C/D、官方答案 answerLetters、allCredit、年度）。官方答案一律以此檔的 answerLetters 為準。

【驗證步驟】
1. 用 Read 讀取 ${seedsDir}/${q.id}.json。檔案不存在或不是合法 JSON、缺少 issue/rule/application/trap/confidence/references 任一欄位 → verdict=failed。
2. 答案一致性：application 與 trap 的論證必須支持官方答案。若解析推出別的答案 → failed。
3. 逐選項覆蓋：application 必須對 A、B、C、D 每個選項都有「各自不同、具體」的理由；出現以下情況 → 能改則直接改好（必要時用 ToolSearch 載入 WebSearch 查證），改不動 → failed：
   - 任何選項只有空話（如「須注意其主體、要件、期限、程序或法律效果與正確規範的差異」「應再核對其…是否一致」）；
   - 兩個以上選項共用同一句理由；
   - 漏掉某個選項完全沒提。
4. 法條抽查：挑 rule 或 references 中最關鍵的一條法條／釋字，用 WebSearch 查原文核對條號與內容。引用錯誤（條號張冠李戴、內容捏造）→ 修正檔案；核對不到又可疑 → failed 並說明。
5. 文字品質：必須是台灣繁體中文；不得有簡體字、論壇殘留字樣（最佳解、讚、樓上）、或「代號：」「頁次：」雜訊。發現就直接修掉。
6. references 的 url 必須是官方網域（law.moj.gov.tw、cons.judicial.gov.tw、moex.gov.tw 等）；sources 欄位保留原樣不用改。
7. 若你動手修改過檔案，確保存檔後仍是合法 JSON。

回傳：id=${q.id}；verdict=pass（原本就合格）/ fixed（你修過但已合格）/ failed（重大問題需重做）；issues=發現的問題摘要（pass 則留空字串）。`
}

const results = await pipeline(
  questions,
  (q) => agent(researchPrompt(q), { label: `research:${q.id.replace(/^judicial-fourth-/, '')}`, phase: 'Research', schema: RESULT_SCHEMA }),
  (res, q) => agent(verifyPrompt(q), { label: `verify:${q.id.replace(/^judicial-fourth-/, '')}`, phase: 'Verify', schema: VERIFY_SCHEMA }),
  async (ver, q) => {
    if (ver && ver.verdict !== 'failed') return ver
    const notes = ver ? ver.issues : '前一輪研究代理未完成，檔案可能不存在。'
    await agent(researchPrompt(q, notes), { label: `redo:${q.id.replace(/^judicial-fourth-/, '')}`, phase: 'Redo', schema: RESULT_SCHEMA })
    return agent(verifyPrompt(q), { label: `reverify:${q.id.replace(/^judicial-fourth-/, '')}`, phase: 'Redo', schema: VERIFY_SCHEMA })
  },
)

const flat = results.filter(Boolean)
const failed = flat.filter((r) => r.verdict === 'failed').map((r) => ({ id: r.id, issues: (r.issues || '').slice(0, 300) }))
log(`${subjectLabel} 完成：pass ${flat.filter((r) => r.verdict === 'pass').length}、fixed ${flat.filter((r) => r.verdict === 'fixed').length}、failed ${failed.length}、無回應 ${questions.length - flat.length}`)
return {
  subjectLabel,
  total: questions.length,
  responded: flat.length,
  pass: flat.filter((r) => r.verdict === 'pass').length,
  fixed: flat.filter((r) => r.verdict === 'fixed').length,
  failed,
}
