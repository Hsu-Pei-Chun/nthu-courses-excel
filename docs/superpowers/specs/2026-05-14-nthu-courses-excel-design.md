# 清大課程 JSON → Excel 下載按鈕（純前端）

- 日期：2026-05-14
- 狀態：Design approved，待 user review 後進入 writing-plans

## 目標

在一個網頁上提供一顆按鈕，點下去後：
1. 從清大開放資料 URL 抓 JSON
2. 在瀏覽器端清理欄位
3. 直接轉成 `.xlsx` 並觸發下載

整個流程**不需要後端**，純 HTML + JavaScript + CSS（透過 CDN 載入 SheetJS、透過公開 CORS proxy 繞過 CORS）。

## 背景與限制

### 資料來源

- URL：`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json`
- 格式：JSON array，每個元素是一筆課程，共 19 個欄位（中文 key）
- 筆數：2896 筆（以本地下載樣本為準，實際數量會隨學期變動）
- 大小：約 3.2 MB
- Content-Type：`text/plain`（不影響 `response.json()` 解析）

### 欄位清單（19 個，順序固定）

1. 科號
2. 課程中文名稱
3. 課程英文名稱
4. 學分數
5. 人限
6. 新生保留人數
7. 通識對象
8. 通識類別
9. 授課語言
10. 備註
11. 停開註記
12. 教室與上課時間
13. 授課教師
14. 擋修說明
15. 課程限制說明
16. 第一二專長對應
17. 學分學程對應
18. 不可加簽說明
19. 必選修說明

（順序以 JSON 首筆物件的 key 順序為準。）

### 關鍵限制：CORS

透過 `curl -H "Origin: ..."` 驗證過，清大 server 的 response 不含 `Access-Control-Allow-Origin`，所以瀏覽器無法直接 `fetch()` 此 URL。必須透過公開 CORS proxy 繞過。

### User 限制

- 只能用純 HTML / JS / CSS，**不能用後端**
- 欄位處理偏好：**保留全部 18 欄 + 清理換行/空白**

## 架構

單一 `index.html` 檔案，內含：

```
┌─────────────────────────────────────────┐
│  index.html                              │
│  ├─ <head>: <script src="SheetJS CDN">  │
│  ├─ <body>: <button> + <div id=status>  │
│  └─ <script>: 三個函式                   │
│      ├─ fetchCourseData()                │
│      ├─ cleanRecord(record)              │
│      └─ downloadAsExcel(records)         │
└─────────────────────────────────────────┘
```

### 資料流

```
[使用者點按鈕]
   │
   ├─ 按鈕 disable、status 顯示「抓取中…」
   ▼
fetch('https://corsproxy.io/?url=' + encodeURIComponent(NTHU_URL))
   │
   ▼
response.json()  →  Array<Record>
   │
   ▼
records.map(cleanRecord)  →  Array<CleanRecord>
   │
   ▼
XLSX.utils.json_to_sheet(cleaned) → worksheet
XLSX.utils.book_new() → workbook
XLSX.utils.book_append_sheet(wb, ws, '課程資料')
XLSX.writeFile(wb, '清大課程_20260514.xlsx')
   │
   ▼
[瀏覽器自動觸發下載]
status 顯示「已下載」，按鈕重新 enable
```

## 元件細節

### 1. HTML 結構

```html
<button id="downloadBtn">下載清大課程 Excel</button>
<div id="status" aria-live="polite"></div>
```

- `aria-live="polite"`：讓螢幕閱讀器自動播報狀態變化
- 不需要 form，純按鈕觸發 JS

### 2. CSS

最小化樣式即可（用 user 既有頁面的樣式或一個基本的 button look）：
- 按鈕 disable 時 cursor: not-allowed + 半透明
- status 文字依狀態變色：載入中（灰）、成功（綠）、錯誤（紅）

### 3. 依賴（兩個 CDN）

```html
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
```

註：原本選 `cdn.sheetjs.com/xlsx-latest`，但實測在 playwright/chromium 環境下 minified bundle 會丟 `Invalid regular expression flags` 導致 XLSX 無法定義；改用 jsdelivr 鎖版本 0.18.5 後穩定。

CORS proxy（在 JS 裡硬編碼）：
- 主用：`https://api.codetabs.com/v1/proxy/?quest=`
- 不做 fallback；主 proxy 掛掉就回報錯誤讓 user 稍後再試
- 註：原本選擇 `corsproxy.io`，但實測對未註冊 origin（含本地 `file://`）直接回 403；改用 codetabs（已驗證能拿到完整 3.2 MB 內容、CORS header 正確、無註冊要求）

### 4. 欄位清理規則（`cleanRecord` 函式）

對每筆 record 的每個 string 欄位套用：

| 步驟 | 處理 |
|---|---|
| 1 | 結尾的連續 `\n` 移除（`.replace(/\n+$/, '')`） |
| 2 | 中間的 `\n` 替換成 ` / `（`.replace(/\n/g, ' / ')`） |
| 3 | `\t` 替換成單一空格（`.replace(/\t/g, ' ')`） |
| 4 | 連續多空白縮為單一空格（`.replace(/ {2,}/g, ' ')`） |
| 5 | 頭尾 trim |

非字串值（理論上不會出現，但保險起見）原樣保留。

### 5. Excel 輸出細節

- **Sheet 名**：`課程資料`
- **第一列**：19 個中文欄位名（由 `XLSX.utils.json_to_sheet` 自動從第一筆 record 的 keys 推出）
- **欄寬**：透過 `worksheet['!cols']` 設定，每欄寬度 = `Math.min(50, max(欄名長度, 該欄所有值的最大字數) + 2)`
- **檔名**：`清大課程_YYYYMMDD.xlsx`，YYYYMMDD 用當天日期（`new Date()`）

### 6. 狀態機

按鈕 + status 的狀態：

| 狀態 | 按鈕 | status 文字 | status 顏色 | spinner |
|---|---|---|---|---|
| idle | enable | 空 | – | – |
| loading (下載階段) | disable | 下載資料中… | 灰 | 旋轉 |
| loading (整理階段) | disable | 整理欄位中… | 灰 | 旋轉 |
| loading (產生階段) | disable | 產生 Excel 中… | 灰 | 旋轉 |
| success | enable | 已下載 清大課程_YYYYMMDD.xlsx | 綠 | – |
| error | enable | 下載失敗：{錯誤訊息}，請稍後再試 | 紅 | – |

進度提醒做法：純 CSS spinner（`#status.loading::before` + `@keyframes spin`），在 status 文字前顯示一個旋轉圈圈，配合三段階段訊息。因為 codetabs proxy 是 chunked transfer encoding、不給 `Content-Length`，所以**不做精確百分比進度**，只用「階段訊息 + spinner」表達「正在動」與「目前階段」。階段切換之間 `await new Promise(r => setTimeout(r, 0))` 讓瀏覽器 repaint。

下次點按鈕時 status 清空回到 loading。

### 7. 錯誤處理

只區分三類，全部走 `error` 狀態：

1. **網路/proxy 失敗**（fetch reject 或 response.status !== 200）
   - 訊息：「下載失敗：無法連線到資料來源，請稍後再試」
2. **JSON parse 失敗**（response.json() throw）
   - 訊息：「下載失敗：資料格式異常」
3. **其他例外**（catch-all）
   - 訊息：「下載失敗：{error.message}」

- **不做自動重試**
- **不切換備援 proxy**
- 所有錯誤 `console.error()` 一份方便除錯

## 測試計畫

純前端、依賴外部服務（CORS proxy + 清大 server），單元測試 ROI 低。改成**手動驗收 checklist**：

1. 開啟 `index.html`，畫面看到按鈕 + 空白 status
2. 點按鈕，status 立刻變「下載資料中…」+ 旋轉 spinner、按鈕 disable
3. 約幾秒後階段切到「整理欄位中…」→「產生 Excel 中…」（spinner 持續旋轉），最後瀏覽器自動下載 `.xlsx`，status 變「已下載 …」（spinner 消失、變綠色）
4. 打開下載的 .xlsx，確認：
   - 第一列是 19 個中文欄位名
   - 有數百到數千列資料（清大每學期約幾千堂課）
   - 「教室與上課時間」、「授課教師」等欄位的 `\t` 已換空格、`\n` 已換 ` / ` 或被 trim
   - 欄寬不會擠成一團、也不會超過 50 字寬
5. 中斷網路再點按鈕，確認 status 顯示紅色「無法連線…」、按鈕重新 enable
6. （可選）在 Chrome / Firefox / Safari 各跑一次

## 不做的事（YAGNI）

- 精確百分比進度條（codetabs 是 chunked transfer，沒給 Content-Length 算不出來；改用階段訊息 + spinner 取代，見第 6 節）
- 欄位篩選 / 搜尋 / 排序
- 結果預覽（直接下載）
- 快取 / localStorage（每次抓最新）
- 多個 CORS proxy fallback
- 學期參數化（清大這個 URL 固定回傳最新學期，無 query param）
- 國際化 / 主題切換
- 自動重試

## 風險與已知問題

| 風險 | 說明 | 緩解 |
|---|---|---|
| CORS proxy 掛掉 | corsproxy.io 是免費第三方服務，可能限速或暫時下線 | 顯示明確錯誤訊息讓 user 稍後再試；若長期不穩可後續加 fallback proxy 或建議 user 自建 |
| 清大改 URL / 格式 | 學校網站變動 | 純前端無法自動偵測；user 反饋後手動更新常數 |
| 大檔案瀏覽器轉檔慢 | 3.2 MB JSON + SheetJS 在瀏覽器轉 xlsx 可能在低階機器上卡幾秒 | 接受；若真的有問題再做 Web Worker，現在不做 |
| 第三方 proxy 看得到傳輸內容 | 清大資料本身就是公開的，沒有隱私問題 | 不處理 |

## 開放問題

無。設計已和 user 對齊。

## 下一步

進入 `superpowers:writing-plans` 產出實作計畫（單一 `index.html` 的撰寫步驟、手動驗收順序）。
