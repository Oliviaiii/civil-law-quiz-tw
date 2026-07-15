# 交接文件：憲法／法學緒論 300 題解析全面重寫

> 2026-07-15 由 Claude Code session 產出。上一個 session 因用量限制中斷，本文件記錄完整背景、目前進度與接手步驟。

## 一、任務目標（使用者需求，不可妥協的原則）

網站「書記官法科研習室」的**憲法 150 題＋法學緒論 150 題**，解析區「套入本題」（涵攝）原本是程式模板產生的空話——每題每個選項都是同一句「未被官方答案採認，須注意其主體、要件、期限、程序或法律效果與正確規範的差異」。使用者要求：

1. **逐題重寫**這 300 題的解析，每個選項都要有各自具體的對錯理由。
2. **必須上網找題解**（阿摩 yamol.tw、補習班公職王/志光/保成/高點、部落格、PTT/Dcard 都可以），**改寫**成本站版本。
3. **不可以逐字複製貼上**來源文字。
4. **不可以憑空自己解析**（要有找到的來源或法條原文佐證）。
5. 考選部**官方答案是唯一標準**；解析必須支持官方答案。
6. 一次只跑一個批次的背景工作流（使用者擔心用量限制，明確要求：先跑完憲法 105–106，再跑法緒 105–106，之後一批接一批）。

## 二、已完成（在分支 `claude/remote-content-review-1lpzji`）

### Commit 1：題庫資料清理
- `app/data/legal-knowledge-and-english-questions.json`：28 個選項尾端殘留試卷頁尾雜訊「代號：XXXX 頁次：X－X」（regex `\s*代號：\d+\s*頁次：\d+－\d+\s*$`），已全部移除。
- `app/data/english-translations.json`：8 筆翻譯欄壞掉（只放英文原字＋雜訊），已補正繁中翻譯（ordered→命令；訂購 v.、staring→凝視的；盯著看 adj./v.、retreat→撤退；退縮 v./n.、held the ground→堅守立場 片語、reserved→預訂；保留 v.、terminated→終止；結束 v.、motion→動作；動議 n.、reflection→反射；倒影 n.，各在該題第 4 個選項 D）。
- 已重跑 `node scripts/generate-question-data.mjs` 更新產生檔。

### Commit 2：解析架構重構
- `app/data/constitution-analyses.ts`、`app/data/legal-introduction-analyses.ts`：移除 regex 主題模板與 optionReview 空話產生器，改為讀取逐題種子檔 `app/data/analyses/constitution-{105..114}.json` 與 `legal-introduction-{105..114}.json`（照民法 `judicial-fourth-analyses.ts`／刑法 `criminal-law-analyses.ts` 的既有模式）。缺種子會 throw，保證不會再出現空殼解析。測試要求保留符號 `buildConstitutionAnalysis`、`decisionReferences`、`buildLegalIntroductionAnalysis`。
- `scripts/generate-question-data.mjs`：憲法／法緒的搜尋索引 laws/keywords 改由種子 references 與 issue/trap 產生。
- `tests/rendered-html.test.mjs`：新增防線——兩科各 150 份種子缺一不可、issue/rule/application/trap 有最低長度、confidence ∈{高,中}、references ≥1、涵攝禁止模板句（`須注意其主體、要件…`／`應再核對其主體…`／`代號：`／`頁次：`）、300 份 application 不得重複。**種子補齊前 `npm test` 會紅，這是刻意的。**

### 種子內容進度（目前：66／300 題完成並通過本批驗證）
| 批次 | 完成 | 批次 | 完成 |
|---|---|---|---|
| 憲法 105 | 15/15 ✅ | 法緒 105 | 15/15 ✅ |
| 憲法 106 | 15/15 ✅ | 法緒 106 | 0/15 |
| 憲法 107 | 2/15 | 法緒 107 | 3/15 |
| 憲法 108 | 0/15 | 法緒 108 | 0/15 |
| 憲法 109 | 2/15 | 法緒 109 | 4/15 |
| 憲法 110 | 0/15 | 法緒 110 | 0/15 |
| 憲法 111 | 4/15 | 法緒 111 | 2/15 |
| 憲法 112 | 0/15 | 法緒 112 | 0/15 |
| 憲法 113 | 2/15 | 法緒 113 | 2/15 |
| 憲法 114 | 0/15 | 法緒 114 | 0/15 |

已完成的種子**已直接合併**進 `app/data/analyses/{constitution,legal-introduction}-<年度>.json`（key = 題目 id，如 `judicial-fourth-105-legal-knowledge-16`）。每題實際參考的網頁來源另存於 `docs/handover/analysis-sources-map.json`（id → URL 陣列），不隨網站出貨。

### 精確缺題清單（234 題，官方題號；id 格式 `judicial-fourth-<年>-legal-knowledge-<兩位數題號>`）
- 憲法 105 年：✅ 全數完成
- 憲法 106 年：✅ 全數完成
- 憲法 107 年：缺第 3～15 題
- 憲法 108 年：缺第 1～15 題（全缺）
- 憲法 109 年：缺第 3～15 題
- 憲法 110 年：缺第 1～15 題（全缺）
- 憲法 111 年：缺第 5～15 題
- 憲法 112 年：缺第 1～15 題（全缺）
- 憲法 113 年：缺第 3～15 題
- 憲法 114 年：缺第 1～15 題（全缺）
- 法學緒論 105 年：✅ 全數完成
- 法學緒論 106 年：缺第 16～30 題（全缺）
- 法學緒論 107 年：缺第 19～30 題
- 法學緒論 108 年：缺第 16～30 題（全缺）
- 法學緒論 109 年：缺第 20～30 題
- 法學緒論 110 年：缺第 16～30 題（全缺）
- 法學緒論 111 年：缺第 18～30 題
- 法學緒論 112 年：缺第 16～30 題（全缺）
- 法學緒論 113 年：缺第 18～30 題
- 法學緒論 114 年：缺第 16～30 題（全缺）

（判斷「某題是否已完成」的唯一依據：對應年度種子 JSON 內是否已有該題 id 的 key。接手時請重算一次，以 repo 現況為準。）

## 三、未完成項目與作法

### 1. 剩餘 239 題解析（主要工作）
逐題流程（已驗證有效，工作流腳本完整保存在 `docs/handover/rewrite-workflow.js`）：

1. **研究代理**：讀題目 →用 WebSearch 以題幹/選項的獨特字串加引號搜尋（搭配「阿摩」「解析」）→ 找補習班/網友題解與法條原文 → 改寫成種子 JSON 寫檔。
2. **驗證代理**：對答案（官方 answerLetters 為準）、逐選項覆蓋、抽查法條、修文字、verdict pass/fixed/failed。
3. failed 才重做。

種子 JSON 格式（每題）：
```json
{
  "issue": "一句話爭點（15~35字）",
  "rule": "具體規範內容與條號／釋字號（60~140字）",
  "application": "逐選項涵攝，A~D 各自具體對錯理由（120~350字），禁模板句",
  "trap": "最易誤選選項與原因（30~100字）",
  "confidence": "高（有可靠題解或法條直接可證）或 中",
  "references": [{"type":"statute","title":"法規名","locator":"第 X 條","url":"https://law.moj.gov.tw/...","text":"條文關鍵內容轉述"}],
  "sources": ["實際參考的網頁 URL"]
}
```
（合併進 repo 時要把 `sources` 抽出到 sources-map，不要進網站資料。）

**環境限制（重要）**：
- 只有 **WebSearch** 能對外查詢；WebFetch／curl 對任何外站都會被網路政策擋 403，不要浪費時間。搜尋結果的摘要就含有 yamol 等頁面的解析內容。
- 本機 4 核 → 每個 workflow 併發上限 2 個 agent。
- **一次只跑一個批次**（30 題），跑完再開下一批（使用者明確要求，怕用量爆掉）。憲法 106 與法緒 105 已完成；下一批順序：法緒 106 → 憲法 107…（105–106 優先，其餘照年度）。
- Session 用量限制約每 5 小時重置（上次是 6:10 UTC）；撞牆時工作流會大量失敗，但**已寫出的種子檔都在**，重置後重跑缺的題目即可（腳本會自動跳過？不會——腳本按 ids 全跑，但可先把已完成 id 從清單剔除，或直接讓驗證代理對既有檔 pass）。
- 常用法規 pcode 對照表在工作流腳本 `PCODES` 內。

### 2. 種子品質已知注意點
- 憲法題涉釋字→ references type 用 `constitutional-decision`，url `https://cons.judicial.gov.tw/docdata.aspx?fid=100`（憲判 fid=52）。
- 送分題（allCredit）：114 法緒第 18 題接受 A/B/C；application 要說明送分緣由。
- 命題年度的法（如性別工作平等法更名、憲訴法 111 年上路）以命題時版本解釋。

### 3. 整合與收尾（種子齊 300 後）
```bash
node scripts/generate-question-data.mjs   # 重產 bank-manifest / search-index / sw
npm run lint
npm test                                   # 含 300 題種子防線，必須全綠
```
然後提交推送。建議 commit 拆法：解析內容一個 commit、（若有）其他修正另拆。

### 4. Git 推送問題（未解，接手者注意）
- 本 session 後期 `git push` 一直被 git proxy 拒 403（fetch 正常、GitHub MCP 認證正常，只有寫入被擋）。若新 session 推送正常就沒事；若同樣 403，改用 GitHub MCP `push_files` 或回報使用者。
- 分支：一切都推 `claude/remote-content-review-1lpzji`（不要開 PR，使用者沒要求）。
- commit 身分需 `git config user.email noreply@anthropic.com && git config user.name Claude`，否則 stop hook 會擋。

### 5. 其他待辦（次要）
- `docs/handover/` 整個資料夾是交接用暫存，收尾時可刪除（sources-map 若想留供日後查證可移到 docs/ 正式位置）。
- README「資料設計」一節已補種子檔路徑說明，無需再動。

## 四、關鍵檔案索引
| 檔案 | 用途 |
|---|---|
| `app/data/analyses/constitution-<年>.json` ×10 | 憲法逐題種子（進行中） |
| `app/data/analyses/legal-introduction-<年>.json` ×10 | 法緒逐題種子（進行中） |
| `app/data/constitution-analyses.ts` | 憲法解析組裝器（已重構） |
| `app/data/legal-introduction-analyses.ts` | 法緒解析組裝器（已重構） |
| `tests/rendered-html.test.mjs` | 含 300 題種子品質防線 |
| `docs/handover/rewrite-workflow.js` | 逐題研究＋驗證的 Workflow 腳本（prompt 完整） |
| `docs/handover/analysis-sources-map.json` | 每題實際參考來源 URL |
| `app/data/legal-knowledge-and-english-questions.json` | 300 題原始題庫（含官方答案，id 規則：憲法=每年 Q1-15、法緒=Q16-30） |

## 五、品質標準（驗收時檢查）
1. 任兩題的 application 不得相同；不得出現模板句（測試會抓）。
2. 每個選項都有各自的法律理由（不是「須注意…差異」這種話）。
3. 解析結論＝考選部官方答案。
4. 全部台灣繁體中文、台灣法律用語。
5. 有來源可查（sources-map），但正文是改寫不是照抄。
