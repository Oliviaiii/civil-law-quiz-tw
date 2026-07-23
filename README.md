# 書記官法科研習室

**正式前台：** <https://oliviaiii.github.io/civil-law-quiz-tw/>

台灣法院書記官法科考古題的純前端練習工具。本專案的主要使用者與產品設計基準是準備**司法特考四等法院書記官**的考生；題庫保留共同適用類科標示，但功能取捨、題目編排與解析深度均優先服務法院書記官備考需求。

第一版聚焦在作答、官方答案核對、錯題本與本機進度保存，不需要帳號或資料庫。

## 科目範圍

- 已上線：國文、民法、刑法、行政法概要、民事訴訟法概要、刑事訴訟法概要、憲法、法學緒論、英文。

目前九個模組依法院書記官近年筆試科目規劃。行政法概要自民國 108 年起列入本科，因此本專案行政法資料範圍為 108–114 年；105–107 年不以其他考科代填。新增或更新科目前請先閱讀 [科目擴充共同規格](./docs/SUBJECT_EXPANSION.md)，並以當年度考選部公告為準。

## 協作開發

開始修改前，請先閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md) 與[靜態功能優化 Roadmap](./docs/STATIC_FEATURE_ROADMAP.md)；處理申論題命題主旨、爭點分類或跨考試關聯時，另讀[申論題考點地圖與跨考試關聯規格](./docs/ESSAY_ISSUE_MAP.md)；處理考選部 PDF、GitHub 留言、Windows 建置或 Sites 部署時，另先查看[開發與題庫匯入問題排除](./docs/TROUBLESHOOTING.md)。這些文件記錄產品邊界、資料格式、解析標準、功能進度、測試流程、已知環境問題與交接清單；功能或資料結構有變動時，必須同步更新相關文件。

## 已有功能

練習與判題：

- 點選選項後立即判題並顯示解析；以「爭點、法律規則、套入本題、結論」拆解個案題
- 解析信心標示、常見誤區與全國法規資料庫連結；解析區列出「考同一法條的其他題目」
- 依科目、來源、年度複選篩選，另支援未作答、曾答錯、到期複習、收藏、不確定範圍
- 民法選擇題支援章節篩選（總則／債編／物權／親屬與繼承，標籤由人工解析引用法條推導）
- 全文搜尋（題幹、選項、法條、解析關鍵字）與「114 法緒 18」題號快速跳轉
- 選項亂序練習（順序敏感題自動排除，判題仍對應原始選項）
- 自訂題組隨機練習（10／25／50／自訂題數，可續作）與選擇題模擬考（計時、答題卡、交卷判分、分科結果與錯題清單）

複習與紀錄：

- 錯題本、間隔複習佇列（答錯 1 天後複習、連續答對 3／7／14／30 天延後）
- 收藏與不確定標記（僅存本機）
- 每日一題與連續完成天數、每日作答熱力圖、考試倒數與每日建議題數
- 分科分年度完成數、答對數、待複習數；區分最後一次答對率與所有嘗試正確率
- `localStorage` 保存作答紀錄（v3 格式），JSON 匯出／匯入含全部欄位並支援舊版升級
- 繼續上次練習與 `#q=題目ID` 深連結

工具與體驗：

- 法條速查（民法、刑法站內條文＋出題頻率排行＋相關題目）與法條閃卡自測
- 申論題自我練習（本機草稿、計時器、自我檢核清單；不提供 AI 擬答）
- 法科申論題顯示本站整理的命題主旨、主要／次要爭點、法規版本提醒；點選爭點可展開同標籤歷屆題目並直接跳題（目前均標示為尚未人工複核）
- 申論考點總覽：以章節層級呈現已收錄歷屆申論題的「歷屆出題率（年度覆蓋率）」排行、出題題數與題目占比，可依科目與收錄年度範圍篩選、依覆蓋率或題數排序；點考點可展開各年度官方題目並跳回練習。統計卡同時揭露分子／分母、公式與資料範圍，並明確標示為草稿統計、非未來命題預測（統計於瀏覽器端按需載入，不進首頁 bundle）
- 深色模式（跟隨系統或手動切換）、PWA 離線練習（已載入題目離線可作答）
- 每題「回報問題」一鍵開啟預填的 GitHub Issue（題庫勘誤）
- 響應式版面；手機功能收進右側漢堡選單、篩選收合列懸浮於 Header 下方，底部整合收藏／不確定／上下題並在切題後對齊題幹

目前收錄民國 105–114 年司法特考四等法院書記官官方試題：民法與刑法各 201 題、憲法 150 題、法學緒論 150 題、英文 200 題、國文 120 題、行政法概要 28 題、民事訴訟法概要 20 題、刑事訴訟法概要 20 題，正式題共 1,090 題。國文 100 題選擇題依考選部答案判定，並提供判讀原則、正解理由與逐項辨析；作文、公文及三個新增法科的申論題均提供原題與「標記已閱讀」，不以非官方擬答冒充標準答案。

850 題選擇題均有逐題解析：法律科採「題目在問什麼、法律規則、套入本題、結論、常見誤區與官方依據」，英文採「考點、答案理由、關鍵句或文法結構、干擾選項與文章定位」。英文 200 題包含 20 組官方共用文章，題組與題號關係直接保存在共用資料集。民法 112、113 年第 24 題與刑法 111 年第 11 題依考選部更正為一律給分；刑法 112 年第 16 題接受 C、D，113 年第 22 題接受 B、D；114 年法學緒論第 18 題依考選部更正答案接受 A、B、C。

## 本機使用

需要 Node.js 22.13 以上版本。

```bash
npm install
npm run dev
```

建置與測試：

```bash
npm test
npm run lint
```

## GitHub Pages

推送到 `main` 後，GitHub Actions 會執行 `npm run build:pages`，並將 `out/` 的純靜態檔案部署到 GitHub Pages。

### 網站流量分析

正式站可使用 Cloudflare Web Analytics 統計隱私友善的瀏覽量與訪客數。先在 Cloudflare Web Analytics 建立網站並取得 token，再於 GitHub Repository 的 `Settings → Secrets and variables → Actions → Variables` 新增：

- 名稱：`CLOUDFLARE_WEB_ANALYTICS_TOKEN`
- 值：Cloudflare 提供的網站 token

GitHub Pages 建置會將該值注入 `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`。沒有設定時不會載入 Cloudflare beacon，因此本機開發與 fork 不會意外送出分析資料。

## 資料設計

- 題目型別：`app/data/questions.ts`（僅型別；題庫依科目拆在 `app/data/banks/`，按需載入）
- 產生的統計、搜尋索引與 Service Worker：`scripts/generate-question-data.mjs`（build 前自動執行）
- 司法四等官方題庫：`app/data/judicial-fourth-questions.json`
- 法學知識與英文共用原始題庫：`app/data/legal-knowledge-and-english-questions.json`
- 逐年選擇題解析：`app/data/analyses/`
- 憲法解析與官方依據：`app/data/constitution-analyses.ts`（逐題種子：`app/data/analyses/constitution-*.json`）
- 法學緒論解析與跨法規依據：`app/data/legal-introduction-analyses.ts`（逐題種子：`app/data/analyses/legal-introduction-*.json`）
- 英文解析：`app/data/english-analyses.ts`
- 英文題幹、文章與選項繁中翻譯／詞性：`app/data/english-translations.json`
- 共用參考來源型別：`app/data/references.ts`
- 民法完整條文索引：`app/data/civil-code-articles.json`
- 刑法官方題庫：`app/data/criminal-law-questions.json`
- 刑法逐年解析：`app/data/analyses/criminal-law-*.json`
- 刑法完整條文索引：`app/data/criminal-code-articles.json`
- 申論題命題主旨、主次爭點與子題標註：`app/data/essay-issues/*.json`
- 申論題標註型別與合併入口：`app/data/essay-issues.ts`
- 申論考點章節層級統計（建置期由標註＋題目資料產生、按需載入）：`public/data/essay-issue-stats.json`
- 申論考點統計型別、載入與年度範圍重算：`app/lib/essay-stats.ts`；總覽畫面：`app/components/EssayIssueOverview.tsx`
- 考選部 PDF 匯入器：`scripts/import-moex-judicial-fourth.py`
- 刑法 PDF 匯入器：`scripts/import-moex-criminal-law.py`
- 法學知識與英文共用匯入器：`scripts/import-moex-legal-knowledge.py`
- 英文學習翻譯更新工具：`scripts/import-english-translations.py`
- 民法條文更新工具：`scripts/import-civil-code.py`
- 刑法條文更新工具：`scripts/import-criminal-code.py`
- 本機進度介面：`app/lib/progress-store.ts`
- 主要互動：`app/page.tsx`

題庫與進度儲存已和畫面分開。未來接 Supabase 時，可以把題目讀取與 `progress-store` 換成遠端實作，保留作答介面與解析元件。

## 內容原則

- 國考題答案以考選部官方公告為準。
- 解析自行撰寫並附官方法條，不複製補習班或題庫平台詳解。
- 個案推論題標示信心程度，正式上線前仍應人工複核。
- 申論題考點資料即使已達 120/120 覆蓋，在真人法律審稿完成前仍標為 `draft`，不得顯示為已複核。
- 法條連結指向法務部全國法規資料庫；修法後應重新檢查題目與解析。
