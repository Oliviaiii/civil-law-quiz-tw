# 開發與題庫匯入問題排除

本文件記錄實作多科題庫時實際遇到的環境、官方資料、GitHub 與部署問題。目的不是只留下錯誤訊息，而是讓下一位協作者可以直接辨識症狀、採用已驗證的解法，並知道哪些情況仍不能自動略過。

開始處理考選部題庫、科目擴充或 Sites 部署前，請先閱讀本文件、[CONTRIBUTING.md](../CONTRIBUTING.md) 與[科目擴充共同規格](./SUBJECT_EXPANSION.md)。

## 快速索引

| 問題 | 典型症狀 | 已驗證解法 |
| --- | --- | --- |
| 考選部科目代碼逐年不同 | 下載到 1,984 bytes 的 HTML，內容為「網址不存在」 | 從當年度查詢頁建立 manifest，不把 `s=0204` 永久硬編碼 |
| Python 3.14 拒絕考選部憑證 | `Missing Subject Key Identifier` | 保留 CA 與 hostname 驗證，只移除 `VERIFY_X509_STRICT` |
| PowerShell／Python 顯示中文亂碼 | mojibake 或 `UnicodeEncodeError: cp950` | 明確使用 UTF-8 output encoding 與 `PYTHONIOENCODING` |
| GitHub 連接器無留言權限 | REST API 回傳 403 | 改用已登入的 `gh issue comment --body-file` |
| vinext 在 Windows 建置後異常結束 | 已顯示 `Build complete`，之後出現 `UV_HANDLE_CLOSING` | 檢查 `dist/server/index.js`，再以 `npm test` 獨立驗證正式建置 |
| Sites 建立站點被限流 | HTTP 429、`2400 requests per 300 seconds` | 不改 slug，不重複建立；等待後以相同參數重試一次 |
| Sites 包裝腳本在 WSL 無法執行 | `pipefail\r: invalid option name` | 以 `sed` 移除 CR，直接執行內層 packaging helper |
| 英文共用題組切分異常 | 文章混入前題 D 選項、題幹空格消失或單字黏在一起 | 確認 layout extraction、`passageId` 與題組範圍測試；重新執行匯入器 |

## 1. 考選部 URL 與逐年科目代碼

### 症狀

HTTP request 看似成功，但檔案只有約 1,984 bytes，檔頭是 UTF-8 BOM 加 `<!DOCTYPE html>`，內容為「您所輸入的網址並不存在」，並非 PDF。

不要只看 HTTP status 或副檔名。下載後至少檢查檔案開頭是否為 `%PDF`。

### 原因

「法學知識與英文」在法院書記官類科的 `code` 與 `s` 參數會隨年度改變。114 年範例的 `s=0204` 不能套用到所有年度。

本次從各年度考選部查詢頁核對出的 manifest：

| 民國年 | `code` | `c` | `s` |
| --- | --- | --- | --- |
| 105 | `105120` | `201` | `0408` |
| 106 | `106130` | `201` | `0416` |
| 107 | `107130` | `201` | `0415` |
| 108 | `108130` | `201` | `0223` |
| 109 | `109130` | `201` | `0413` |
| 110 | `110130` | `201` | `0206` |
| 111 | `111130` | `201` | `0206` |
| 112 | `112130` | `201` | `0206` |
| 113 | `113120` | `201` | `0204` |
| 114 | `114120` | `201` | `0204` |

manifest 已集中在 `scripts/import-moex-legal-knowledge.py`。新增年度時，應從當年度「法院書記官」區塊讀取實際連結，再增加 manifest；不要依前一年推測。

### 另一個 PowerShell 陷阱

PowerShell hashtable 的 key 型別必須一致。若宣告的是整數 key，卻用字串索引，可能得到 `$null`，最後產生缺少 `code` 的 URL。建議年度迴圈全程使用整數：

```powershell
$manifest = @{ 114 = @('114120', '0204') }
$item = $manifest[114]
```

### 驗證

```powershell
$env:PYTHONIOENCODING = 'utf-8'
python scripts/import-moex-legal-knowledge.py --download
```

匯入器會拒絕非 `%PDF` 回應，並驗證 500 個 ID、每年 50 題、官方題號 1–50，以及憲法／法學緒論／英文的 15／15／20 分段。

## 2. Python 3.14 與考選部 TLS 憑證

### 症狀

```text
ssl.SSLCertVerificationError: certificate verify failed:
Missing Subject Key Identifier
```

PowerShell `Invoke-WebRequest` 可以下載，但 Python 3.14 的 `urllib.request.urlopen` 拒絕連線。

### 原因

新版 Python／OpenSSL 預設啟用更嚴格的 X.509 驗證。考選部憑證鏈缺少舊式 Subject Key Identifier，會被 strict verification 擋下。

### 解法

保留 CA chain 與 hostname 驗證，只清掉新版額外的 strict flag：

```python
ssl_context = ssl.create_default_context()
if hasattr(ssl, "VERIFY_X509_STRICT"):
    ssl_context.verify_flags &= ~ssl.VERIFY_X509_STRICT

urllib.request.urlopen(request, context=ssl_context)
```

不要改成 `ssl._create_unverified_context()`，也不要關閉 hostname 驗證；那會把真正的中間人攻擊或錯誤憑證一起放行。

## 3. Q／S／M 與複數可接受答案

考選部資料優先序固定為：

1. `Q`：試題。
2. `S`：標準答案。
3. `M`：更正答案，存在時覆蓋 `S`。

114 年「法學知識與英文」第 18 題不是單一答案，也不是所有選項一律給分。官方更正為 A、B、C 任一組合均給分，因此資料模型使用：

```json
{
  "answer": 0,
  "acceptedAnswers": [0, 1, 2],
  "allCredit": false,
  "answerSource": "考選部更正答案"
}
```

前台判題必須先檢查 `acceptedAnswers`，不能只做 `selected === answer`，也不能把 `#` 一律解讀為四個選項全部給分。

## 4. PDF 文字擷取與共用題組限制

### 憲法及中文選擇題

105–114 年憲法題可從 PDF 文字層穩定取得題號、題幹與四個 private-use option markers。仍須移除跨頁產生的 `代號：`、`頁次：`，並驗證題號必須完整為 1–50。

### 英文題組的正式處理方式

共用匯入器以 `pdfplumber.extract_text(layout=True, x_density=4, x_tolerance=1, y_tolerance=3)` 讀取試卷，保留英文單字邊界；六個以上的水平空白會轉成可見的 `_____`。題組標題支援「請依下文回答……」及舊卷的「請回答下列……」格式，文章切到第一個題號之前，並以 `passageId`／`passage` 掛到範圍內每一題。

維護時不得另建第二份英文題庫。修改 `scripts/import-moex-legal-knowledge.py` 後重新產生共用 JSON，並確認：200 題英文、20 個唯一 `passageId`、98 筆題目與文章關聯、每題四個選項且單一選項少於 200 字。若官方未為克漏字另印題幹，前台顯示共用文章及「請依官方試卷的共用文章作答」提示，這是資料忠實呈現，不是漏題。

## 5. UTF-8 與 Windows 主控台

### PowerShell 顯示 Markdown 亂碼

```powershell
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
Get-Content -Raw -Encoding UTF8 docs/SUBJECT_EXPANSION.md
```

### Python 輸出私用字元或罕見中文字失敗

```powershell
$env:PYTHONIOENCODING = 'utf-8'
python scripts/import-moex-legal-knowledge.py
```

錯誤通常是 `UnicodeEncodeError: 'cp950' codec can't encode character ...`，不代表 PDF 本身損壞。

GitHub CLI 寫入中文時，優先使用 UTF-8 body file；不要把長篇中文直接塞入複雜的 shell quoting。

## 6. GitHub 連接器只有讀權限

### 症狀

GitHub issue 可以讀取，但新增留言回傳：

```text
GitHub API error 403: Resource not accessible by integration
```

這次三則協調留言都在 connector 階段完整失敗，沒有產生部分寫入。

### 解法

先確認本機 `gh` 已登入，再用 UTF-8 body file 寫入：

```powershell
gh auth status
gh issue comment 2 --repo Oliviaiii/civil-law-quiz-tw --body-file .temp/comment.md
```

寫入後應保存 CLI 回傳的 issue comment URL，並刪除只為本次操作建立的暫存 body file。若 `gh auth status` 也失敗，停止寫入並回報權限問題，不要重複轟炸 connector。

## 7. vinext 在 Windows 建置完成後的 libuv assertion

### 症狀

vinext 五個 build 階段、prerender 與 route summary 都成功，並明確顯示：

```text
Build complete. Run `vinext start` to start the production server.
```

程序收尾時才出現：

```text
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING),
file src\win\async.c, line 76
```

PowerShell 看到的 native exit code 可能是 `-1073740791`。

### 判斷與解法

只有在完整 build 已成功且 `dist/server/index.js` 存在時，才能把它視為 Windows 收尾問題：

```powershell
npm run build
$buildCode = $LASTEXITCODE

if ($buildCode -ne 0 -and -not (Test-Path 'dist/server/index.js')) {
  exit $buildCode
}
```

接著仍要跑獨立的正式 Next.js 建置與測試：

```powershell
npm test
npm run lint
```

若錯誤發生在 transform、TypeScript、prerender 之前，或 `dist/server/index.js` 不存在，不能套用此例外，必須當作真正的 build failure 修正。

## 8. Sites 限流、包裝與安全推送

### `create_site` 暫時限流

可能收到：

```text
More than 2400 requests per 300 seconds reached
HTTP 429
```

這是暫時性錯誤。不要改 slug 或呼叫多次 `create_site` 製造重複專案；等待後以相同 title、slug、description 重試一次。成功後立即把原樣的 `project_id` 寫入 `.openai/hosting.json`。

### WSL 執行 packaging helper 的 CRLF 問題

Windows cache 中的 shell script 可能是 CRLF，直接執行會得到：

```text
set: pipefail\r: invalid option name
```

根層 wrapper 又依賴 `BASH_SOURCE[0]`，因此不能單純把 wrapper pipe 給 bash。應對內層 helper 做換行正規化：

```powershell
bash -lc "sed 's/\r$//' /mnt/c/Users/<user>/.codex/plugins/cache/openai-bundled/sites/<version>/skills/sites-hosting/scripts/package-site.sh | bash -s -- /mnt/c/project/civil-law-quiz-tw /mnt/c/project/civil-law-quiz-tw/.temp/site-version.tar.gz"
```

版本目錄需以實際安裝位置為準，不可硬編碼本文範例。

### 推送憑證

Sites 的 source credential 只能放在單次 command 的環境變數或 `http.extraHeader`，不可：

- 寫入 Git remote URL。
- 寫入 `.git/config`。
- 寫入文件、log、commit 或終端輸出。
- 在憑證過期後重複使用。

推送、儲存版本與部署完成後，刪除 `.temp/site-version.tar.gz` 等暫存包。

## 9. 建議的重現與驗證順序

```powershell
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$env:PYTHONIOENCODING = 'utf-8'

# 需要更新官方資料時才加 --download
python scripts/import-moex-legal-knowledge.py --download

npm test
npm run lint
git diff --check
git status --short --branch
```

完成前再人工確認：

- 下載檔確實為 PDF，不是錯誤 HTML。
- 各年度官方題號、分段與答案來源正確。
- `M` 的複數答案／一律給分語意沒有被混同。
- 新題 ID 不碰既有民法 ID。
- `civil-law-quiz-tw:progress:v2` 與舊進度匯出入仍可使用。
- `.temp`、`__pycache__`、PDF 與部署 archive 沒有被加入 Git。
- 英文 200 題、20 組文章與 98 筆題組關聯均通過資料稽核。

## 10. 何時更新本文件

遇到下列情形時，修正程式後也要同步補充本文件：

- 考選部改 URL、PDF 或答案格式。
- 新版 Python、Node、vinext、Next.js 或 Windows 出現新的相容性問題。
- GitHub connector／CLI 的權限流程改變。
- Sites packaging 或部署命令改變。
- 英文 passage／空格還原邏輯異動。

記錄至少要包含：完整症狀、原因、採用的解法、為何沒有採用較危險的替代方案，以及可重現的驗證指令。
