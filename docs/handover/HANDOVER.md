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

## 二、2026-07-15 全站解析審查結論（接手前必讀）

### 結論

**目前不可宣稱「全站所有題目解析都正確，且均非 regex／模板自動生成」。** 題目與官方答案資料具來源網址，但「官方答案可追溯」不等於本站自行撰寫的解析已逐題查證正確。接手者必須依下列現況繼續重寫與驗證，完成前不可把此分支合併、部署或移除完整性測試。

### 分支與正式站差異

- 解析審查基準：工作分支 `claude/remote-content-review-1lpzji` 的 `b348121`。
- 審查時 `origin/main`：`87ea3be`；工作分支領先 6 個 commit，**尚未合併**。
- 正式 `main` 內的憲法與法學緒論仍是舊版 `topicRules: RegExp[]`、`optionReview()` 主題模板；本文件所述逐題種子改造只存在工作分支。
- 工作分支雖已移除憲法／法緒的舊模板，但種子未補齊。`buildConstitutionAnalysis()`、`buildLegalIntroductionAnalysis()` 遇到任何缺題會直接 throw，因此此分支目前不具備可部署條件。

### 全站題目與解析覆蓋狀況

| 科目 | 題庫現況 | 解析審查結果 |
|---|---:|---|
| 民法 | 175 題選擇＋26 題申論 | 175 題選擇題有逐題 JSON，不是執行時 regex；但多數 `application` 只說明答案選項，未逐項判斷 A～D，尚未完成全面正確性複核。申論題維持標記閱讀。 |
| 刑法 | 175 題選擇＋26 題申論 | 其中 174 題仍是已刪除的 `scripts/generate-criminal-analyses.py` 所產生之 regex 主題模板，必須全面重寫；108 年第 1 題已改為逐題解析。申論題維持標記閱讀。 |
| 憲法 | 150 題選擇 | 工作分支僅 40／150 題有逐題研究種子，尚缺 110 題。 |
| 法學緒論 | 150 題選擇 | 工作分支僅 26／150 題有逐題研究種子，尚缺 124 題。 |
| 英文 | 200 題選擇 | 200 題都有繁中翻譯與選項詞性，但 `app/data/english-analyses.ts` 仍以 regex 判斷題型並套用共用的答案理由、考點與干擾選項句型，不能視為逐題詳解。 |
| 國文 | 100 題選擇＋20 題申論 | 100 題選擇題是 `chinese-analyses.ts` 內逐題寫死的 note，非執行時 regex；但尚未逐題對外查證全部內容。申論題維持標記閱讀。 |
| 行政法概要 | 28 題申論 | 無詳解，僅提供原題閱讀與標記已閱讀。 |
| 民事訴訟法概要 | 20 題申論 | 無詳解，僅提供原題閱讀與標記已閱讀。 |
| 刑事訴訟法概要 | 20 題申論 | 無詳解，僅提供原題閱讀與標記已閱讀。 |

全站共 1,090 題：950 題選擇題、140 題申論題。950 題選擇題目前都有 `answer`、官方試題 `sourceUrl` 及官方答案 `answerUrl`；這只能證明答案資料可追溯，不能取代逐題比對官方答案檔與解析內容的人工驗證。

### 已確認的模板與錯誤風險

1. **刑法是明確的 regex 模板產物。** 審查時的 `scripts/generate-criminal-analyses.py` 以 `TOPICS` 正規表示式比對題幹，`build_seed()` 再拼入題幹、官方答案與固定句型。175 題中有 164 題重複使用相同的 `issue`、`rule` 或 `trap`；172 題使用「題幹重點為……依上述要件檢驗……最符合命題時法」句型。該產生器已在後續簡易修正中刪除，避免再覆寫人工解析；既有 174 題模板內容仍須逐題重寫。
2. **刑法已找到並修正一題實質矛盾。** `app/data/analyses/criminal-law-108.json` 第 1 題原本問「何者錯誤」，解析卻說官方答案 C 的錯誤敘述「最符合命題時法」；現已依刑法第 1、2 條改成 A～D 逐項判斷並加入回歸測試。其餘否定問法仍可能有同型問題，不可只做文字微調，必須逐選項重新研究。
3. **英文是執行時共用模板。** `english-analyses.ts` 的 `readingQuestion`、`numberedBlank` 等 regex 只用來分類題型或找句子，`answerReason`、`keyPoint`、`distractors` 是固定分支句型；翻譯資料逐題存在，不代表詳解逐題撰寫。
4. **民法不是 regex，但未達目前品質標準。** 175 份種子的四個文字欄位沒有完全重複，不過 `application` 中位長度約 33 字，常只解釋答案選項，不能據此推定其餘三個選項已驗證。
5. **現有測試防線只嚴格涵蓋憲法與法緒的新種子。** `tests/rendered-html.test.mjs` 對兩科要求各 150 題、禁止模板句與重複 application；民法、刑法目前只檢查解析欄位及法條存在，尚未防止 regex 模板或逐選項缺漏。

### 審查時測試狀態

- `npm run lint`：通過。
- Next.js 靜態建置：通過；這不代表動態載入缺種子的憲法／法緒能正常使用。
- 本批法緒 105 年第 26～30 題的格式與唯一性檢查：通過。
- `npm test`：刻意失敗於憲法種子數 `40 !== 150`；第一個完整性斷言就停止，因此法緒的 `26 !== 150` 尚未顯示，但同樣未達標。

### 後續處理順序

1. 依本文件既定順序補完憲法／法緒 300 題逐題種子，直到完整性測試通過。
2. 以同一套「研究來源 → 官方答案核對 → A～D 逐項涵攝 → 對抗式驗證」流程全面取代刑法剩餘 174 題 regex 解析；`generate-criminal-analyses.py` 已刪除，不得恢復以模板批次覆寫人工內容。
3. 重寫英文 200 題的 `answerReason`、`keyPoint`、各干擾選項理由；翻譯與詞性可以沿用，但不得再以單一模板代替題解。
4. 複核民法 175 題與國文 100 題，補齊每個選項的具體理由及實際參考來源。
5. 擴充測試：所有有選項的法律科目均須檢查 A～D 覆蓋、禁止共用模板、跨題 application 不得重複，並加入否定問法與官方答案語意一致性檢查。
6. 所有解析完成、`npm run lint`、`npm test`、`npm run test:e2e` 全綠後，才可合併至 `main` 並部署。

## 三、已完成（在分支 `claude/remote-content-review-1lpzji`）

### Commit 1：題庫資料清理
- `app/data/legal-knowledge-and-english-questions.json`：28 個選項尾端殘留試卷頁尾雜訊「代號：XXXX 頁次：X－X」（regex `\s*代號：\d+\s*頁次：\d+－\d+\s*$`），已全部移除。
- `app/data/english-translations.json`：8 筆翻譯欄壞掉（只放英文原字＋雜訊），已補正繁中翻譯（ordered→命令；訂購 v.、staring→凝視的；盯著看 adj./v.、retreat→撤退；退縮 v./n.、held the ground→堅守立場 片語、reserved→預訂；保留 v.、terminated→終止；結束 v.、motion→動作；動議 n.、reflection→反射；倒影 n.，各在該題第 4 個選項 D）。
- 已重跑 `node scripts/generate-question-data.mjs` 更新產生檔。

### Commit 2：解析架構重構
- `app/data/constitution-analyses.ts`、`app/data/legal-introduction-analyses.ts`：移除 regex 主題模板與 optionReview 空話產生器，改為讀取逐題種子檔 `app/data/analyses/constitution-{105..114}.json` 與 `legal-introduction-{105..114}.json`（照民法 `judicial-fourth-analyses.ts`／刑法 `criminal-law-analyses.ts` 的既有模式）。缺種子會 throw，保證不會再出現空殼解析。測試要求保留符號 `buildConstitutionAnalysis`、`decisionReferences`、`buildLegalIntroductionAnalysis`。
- `scripts/generate-question-data.mjs`：憲法／法緒的搜尋索引 laws/keywords 改由種子 references 與 issue/trap 產生。
- `tests/rendered-html.test.mjs`：新增防線——兩科各 150 份種子缺一不可、issue/rule/application/trap 有最低長度、confidence ∈{高,中}、references ≥1、涵攝禁止模板句（`須注意其主體、要件…`／`應再核對其主體…`／`代號：`／`頁次：`）、300 份 application 不得重複。**種子補齊前 `npm test` 會紅，這是刻意的。**

### 種子內容進度（目前：257／300 題完成並通過本批驗證）
| 批次 | 完成 | 批次 | 完成 |
|---|---|---|---|
| 憲法 105 | 15/15 ✅ | 法緒 105 | 15/15 ✅ |
| 憲法 106 | 15/15 ✅ | 法緒 106 | 15/15 ✅ |
| 憲法 107 | 15/15 ✅ | 法緒 107 | 15/15 ✅ |
| 憲法 108 | 15/15 ✅ | 法緒 108 | 15/15 ✅ |
| 憲法 109 | 15/15 ✅ | 法緒 109 | 15/15 ✅ |
| 憲法 110 | 15/15 ✅ | 法緒 110 | 15/15 ✅ |
| 憲法 111 | 15/15 ✅ | 法緒 111 | 15/15 ✅ |
| 憲法 112 | 15/15 ✅ | 法緒 112 | 15/15 ✅ |
| 憲法 113 | 15/15 ✅ | 法緒 113 | 2/15 |
| 憲法 114 | 0/15 | 法緒 114 | 0/15 |

已完成的種子**已直接合併**進 `app/data/analyses/{constitution,legal-introduction}-<年度>.json`（key = 題目 id，如 `judicial-fourth-105-legal-knowledge-16`）。每題實際參考的網頁來源另存於 `docs/handover/analysis-sources-map.json`；自法緒 106 批起改存每批一檔 `docs/handover/sources/<subject>-<year>.json`（id → URL 陣列），不隨網站出貨。

### 精確缺題清單（43 題，官方題號；id 格式 `judicial-fourth-<年>-legal-knowledge-<兩位數題號>`）
- 憲法 105 年：✅ 全數完成
- 憲法 106 年：✅ 全數完成
- 憲法 107 年：✅ 全數完成
- 憲法 108 年：✅ 全數完成
- 憲法 109 年：✅ 全數完成
- 憲法 110 年：✅ 全數完成
- 憲法 111 年：✅ 全數完成
- 憲法 112 年：✅ 全數完成
- 憲法 113 年：✅ 全數完成
- 憲法 114 年：缺第 1～15 題（全缺）
- 法學緒論 105 年：✅ 全數完成
- 法學緒論 106 年：✅ 全數完成
- 法學緒論 107 年：✅ 全數完成
- 法學緒論 108 年：✅ 全數完成
- 法學緒論 109 年：✅ 全數完成
- 法學緒論 110 年：✅ 全數完成
- 法學緒論 111 年：✅ 全數完成
- 法學緒論 112 年：✅ 全數完成
- 法學緒論 113 年：缺第 18～30 題
- 法學緒論 114 年：缺第 16～30 題（全缺）

（判斷「某題是否已完成」的唯一依據：對應年度種子 JSON 內是否已有該題 id 的 key。接手時請重算一次，以 repo 現況為準。）

## 三之二、2026-07-17 第七段落收尾狀態（本節為最新接手入口）

**本段落由誰做到哪：** 憲法 113 第 3–10 題研究稿已依官方判決、法條逐題抽查，第 11–15 題已補完並共同整合；憲法 113 現為 **15/15**，總進度 **257/300**。`pending-seeds/` 已清空。剩 43 題、3 批：法緒 113（13 題）→ 憲法 114（15 題）→ 法緒 114（15 題）。

**本批品質：** 13 題均符合官方答案、A～D 逐選項涵攝、至少 1 個官方 reference；核心依據抽查包含 111 年憲判字第 4 號、第 1 號、第 6 號、釋字第 436、542、704 號，以及憲法、增修條文與憲法訴訟法。整合腳本 `integrate-batch.py` 已移除舊 session 的 Linux 絕對路徑，現在可從 repo 位置在 Windows／Linux 執行，並可用第三參數指定 seeds 目錄。

**下一步：** 依 `remaining-batches.json` 第一批接法緒 113 第 18–30 題，使用 `rewrite-by-ids.js` 研究、驗證後執行 `python docs/handover/integrate-batch.py legal-introduction 113 <seeds-dir>`。每批照 generate → lint → test → commit → 推工作分支。最終合併與正式部署仍須使用者明確授權。

**部署狀態：** 本批只更新工作分支，不合併、不觸發正式部署；正式站仍以交接記錄的 `7f26270`（229/300）為準。

## 三之一、2026-07-16 第六段落收尾狀態（前一接手記錄）

**本段落由誰做到哪：** 憲法 105–112、法緒 105–112 全部完成並通過驗證（**244/300**）。憲法 113 第 3–10 題研究稿已產出但**未驗證**，存於 `docs/handover/pending-seeds/`（8 檔）；第 11–15 題未開始。剩 56 題（113–114 年，共 4 批）。

**部署狀態：** 正式站 main=`7f26270`（229/300：105–112 憲法全部＋法緒 105–111）。工作分支 tip=`bc33218` 含法緒 112（244/300），**尚未合併部署**——合併 main 需使用者明確授權。GitHub 寫入權正常，git push 直接可用。

**接手重啟步驟：**
1. `git fetch origin && git checkout claude/remote-content-review-1lpzji && git pull`。
2. 重建題目小檔：`python3 docs/handover/make-question-files.py <questionsDir>`（放 scratchpad）。
3. pending-seeds 有憲法 113 第 3–10 題研究稿：複製到 seedsDir，用 `docs/handover/verify-by-ids.js` 把整批 13 題（03–15）丟進去跑（3–10 走驗證優先、11–15 自動轉研究），完成後 `integrate-batch.py constitution 113` 合併、清 pending-seeds。
4. 之後單批續跑：法緒 113 → 憲法 114 → 法緒 114（`rewrite-by-ids.js`，ids 見 `remaining-batches.json`）。每批：integrate → generate → lint → commit → 推工作分支。
5. 全 300 題完成：tests/rendered-html.test.mjs 完整性斷言收回（兩處 `<=150` 改回 `assert.equal(...,150)`、`if (!seed) continue` 移除）→ `npm test` 全綠 → 更新本文件 → 推分支 → **詢問使用者**後合併 main 部署。
6. 各批 pass/fixed 統計：法緒106=10/5、憲107=4/9、法緒107=6/5、憲108=8/7、法緒108=13/2、憲109=4/9、法緒109=10/1、憲110=7/8、法緒110=9/6、法緒111=10/3、憲111=2/9、憲112=3/12、法緒112=8/7。全數 0 failed。研究批 25–35 分／90–110 萬 tokens；驗證批 9–19 分／33–63 萬 tokens。用量限制每 5 小時重置（歷次：6:10/8:50 UTC 等），撞牆後 resumeFromRunId 續跑即可。

## 三之二、逐選項詳解合規審查（2026-07-17，使用者定案規則）

### 定案規則（所有解析撰寫者必須遵守，違者不得合併）
1. **每一題**的「套入本題」必須包含 A、B、C、D **四個選項各自**的對錯理由（為何正確／為何錯誤、錯在哪個要件或概念）。
2. 四個選項的說明必須**分開呈現**（各自獨立區塊／欄位），不得擠成同一大段。資料格式將改為結構化 `application: { intro?, A, B, C, D }`（UI 逐選項分行渲染，舊字串格式僅過渡期相容）；新批次一律直接寫結構化格式。

### 審查結果總表（依內容規則 1 檢查；規則 2 目前「全站皆未達標」——所有 application 仍是整段字串，待格式遷移）

| 科目 | 未完成 | 已做但不合規（內容未逐選項） | 合規 |
|---|---|---|---|
| 憲法＋法緒 | 43 題（法緒113×13、憲114×15、法緒114×15） | **22 題**（清單見下） | 235 題 |
| 民法 | 0 | **175 題全部**（多只解釋答案選項） | 0 |
| 刑法 | 0 | **174 題**（regex 模板產物） | 1 題（108 年第 1 題） |
| 國文 | 0 | 待人工複核（辨析多以成語原文而非字母標示，字母偵測不適用；抽樣看多有逐項辨析） | — |
| 英文 | 0 | **200 題**（有逐選項翻譯＋詞性表，但「為何錯」的理由是共用句型，需逐題補寫） | 0 |

### 憲法/法緒 22 題不合規清單（敘述式帶過或只講答案，需重寫為逐選項）
  - `judicial-fourth-108-legal-knowledge-11（缺 ABCD）`
  - `judicial-fourth-109-legal-knowledge-04（缺 ABCD）`
  - `judicial-fourth-109-legal-knowledge-09（缺 D）`
  - `judicial-fourth-110-legal-knowledge-06（缺 ABCD）`
  - `judicial-fourth-110-legal-knowledge-08（缺 AC）`
  - `judicial-fourth-110-legal-knowledge-15（缺 ABD）`
  - `judicial-fourth-112-legal-knowledge-08（缺 ABCD）`
  - `judicial-fourth-112-legal-knowledge-11（缺 ABCD）`
  - `judicial-fourth-108-legal-knowledge-17（缺 ABC）`
  - `judicial-fourth-108-legal-knowledge-19（缺 ABCD）`
  - `judicial-fourth-108-legal-knowledge-21（缺 ABCD）`
  - `judicial-fourth-108-legal-knowledge-27（缺 C）`
  - `judicial-fourth-109-legal-knowledge-20（缺 ABCD）`
  - `judicial-fourth-109-legal-knowledge-21（缺 ABCD）`
  - `judicial-fourth-109-legal-knowledge-24（缺 D）`
  - `judicial-fourth-110-legal-knowledge-17（缺 C）`
  - `judicial-fourth-110-legal-knowledge-19（缺 D）`
  - `judicial-fourth-110-legal-knowledge-21（缺 ABCD）`
  - `judicial-fourth-110-legal-knowledge-26（缺 D）`
  - `judicial-fourth-110-legal-knowledge-27（缺 ABCD）`
  - `judicial-fourth-110-legal-knowledge-29（缺 ABCD）`
  - `judicial-fourth-110-legal-knowledge-30（缺 ABCD）`

### 處理順序（審查後定案，尚未執行——使用者指示先記錄不重寫）
1. 補完 43 題未完成（新批次直接用結構化格式）。
2. 重寫上列 22 題不合規。
3. 憲法/法緒 235 題合規內容做「格式遷移」：程式自動把 (A)…(B)…(C)…(D)… 字串拆成結構化欄位（內容不變），拆不動者列入重寫。
4. 刑法 174 題重寫 → 民法 175 題重寫 → 英文 200 題補寫理由 → 國文 100 題人工複核格式。
5. 整合工具與測試同步加入「A–D 四欄皆備」的強制檢查。

## 四、未完成項目與作法

### 1. 剩餘 234 題解析（主要工作）
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
- 本 session 後期 `git push` 一直被 git proxy 拒 403（fetch 正常、GitHub MCP 認證正常，只有寫入被擋）。若新 session 推送正常就沒事；若同樣 403：本 session 實測 GitHub MCP `push_files` 也回 403 Resource not accessible by integration——整個 session 對 GitHub 唯讀。解法：持續本地 commit，於每批完成後 `git bundle create <file> origin/<branch>..HEAD` 並以 SendUserFile 交付使用者，由具寫入權的環境 `git fetch <bundle> <branch>:<branch>` 還原後推送（此流程已於 07-15 實際走通一次）。
- 分支：一切都推 `claude/remote-content-review-1lpzji`（不要開 PR，使用者沒要求）。
- commit 身分需 `git config user.email noreply@anthropic.com && git config user.name Claude`，否則 stop hook 會擋。

### 5. 其他待辦（次要）
- `docs/handover/` 整個資料夾是交接用暫存，收尾時可刪除（sources-map 若想留供日後查證可移到 docs/ 正式位置）。
- README「資料設計」一節已補種子檔路徑說明，無需再動。

## 五、關鍵檔案索引
| 檔案 | 用途 |
|---|---|
| `app/data/analyses/constitution-<年>.json` ×10 | 憲法逐題種子（進行中） |
| `app/data/analyses/legal-introduction-<年>.json` ×10 | 法緒逐題種子（進行中） |
| `app/data/constitution-analyses.ts` | 憲法解析組裝器（已重構） |
| `app/data/legal-introduction-analyses.ts` | 法緒解析組裝器（已重構） |
| `tests/rendered-html.test.mjs` | 含 300 題種子品質防線 |
| `docs/handover/rewrite-by-ids.js` | 現行研究 Workflow 腳本（依 ids 清單跑，prompt 完整） |
| `docs/handover/verify-by-ids.js` | 驗證優先 Workflow 腳本（處理 pending 研究稿） |
| `docs/handover/rewrite-workflow.js` | 舊版 Workflow 腳本（依年度展開，僅留參考） |
| `docs/handover/integrate-batch.py` | 批次種子驗證＋合併工具 |
| `docs/handover/make-question-files.py` | 重建工作流所需題目小檔 |
| `docs/handover/remaining-batches.json` | 剩餘 43 題的批次順序與 ids |
| `docs/handover/pending-seeds/` | 跨 session 待驗證研究稿暫存；目前已清空 |
| `docs/handover/analysis-sources-map.json` | 每題實際參考來源 URL |
| `app/data/legal-knowledge-and-english-questions.json` | 300 題原始題庫（含官方答案，id 規則：憲法=每年 Q1-15、法緒=Q16-30） |

## 六、品質標準（驗收時檢查）
1. 任兩題的 application 不得相同；不得出現模板句（測試會抓）。
2. 每個選項都有各自的法律理由（不是「須注意…差異」這種話）。
3. 解析結論＝考選部官方答案。
4. 全部台灣繁體中文、台灣法律用語。
5. 有來源可查（sources-map），但正文是改寫不是照抄。
