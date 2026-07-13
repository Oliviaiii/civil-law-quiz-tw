# 書記官法科研習室

**正式前台：** <https://oliviaiii1224.github.io/civil-law-quiz-tw/>

台灣法院書記官法科考古題的純前端練習工具。本專案的主要使用者與產品設計基準是準備**司法特考四等法院書記官**的考生；題庫保留共同適用類科標示，但功能取捨、題目編排與解析深度均優先服務法院書記官備考需求。

第一版聚焦在作答、官方答案核對、錯題本與本機進度保存，不需要帳號或資料庫。

## 科目範圍

- 已上線：民法、憲法。
- 規劃中：[刑法（#1）](https://github.com/oliviaiii1224/civil-law-quiz-tw/issues/1)、[法學緒論（#3）](https://github.com/oliviaiii1224/civil-law-quiz-tw/issues/3)、[英文（#4）](https://github.com/oliviaiii1224/civil-law-quiz-tw/issues/4)。

上述五個模組是目前產品規劃範圍，不等於法院書記官完整應試科目；官方另列國文、行政法概要及民事訴訟法概要與刑事訴訟法概要等科目。新增科目前請先閱讀 [科目擴充共同規格](./docs/SUBJECT_EXPANSION.md)，並以當年度考選部公告為準。

## 協作開發

開始修改前，請先閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md)。該文件記錄本專案的產品邊界、資料格式、解析標準、文件要求、測試流程、Git 協作方式、GitHub Pages 部署與交接清單；功能或資料結構有變動時，必須同步更新相關文件。

## 已有功能

- 點選選項後立即判題並顯示解析
- 以「爭點、法律規則、套入本題、結論」拆解個案題
- 解析信心標示、常見誤區與全國法規資料庫連結
- 依章節、未作答、曾答錯篩選
- 依民法／憲法科目篩選與分科進度統計
- 錯題本與各章進度統計
- `localStorage` 保存作答紀錄
- JSON 匯出／匯入，方便備份或換裝置
- 響應式版面，支援手機與桌面
- 手機版固定顯示上一題／下一題，不必捲過完整解析

目前已收錄民國 105–114 年司法特考四等「民法概要」全部官方試題：175 題選擇題與 26 題申論題；另從同期間「法學知識與英文」共用試卷拆分 150 題憲法題。正式題共 351 題，另保留 10 題自行編寫且明確標示的民法示範題。

325 題選擇題均提供「題目在問什麼、法律規則、套入本題、結論、常見誤區與官方依據」。民國 112、113 年民法第 24 題依考選部更正答案標為一律給分；114 年法學知識與英文第 18 題依更正答案保存 A／B／C 皆可，但該題屬法學緒論，待 #3 上線時才會顯示。

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

## 資料設計

- 題庫：`app/data/questions.ts`
- 司法四等官方題庫：`app/data/judicial-fourth-questions.json`
- 法學知識與英文共用原始題庫：`app/data/legal-knowledge-and-english-questions.json`
- 逐年選擇題解析：`app/data/analyses/`
- 憲法解析與官方依據：`app/data/constitution-analyses.ts`
- 民法完整條文索引：`app/data/civil-code-articles.json`
- 考選部 PDF 匯入器：`scripts/import-moex-judicial-fourth.py`
- 法學知識與英文共用匯入器：`scripts/import-moex-legal-knowledge.py`
- 民法條文更新工具：`scripts/import-civil-code.py`
- 本機進度介面：`app/lib/progress-store.ts`
- 主要互動：`app/page.tsx`

題庫與進度儲存已和畫面分開。未來接 Supabase 時，可以把題目讀取與 `progress-store` 換成遠端實作，保留作答介面與解析元件。

## 內容原則

- 國考題答案以考選部官方公告為準。
- 解析自行撰寫並附官方法條，不複製補習班或題庫平台詳解。
- 個案推論題標示信心程度，正式上線前仍應人工複核。
- 法條連結指向法務部全國法規資料庫；修法後應重新檢查題目與解析。
