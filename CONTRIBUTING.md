# 協作開發與交接規範

本文件是「書記官研習室」的開發、內容維護與部署準則。接手任何工作前，請先讀完本文件與 [README.md](./README.md)，不要只依畫面推測資料結構或產品方向。

涉及刑法、法學緒論、憲法或英文等新科目時，還必須閱讀 [科目擴充共同規格](./docs/SUBJECT_EXPANSION.md)；需要下載考選部 PDF、操作 GitHub 留言、在 Windows 建置或使用 Sites 部署時，先閱讀[開發與題庫匯入問題排除](./docs/TROUBLESHOOTING.md)。跨科共同規則放在共同規格，單一科目的工作範圍與驗收條件則放在對應 GitHub Issue。

## 1. 產品定位與開發原則

### 主要對象

- 主要使用者：準備**司法特考四等法院書記官**的考生。
- 主要題庫：司法特考四等法院書記官「民法概要」與「刑法概要」官方考古題。
- 同份試題若也適用執達員、執行員等類科，必須保留於 `applicableCategories`，但不因此改變法院書記官優先的產品定位。
- 新功能若有取捨，優先考慮法院書記官考生的刷題效率、個案題辨識、法條核對、錯題複習與手機操作。

### 不可破壞的內容原則

1. 題目與答案以考選部官方檔案為準，AI 不得自行更改官方答案。
2. 解析必須自行撰寫。可以參考補習班、教科書或題庫網站理解爭點，但不得複製、近似改寫特定來源的完整詳解。
3. 每題解析應讓讀者看見「題目在問什麼、法律規則、如何套入、結論、常見誤區、相關法條」。
4. 法條優先引用全國法規資料庫。涉及舊法時，必須明確區分「命題時法」與「現行法」。
5. AI 只能協助撰寫與整理解析；官方答案、題目文字、法條版本及個案推論仍須人工複核。
6. 不把補習班或第三方題庫解析當成本站內容來源，也不要把其文字加入 Git 歷史。

## 2. 目前架構

本站目前是可部署到 GitHub Pages 的純靜態 Next.js 網站：

```text
考選部 PDF
  -> scripts/import-moex-judicial-fourth.py
  -> app/data/judicial-fourth-questions.json
  -> app/data/banks/*（依科目拆分，動態 import 按需載入）
                              -> app/page.tsx -> 靜態網站
逐年自行撰寫解析 JSON
  -> app/data/judicial-fourth-analyses.ts
  -> 民法條文索引

scripts/generate-question-data.mjs（build 前自動執行）
  -> app/data/bank-manifest.ts（年度與題數統計）
  -> public/data/search-index.json＋manifest.json（搜尋索引與資料版本 hash）

作答結果 -> app/lib/progress-store.ts -> 瀏覽器 localStorage
```

重要檔案：

| 路徑 | 用途 |
| --- | --- |
| `app/page.tsx` | 篩選、作答、顯示解析、錯題本、進度及匯出入互動 |
| `app/globals.css` | 桌面與手機版樣式 |
| `app/data/questions.ts` | 統一的 `Question` 與科目型別（僅型別，不含資料） |
| `app/data/banks/` | 依科目拆分的題庫組裝模組，經動態 import 按需載入 |
| `app/data/bank-manifest.ts` | 由腳本產生的年度與題數統計（請勿手改） |
| `app/hooks/use-question-bank.ts` | 題庫按需載入、快取與載入狀態 |
| `scripts/generate-question-data.mjs` | 產生 bank-manifest、搜尋索引與資料版本 hash |
| `app/data/judicial-fourth-questions.json` | 考選部題目與官方答案的正規化資料 |
| `app/data/analyses/` | 依年度拆分的選擇題解析 |
| `app/data/judicial-fourth-analyses.ts` | 合併解析、產生結論、附加法條原文 |
| `app/data/civil-code-articles.json` | 民法條文索引及資料版本 |
| `app/data/criminal-law-questions.json` | 刑法官方題目、答案、更正答案及來源連結 |
| `app/data/analyses/criminal-law-*.json` | 刑法各年度測驗題解析 |
| `app/data/criminal-code-articles.json` | 刑法條文索引及資料版本 |
| `app/lib/progress-store.ts` | localStorage 格式、驗證與舊版本遷移 |
| `scripts/import-moex-judicial-fourth.py` | 從已下載的考選部 PDF 匯入題目及答案 |
| `scripts/import-civil-code.py` | 更新民法條文索引 |
| `scripts/import-moex-criminal-law.py` | 匯入法院書記官刑法概要 PDF，並處理更正及複數答案 |
| `scripts/import-criminal-code.py` | 更新刑法條文索引 |
| `scripts/generate-criminal-analyses.py` | 產生可逐題審查、修訂的刑法結構化解析初稿 |
| `tests/rendered-html.test.mjs` | 靜態輸出、題數、解析覆蓋率及重要行為防退化測試 |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 自動建置與部署 |

畫面、題庫、解析與進度儲存刻意分離。未來接 Supabase 或其他後端時，應優先替換資料存取層，不要重寫已穩定的作答元件。

## 3. 本機環境與啟動

必要環境：

- Node.js 22.13 以上
- npm（使用既有 `package-lock.json`）
- Python 3（只有匯入考選部 PDF 或更新法條時需要）
- `pdfplumber`（只有執行考選部 PDF 匯入器時需要）

第一次安裝與啟動：

```bash
npm ci
npm run dev
```

若要匯入 PDF：

```bash
python -m pip install pdfplumber
```

請保留 npm、Next.js 與既有鎖定檔，不要因個人偏好改用另一個套件管理器或替換整體架構。

> 2026-07-14 起已移除早期範本殘留的 vinext／Cloudflare Worker／drizzle 後端腳手架（`worker/`、`vite.config.ts`、`db/`、`drizzle/`、`examples/` 等），與「純靜態 GitHub Pages」原則一致；`npm run dev` 現在直接使用 `next dev`，`npm start` 以本機靜態伺服器預覽 `out/`。如需這些檔案可從 Git 歷史還原。

## 4. 日常開發流程

1. 從最新 `main` 建立工作分支，例如 `feature/新增年度題庫`、`fix/未作答跳題` 或 Codex 使用的 `codex/...`。
2. 先確認需求是否符合「司法特考四等法院書記官」主軸，並找出受影響的畫面、題庫、解析、儲存與文件。
3. 只修改任務所需的檔案；工作區內其他人的變更不得覆蓋或刪除。
4. 資料與程式一起修改：新欄位必須同步更新型別、轉換、畫面、測試及文件。
5. 完成後依第 10 節執行檢查，再提交 Pull Request。
6. PR 經審查與測試通過後合併到 `main`；合併即會觸發正式部署。

提交訊息使用繁體中文，格式如下：

```text
類型【模組或頁面】簡述變更
```

例如：

```text
新增【司法四等題庫】匯入115年民法概要試題
修正【未作答篩選】作答後保留判題結果與解析
文件【協作規範】補充題庫人工複核流程
```

常用類型：`新增`、`修正`、`調整`、`重構`、`效能`、`樣式`、`文件`、`測試`、`相依`、`設定`、`工具`、`CI/CD`、`資安`。

## 5. 題庫資料格式

正式考題存於 `app/data/judicial-fourth-questions.json`。每筆資料格式如下：

```json
{
  "exam": "司法特考四等",
  "rocYear": 114,
  "gregorianYear": 2025,
  "subject": "民法概要",
  "applicableCategories": ["法院書記官", "執達員", "執行員"],
  "sourceUrl": "考選部官方試題 PDF 網址",
  "id": "judicial-fourth-114-mcq-01",
  "format": "選擇題",
  "officialQuestionNumber": 1,
  "prompt": "完整題幹",
  "options": ["選項 A", "選項 B", "選項 C", "選項 D"],
  "answer": 0,
  "allCredit": false,
  "answerSource": "考選部標準答案",
  "answerUrl": "考選部官方答案 PDF 網址"
}
```

欄位規則：

- `id` 永遠穩定且不可重複，格式為 `judicial-fourth-{民國年}-{mcq|essay}-{兩位數題號}`。已上線 ID 不得任意改名，否則使用者的 localStorage 進度會失聯。
- `answer` 使用零起算：A = `0`、B = `1`、C = `2`、D = `3`。申論題或未公告答案為 `null`。
- 更正答案為一律給分時，`allCredit` 設為 `true`，`answer` 設為 `null`，並以更正答案 PDF 作為 `answerUrl`。
- `prompt` 與 `options` 應忠於官方試題，只修正 PDF 解析造成的空白、異體字或亂碼，不得自行改寫題意。
- `sourceUrl`、`answerUrl` 與 `answerSource` 必須保留，讓使用者可回查官方依據。
- 申論題的 `options` 是空陣列，本站不得把 AI 擬答標示成官方擬答。

## 6. 解析資料格式與寫作標準

每個有選擇題的年度建立 `app/data/analyses/judicial-fourth-{民國年}.json`。最外層 key 必須等於題目 `id`：

```json
{
  "judicial-fourth-114-mcq-01": {
    "issue": "本題真正要判斷的法律問題。",
    "rule": "適用的法律規則、要件與必要例外。",
    "application": "逐一抓題目事實，說明為何符合或不符合要件。",
    "trap": "容易混淆的概念、例外、起算點或題目陷阱。",
    "articles": ["27"],
    "confidence": "高"
  }
}
```

欄位要求：

| 欄位 | 寫法 |
| --- | --- |
| `issue` | 用問句或一句話指出爭點，不重抄整段題目。 |
| `rule` | 先寫一般規則，再寫本題必要的例外；不得只說「依民法規定」。 |
| `application` | 必須引用本題關鍵事實並完成涵攝，個案型題目不可省略。 |
| `trap` | 指出最可能誤選的原因，以及如何區分相近概念。 |
| `articles` | 列出真正用到的法條，不以大量無關條號堆砌。 |
| `confidence` | 選填，只能為 `高` 或 `中`；有實務爭議、舊法或官方一律給分時通常用 `中`。 |

`conclusion` 不直接寫入逐年 JSON。`app/data/judicial-fourth-analyses.ts` 會依官方答案自動產生結論，避免解析文字與官方答案不一致。因此更動答案時，先更動官方題庫資料，再確認產生的結論。

一般民法法條可只寫條號，例如：

```json
"articles": ["92", "93", "114"]
```

若引用命題時舊法、特別法、判決或現行索引沒有的內容，必須用完整物件，不可讓系統誤帶現行民法文字：

```json
"articles": [
  {
    "article": "205（命題時）",
    "lawName": "民法",
    "text": "命題當時適用的條文文字或精確摘要。",
    "url": "可供核對的官方或可信來源網址"
  }
]
```

完成解析後至少人工檢查：

- 官方答案字母、一律給分及更正答案是否一致。
- 題目究竟問「正確」、「錯誤」、「何者不得」或「何者最適當」。
- 法律關係的主體、時間點、意思表示名義及善意／惡意是否看反。
- 法條是命題時法還是現行法。
- `rule` 與 `application` 是否真的支持官方結論。
- 文字是否為自行撰寫，沒有貼入第三方解析。

## 7. 新增一個考試年度的完整流程

### 7.1 取得官方檔案

從考選部考畢試題查詢平臺下載並放入不提交 Git 的 `tmp/pdfs/`：

```text
tmp/pdfs/115-Q.pdf  # 試題
tmp/pdfs/115-S.pdf  # 標準答案
tmp/pdfs/115-M.pdf  # 更正答案；有此檔時優先於 S
```

核對考試代碼、類科代碼與科目代碼後，將新年度加入 `scripts/import-moex-judicial-fourth.py` 的 `MANIFEST`。同時更新該腳本的年度範圍、預期題數及一律給分驗證，不可只放 PDF 就直接執行。

### 7.2 執行與核對匯入

```bash
python scripts/import-moex-judicial-fourth.py
```

匯入會重寫 `app/data/judicial-fourth-questions.json`。執行後必須逐題對照官方 PDF，至少核對：

- 題號、題幹、四個選項及跨頁文字。
- 選項字母是否正確對應零起算 `answer`。
- 標準答案、更正答案與一律給分題。
- `sourceUrl`、`answerUrl`、適用類科及年度。
- 題目 ID 是否符合命名規則，舊 ID 是否保持不變。

PDF 版面每年可能不同。若解析器失敗，應針對該年度新增可說明、可驗證的解析分支，不要手動改完輸出檔卻不修匯入器，否則下次重跑會遺失修正。

### 7.3 新增解析

1. 建立 `app/data/analyses/judicial-fourth-115.json`。
2. 依第 6 節完成該年度每一題選擇題解析。
3. 在 `app/data/judicial-fourth-analyses.ts` import 新檔並合併到 `seeds`。
4. 對照官方答案與法條逐題人工複核；有疑義時標記 `confidence: "中"`，不要自行改答案配合解析。
5. 更新測試中的總題數、年度題數、解析總數及一律給分題清單。
6. 更新 README 的收錄年度與題數。

### 7.4 更新現行民法

需要更新法條索引時執行：

```bash
python scripts/import-civil-code.py
```

接著檢查 `updatedAt`、條文筆數與差異。法條更新不代表舊考題解析可以直接套用新法；凡修法影響答案或說明，應保留命題時法並另外提示現行法差異。

## 8. 互動與進度資料規範

- 使用者點選選項後必須立即看見正誤、官方答案及解析，不得自動跳題。
- 在「未作答」與「曾答錯」篩選作答後，原題須保留到使用者按上一題／下一題或主動切換篩選。
- 手機版上一題／下一題固定在畫面下方，並預留安全區域。
- 任何篩選都不可竄改作答紀錄；「未作答」與「曾答錯」只決定顯示集合。
- localStorage key 或 `ProgressData.version` 有變動時，必須寫向下相容的遷移，並測試舊資料不會產生幽靈錯題或整批消失。
- 題目 ID 是進度資料的外鍵。若真的必須改 ID，需同時提供舊 ID 到新 ID 的遷移。
- 匯出／匯入格式有變動時，更新解析驗證、版本號、README 與本文件。

## 9. 哪些文件必須同步更新

| 變更類型 | 必須更新 |
| --- | --- |
| 產品定位、功能、收錄年度或題數 | `README.md` |
| 架構、資料格式、開發或部署流程 | `CONTRIBUTING.md` |
| 新增或更正正式題目 | 題庫 JSON 內的官方來源欄位、測試、PR 核對說明 |
| 新增或更正解析 | 逐年解析 JSON、相關法條、信心標記、PR 核對說明 |
| localStorage 格式 | `progress-store.ts` 的版本與遷移、測試、README／本文件相關段落 |
| 重要架構決策或動態化 | 在 `docs/decisions/` 新增 `YYYY-MM-DD-主題.md`，並連回 PR |
| 部署流程或 Node 版本 | workflow、`package.json`、README 與本文件 |

重要架構決策文件格式：

```markdown
# 決策標題

- 日期：YYYY-MM-DD
- 狀態：提議／採用／取代
- 關聯 PR：#123

## 背景
為什麼需要做決定，以及現有限制。

## 決策
採用什麼方案，資料與介面邊界是什麼。

## 替代方案
考慮過哪些方案，為何未採用。

## 影響與遷移
相容性、風險、回滾及後續工作。
```

程式碼註解只解釋「為什麼」與不直覺的相容性限制，不要逐行翻譯程式。所有文件使用繁體中文、UTF-8、清楚標題與可執行指令；路徑、欄位、指令以反引號標示。

## 10. 測試與完成條件

提交前依序執行：

```bash
npm run lint
npm test
```

`npm test` 會先建立 `out/`，再驗證靜態 HTML、題庫數量、解析覆蓋率與重要行為；`npm run test:e2e` 以 Playwright 對 `out/` 執行瀏覽器互動測試（需先跑過 `npm run build:pages`）。測試以實際部署產物為準。

另外模擬 GitHub Pages 的正式 base path 建置：

PowerShell：

```powershell
$env:GITHUB_ACTIONS = "true"
npm run build:pages
```

Bash：

```bash
GITHUB_ACTIONS=true npm run build:pages
```

題庫或解析變更時，測試至少要驗證：

- 各年度題數、總選擇題數與總申論題數。
- ID 唯一且來源網址為考選部。
- 官方答案與一律給分清單。
- 每一題選擇題都有 `issue`、`rule`、`application`、`trap` 與至少一個 `articles`。
- 法條索引可解析需要的條號。

互動變更還要人工確認桌面與手機：作答揭示、未作答不跳題、錯題本、上一題／下一題、篩選、重新整理後進度、匯出與匯入。若修正特定 bug，必須新增可防止同一問題復發的自動測試。

完成的定義：程式、資料、測試與文件同步；本機檢查通過；PR 說明列出來源與人工核對結果；審查者可以只依 repo 內容重現建置與理解決策。

## 11. Pull Request 格式

建立 PR 時使用 `.github/pull_request_template.md`，至少包含：

- 變更內容與影響頁面／資料。
- 題目、答案、法條或解析的來源與人工核對方式。
- 已執行的測試。
- localStorage、API、設定、資料格式或部署是否有相容性影響。
- 手動驗證結果與必要截圖。
- 回滾方式。

不要只寫「修 bug」或「新增題目」。審查者必須能從 PR 判斷改了什麼、為何正確、如何驗證。

## 12. GitHub Pages 部署

正式網址：<https://oliviaiii1224.github.io/civil-law-quiz-tw/>

部署設定：

- GitHub Repository Settings > Pages 的來源應為 **GitHub Actions**。
- 合併或推送至 `main` 會觸發 `.github/workflows/deploy-pages.yml`。
- workflow 使用 Node.js 22、`npm ci`、`npm run build:pages`，上傳 `out/` 後部署。
- `next.config.ts` 在 GitHub Actions 中設定 `/civil-law-quiz-tw` 的 `basePath` 與 `assetPrefix`。新增圖片或連結時不可假設網站永遠位於網域根目錄。

部署步驟：

1. 確認第 10 節所有檢查通過。
2. 合併 PR 到 `main`。
3. 到 GitHub Actions 查看「部署 GitHub Pages」的 `build` 與 `deploy` 是否成功。
4. 開啟正式網址，確認首頁載入、靜態資源正常，並實際作答一題。
5. 若瀏覽器仍顯示舊內容，先強制重新整理，再確認 Actions 使用的 commit SHA。

也可在 Actions 頁面以 `workflow_dispatch` 手動重跑部署，但手動重跑不會替代尚未合併的程式碼。

部署失敗時先查看失敗步驟，修正後以新 commit 重跑。已上線版本有嚴重問題時，使用 `git revert <commit>` 建立可追蹤的反向提交並推送 `main`；不要用 `git reset --hard` 改寫共享歷史。

## 13. 未來動態化的邊界

若升級為 Supabase 或其他後端：

- 保留 `Question` 與 `ProgressData` 的核心概念，新增 repository／service 介面隔離遠端實作。
- 先設計 localStorage 到帳號資料的合併與衝突策略，不能讓使用者登入後遺失既有進度。
- API key、服務角色金鑰與 LLM 金鑰不得放在前端或提交 Git。
- AI 即時解析必須經後端呼叫，並清楚區分官方答案、本站固定解析與 AI 回答。
- 資料庫 migration、權限政策、環境變數、備份與回滾方式必須有決策文件及部署說明。
- 動態化前先維持靜態模式可用，採漸進替換而不是一次重寫。

## 14. 交接給下一位協作者

工作未完成或準備交接時，請在 PR、Issue 或任務留言留下：

```markdown
## 目標
這次要解決什麼，主要使用情境是什麼。

## 已完成
- 已修改的檔案與可見結果。

## 尚未完成
- 明確列出下一步，不寫模糊的「再優化」。

## 重要決策
- 為何採用目前方法，以及不能破壞的相容性。

## 資料與來源
- 考選部題目／答案網址、法條版本及其他核對依據。

## 驗證結果
- 已執行的指令、通過／失敗項目、手動測試範圍。

## 部署狀態
- 分支、commit SHA、Actions 結果、正式網址或尚未部署原因。

## 風險
- 仍需人工複核的題目、舊法、資料遷移或已知限制。
```

下一位協作者應能靠 README、本文件、PR 與程式碼重現完整做法，不應依賴只有前一位開發者知道的口頭資訊。
