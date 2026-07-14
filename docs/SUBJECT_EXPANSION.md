# 法院書記官題庫科目擴充共同規格

本文件記錄所有科目共同遵守的資料來源、資料模型、內容品質、測試及協作邊界。單一科目的年度範圍、特殊解析方式與完成條件放在對應 GitHub Issue，不在各票重複貼整套共同規則。

## 1. 本階段範圍

| 科目模組 | 官方試卷 | 狀態 |
| --- | --- | --- |
| 民法 | 民法概要 | 已上線 |
| 刑法 | 刑法概要 | 已上線（105–114 年） |
| 憲法 | 法學知識與英文中的中華民國憲法部分 | 已上線 |
| 法學緒論 | 法學知識與英文中的法學緒論部分 | 已上線 |
| 英文 | 法學知識與英文中的英文部分 | 已上線 |

這五個模組是目前產品規劃，不應宣稱為法院書記官「完整全部考科」。依考選部官方科目表與考畢試題頁面，法院書記官另有國文、行政法概要、民事訴訟法概要與刑事訴訟法概要等科目。未經產品決策，不要自行開發或在前台宣稱已涵蓋這些科目。

應試科目可能修正；每次新增最新年度前，先查看：

- [考選部公務人員考試法規](https://wwwc.moex.gov.tw/mAIn/ExamLaws/wfrmExamLaws.aspx?kind=2&menu_id=319)
- [考選部考畢試題查詢平臺](https://wwwq.moex.gov.tw/)
- [114 年司法人員考試考畢試題頁面](https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx?e=114120&y=2025)（結構範例，不可取代當年度核對）

## 2. 官方資料的唯一優先順序

題目、答案與科目資訊以考選部為準：

1. `Q`：官方試題 PDF。
2. `S`：官方測驗題標準答案。
3. `M`：官方更正答案；存在時優先於 `S`。
4. 考選部當年度考試公告、應考須知與科目表。

AI、補習班、題庫網站、教科書或搜尋結果都不能改寫官方答案。第三方內容只能用來理解爭點，解析必須自行撰寫，且不得貼入或近似重製其詳解。

每筆正式題目必須保存：

- 考試名稱、等別、類科、民國年與西元年。
- 官方試卷名稱、官方題號與穩定 ID。
- `sourceUrl`、`answerUrl`、`answerSource`。
- 原始試卷中的題型、題幹、選項、配分或一律給分狀態。
- 命題時適用法版本及人工複核狀態。

## 3. 共用試卷不得重複匯入

憲法、法學緒論與英文不是三份官方試卷，而是同一份「法學知識與英文（包括中華民國憲法、法學緒論、英文）」測驗卷。

考選部規則所列占分比重為：

- 中華民國憲法：30%。
- 法學緒論：30%。
- 英文：40%。

114 年官方試卷共 50 題，實際分段為：

- 第 1–15 題：憲法。
- 第 16–30 題：法學緒論。
- 第 31–50 題：英文。

每一年度仍須讀取該年封面與題號，不可只因上述比例就永久硬編號。114 年該科另有 `M` 更正答案，匯入時必須覆蓋原 `S` 答案。

資料設計採「一份原始試卷、一組答案、三個邏輯科目」：

```text
combined-paper record
  paper = legal-knowledge-and-english
  officialQuestionNumber = 1..50
  subject = constitution | legal-introduction | english
```

不得為三張 Issue 各自下載並建立三份重複題目。先合併的實作應提供共用 importer／manifest；後續科目沿用。若多人平行開發，先在 Issue 留言協調由哪一張 PR 建立共用層。

114 年官方範例：

- [法學知識與英文試題 PDF](https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=114120&c=201&s=0204&q=1)
- [法學知識與英文標準答案](https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=S&code=114120&c=201&s=0204&q=1)
- [法學知識與英文更正答案](https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=M&code=114120&c=201&s=0204&q=1)

## 4. 多科資料模型

擴充時不要繼續增加硬編碼的 `Corpus` 字串。題目至少要能區分：

```ts
type Subject =
  | "civil-law"
  | "criminal-law"
  | "constitution"
  | "legal-introduction"
  | "english";

type Paper =
  | "civil-law-summary"
  | "criminal-law-summary"
  | "legal-knowledge-and-english";
```

實際欄位命名可由實作者依現有 `Question` 型別調整，但必須滿足：

- `subject` 是使用者篩選與進度統計的科目。
- `paper` 是官方原始試卷，避免共用試卷重複保存。
- 題目 ID 跨科、跨年唯一且上線後不可任意改名。
- 既有民法 ID 與 localStorage 進度完全相容。
- 來源類科與試卷適用範圍保留，不因前台只顯示法院書記官就刪除。

建議新 ID：

```text
judicial-fourth-{year}-criminal-law-{format}-{number}
judicial-fourth-{year}-legal-knowledge-{official-number}
```

共用試卷的官方題號不可因拆成三個科目而重新從 1 編號；英文第一題仍保留官方第 31 題，畫面可另外顯示科目內序號。

第一個非民法科目上線前，前台品牌、主標題、metadata 與篩選名稱必須改為不只代表民法的中性名稱。`civil-law-quiz-tw` repo 名稱與現有 Pages 網址若要更名，須另做網址轉址與部署遷移決策；不得在單一科目 PR 中直接更名造成既有連結失效。localStorage key 即使保留歷史名稱也可接受，除非同時提供完整資料遷移。

## 5. 解析不能強迫共用同一格式

法律科可延續：

- 題目在問什麼／爭點。
- 法律規則。
- 套入本題。
- 結論與官方答案。
- 常見誤區。
- 相關法條、憲法解釋、憲法法庭裁判或法院裁判。

英文改用：

- 考點（單字、文法、語意、篇章理解）。
- 正確答案理由。
- 關鍵句或文法結構。
- 干擾選項為何不合。
- 每題提供繁體中文題意；四個選項均顯示繁中意思與詞性／片語類型。
- 題組提供共用文章繁中翻譯，並保留英文原文供定位。

因此解析資料應有共用外層與依科目區分的內容型別，不要為了沿用民法 UI，硬把英文塞進「法條／涵攝」。

法學緒論常跨民法、刑法、勞動法、地方制度法、中央法規標準法、智慧財產權及法理學。引用資料應改為通用 `references`，至少可表達：

```ts
type Reference = {
  type: "statute" | "constitutional-decision" | "court-decision" | "official-material";
  title: string;
  locator?: string;
  url: string;
  text?: string;
};
```

## 6. 各科官方核對來源

### 刑法

- [中華民國刑法（全國法規資料庫）](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=C0000001)
- [司法院裁判書查詢](https://judgment.judicial.gov.tw/FJUD/default.aspx)
- [114 年刑法概要試題](https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=114120&c=201&s=0504&q=1)
- [114 年刑法概要標準答案](https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=S&code=114120&c=201&s=0504&q=1)

注意總則與分則要件、主觀要件、違法性、罪責、未遂／正犯共犯、競合、追訴權時效、沒收與修法時間。刑法概要各年度題型與科目代碼可能不同，不能照抄民法 manifest 或假設永遠使用 `s=0504`。

### 憲法

- [中華民國憲法（全國法規資料庫）](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001)
- [中華民國憲法增修條文（全國法規資料庫）](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000002)
- [司法院憲法法庭](https://cons.judicial.gov.tw/)

區分憲法本文、增修條文、舊制司法院解釋與憲法法庭裁判，保存解釋號或裁判字號及日期。不要只引用補習班整理的結論。

### 法學緒論

- [全國法規資料庫](https://law.moj.gov.tw/)
- [司法院裁判書查詢](https://judgment.judicial.gov.tw/FJUD/default.aspx)
- [司法院憲法法庭](https://cons.judicial.gov.tw/)

先判斷題目屬哪一部法、法理或制度，再找原始依據。若純法理題沒有單一法條，使用具體官方材料或可靠教科書理解後自行撰寫，不得硬塞不相干法條，也不得只附搜尋首頁。

### 英文

題目與答案以考選部共用試卷為準。單字、文法與閱讀解析可查可靠字典或文法資料，但不得複製其例句、定義或第三方逐題解析。英文長文可能含改寫素材；保留官方試題必要文字即可，不額外搬運來源全文。`english-translations.json` 是方便學習的繁中輔助層，不是考選部官方翻譯；更新題庫後須重新執行 `scripts/import-english-translations.py`，並人工抽查詞義、詞性與上下文。

## 7. 跨科完成條件

每個新科目 PR 都必須：

- 收錄 Issue 指定年度的全部官方題目，不以示範題充數。
- 對照 `S`／`M` 核對每一題答案並保留官方連結。
- 保持民法既有進度、錯題本、匯出入資料可用。
- 支援科目篩選、未作答、曾答錯、年度與題型篩選。
- 作答後停留顯示正誤與解析，不自動跳題。
- 測試各年度題數、官方題號連續性、ID 唯一、答案範圍、更正答案及解析覆蓋率。
- 更新 README 的已上線／規劃中狀態及實際題數。
- 在 PR 說明列出官方查詢頁、試題、答案、更正答案與人工抽查結果。

## 8. Issue 與專案文件的分工

放在本文件或 `CONTRIBUTING.md`：

- 所有科目都必須遵守的來源優先順序、著作權、資料模型、進度相容、測試、部署與 PR 規則。
- 共用試卷的拆分方法與不得重複匯入原則。
- 未來改動後仍需長期遵守的架構決策。

放在單一 Issue：

- 該科的年度範圍、題型、特殊資料來源及易錯點。
- 該科需要新增或修改的檔案與 UI。
- 可勾選的驗收條件、依賴票、尚待人工確認事項。
- 只在這次工作中需要的調查紀錄。

Issue 若發現新的跨科長期規則，實作 PR 必須回寫本文件，不能只留在已關閉 Issue 中。
