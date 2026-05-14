# 清大課程 JSON → Excel 下載按鈕 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一個純前端網頁，按下按鈕後從清大開放資料 URL 抓 JSON、清理欄位、轉成 .xlsx 自動下載。

**Architecture:** 單一 `index.html` 載入 SheetJS CDN 與 `app.js`；用公開 CORS proxy (`corsproxy.io`) 繞過清大 server 沒給的 `Access-Control-Allow-Origin`；核心轉檔邏輯在瀏覽器端跑。

**Tech Stack:** HTML / CSS / Vanilla JavaScript（ES2020+，無 build tool、無 framework）、SheetJS (xlsx) via CDN、corsproxy.io。

**Spec：** `docs/superpowers/specs/2026-05-14-nthu-courses-excel-design.md`

---

## File Structure

| 檔案 | 責任 |
|---|---|
| `app.js` | 純 JS 邏輯：`cleanRecord`、`fetchCourseData`、`downloadAsExcel`、`bindButton`、`setStatus` |
| `index.html` | UI：載入 SheetJS CDN + `app.js`，呼叫 `bindButton` |
| `styles.css` | 最小樣式（按鈕 disabled / status 顏色） |
| `test.html` | 載入 `app.js` 跑 `cleanRecord` 的 console.assert 測試 |

所有檔案放在專案根目錄 `/home/username/桌面/nthu-courses-excel/`。

> Spec 的「## 架構」段描述「單一 `index.html` 檔案」，這裡刻意拆成 4 檔，是為了讓純函式 `cleanRecord` 能被 `test.html` 重用（避免測試碼和正式碼重複維護）。最終要嵌入 user 既有後台頁面時，可把 `app.js` 和 `styles.css` 內容摺回 `<script>` / `<style>` 變成單一 snippet。

---

### Task 1: 建立檔案骨架

**Files:**
- Create: `app.js`
- Create: `index.html`
- Create: `styles.css`
- Create: `test.html`

- [ ] **Step 1: 建立 `app.js` 骨架**

寫入 `app.js`：

```javascript
'use strict';

const NTHU_URL = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json';
const CORS_PROXY = 'https://corsproxy.io/?url=';

// 後續 task 會在這裡實作四個函式：
// cleanRecord(record) -> Object
// fetchCourseData() -> Promise<Array>
// downloadAsExcel(records) -> void
// bindButton() -> void
```

- [ ] **Step 2: 建立 `index.html` 骨架**

寫入 `index.html`：

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>清大課程匯出</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main>
    <h1>清大開放課程資料匯出</h1>
    <button id="downloadBtn" type="button">下載清大課程 Excel</button>
    <div id="status" aria-live="polite"></div>
  </main>
  <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
  <script src="app.js"></script>
  <script>
    bindButton();
  </script>
</body>
</html>
```

- [ ] **Step 3: 建立 `styles.css` 骨架**

寫入 `styles.css`：

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
  max-width: 640px;
  margin: 2rem auto;
  padding: 0 1rem;
  color: #222;
}

button {
  font-size: 1rem;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

#status {
  margin-top: 1rem;
  min-height: 1.5em;
  font-size: 0.95rem;
}

#status.loading { color: #666; }
#status.success { color: #1a7f37; }
#status.error   { color: #c0322b; }
```

- [ ] **Step 4: 建立 `test.html` 骨架**

寫入 `test.html`：

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>cleanRecord 測試</title>
</head>
<body>
  <h1>cleanRecord 測試</h1>
  <p>請打開瀏覽器 DevTools Console 查看結果。</p>
  <pre id="output"></pre>
  <script src="app.js"></script>
  <script>
    // 後續 task 在這裡寫 assertion
  </script>
</body>
</html>
```

- [ ] **Step 5: Commit**

```bash
cd "/home/username/桌面/nthu-courses-excel"
git add app.js index.html styles.css test.html
git commit -m "scaffold: 建立純前端專案四個檔案骨架"
```

---

### Task 2: TDD - 寫 cleanRecord 失敗測試

**Files:**
- Modify: `test.html`

- [ ] **Step 1: 在 `test.html` 寫測試 cases（覆蓋 5 條清理規則 + 邊界）**

把 `test.html` 裡 `// 後續 task 在這裡寫 assertion` 那行整個 `<script>` 替換成：

```html
  <script>
    function eq(actual, expected, label) {
      const pass = actual === expected;
      const line = `${pass ? '✅' : '❌'} ${label}\n   actual:   ${JSON.stringify(actual)}\n   expected: ${JSON.stringify(expected)}`;
      console.log(line);
      document.getElementById('output').textContent += line + '\n';
      if (!pass) console.error('FAIL:', label);
    }

    function run() {
      // 結尾換行
      const r1 = cleanRecord({ a: 'abc\n' });
      eq(r1.a, 'abc', '結尾單個 \\n 移除');

      const r2 = cleanRecord({ a: 'abc\n\n' });
      eq(r2.a, 'abc', '結尾多個 \\n 移除');

      // 中間換行
      const r3 = cleanRecord({ a: 'abc\ndef' });
      eq(r3.a, 'abc / def', '中間 \\n 替換成 / ');

      // \t 替換
      const r4 = cleanRecord({ a: 'abc\tdef' });
      eq(r4.a, 'abc def', '\\t 替換成空格');

      // 真實樣本：授課教師
      const r5 = cleanRecord({ a: '吳劍侯\tWU, CHIEN-HOU\n' });
      eq(r5.a, '吳劍侯 WU, CHIEN-HOU', '教師欄位混合清理');

      // 真實樣本：教室與上課時間
      const r6 = cleanRecord({ a: 'BMES醫環717\tR7R8R9\n' });
      eq(r6.a, 'BMES醫環717 R7R8R9', '教室時間欄位混合清理');

      // 多空白縮減
      const r7 = cleanRecord({ a: 'a   b' });
      eq(r7.a, 'a b', '連續多空白縮為單一空格');

      // trim
      const r8 = cleanRecord({ a: '  abc  ' });
      eq(r8.a, 'abc', '頭尾 trim');

      // 空字串
      const r9 = cleanRecord({ a: '' });
      eq(r9.a, '', '空字串保留');

      // 單空格 → trim 後空
      const r10 = cleanRecord({ a: ' ' });
      eq(r10.a, '', '單一空格 trim 後變空');

      // 非字串值原樣保留（理論上不會出現，但保險）
      const r11 = cleanRecord({ a: 3 });
      eq(r11.a, 3, '非字串值原樣保留');

      // 多欄位
      const r12 = cleanRecord({ a: 'x\n', b: 'y\t z' });
      eq(r12.a, 'x', '多欄位 - 欄位 a');
      eq(r12.b, 'y z', '多欄位 - 欄位 b');
    }

    run();
  </script>
```

- [ ] **Step 2: 開啟 `test.html` 確認測試全部失敗**

在終端機跑：

```bash
xdg-open "/home/username/桌面/nthu-courses-excel/test.html"
```

打開 DevTools Console。

Expected：每條 assertion 都 ❌（因為 `cleanRecord` 還沒實作，會看到 `ReferenceError: cleanRecord is not defined` 或全部 fail）。

- [ ] **Step 3: Commit**

```bash
cd "/home/username/桌面/nthu-courses-excel"
git add test.html
git commit -m "test: 加入 cleanRecord 失敗測試（紅燈）"
```

---

### Task 3: 實作 cleanRecord 讓測試通過

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 在 `app.js` 實作 `cleanRecord`**

把 `app.js` 裡 `// cleanRecord(record) -> Object` 那行替換成：

```javascript
function cleanRecord(record) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'string') {
      out[key] = value;
      continue;
    }
    out[key] = value
      .replace(/\n+$/, '')        // 結尾連續 \n 移除
      .replace(/\n/g, ' / ')      // 中間 \n 換成 / 
      .replace(/\t/g, ' ')        // \t 換成空格
      .replace(/ {2,}/g, ' ')     // 連續多空白縮為單一空格
      .trim();                    // 頭尾 trim
  }
  return out;
}
```

- [ ] **Step 2: 重新整理 `test.html` 確認測試全部通過**

在瀏覽器頁面按 F5。

Expected：Console 與頁面 `<pre>` 都顯示 12 條 ✅ 全綠，沒有 ❌、沒有 `FAIL:` console.error。

- [ ] **Step 3: Commit**

```bash
cd "/home/username/桌面/nthu-courses-excel"
git add app.js
git commit -m "feat: 實作 cleanRecord 套用 5 條清理規則"
```

---

### Task 4: 實作 fetchCourseData

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 在 `app.js` 實作 `fetchCourseData`**

把 `app.js` 裡 `// fetchCourseData() -> Promise<Array>` 那行替換成：

```javascript
async function fetchCourseData() {
  const url = CORS_PROXY + encodeURIComponent(NTHU_URL);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('回傳資料不是陣列');
  }
  return data;
}
```

- [ ] **Step 2: 在 Console 手動驗收**

打開 `test.html`，DevTools Console 跑：

```javascript
fetchCourseData().then(d => console.log('筆數:', d.length, '首筆:', d[0]));
```

Expected：
- 過幾秒後 console 印出「筆數: 2896」（數字可能因學期而異，至少要 > 100）
- 首筆是一個含中文 key（如「科號」、「課程中文名稱」）的物件

如果失敗：
- 看 console.error 訊息
- 若是 `Failed to fetch` → corsproxy.io 暫時下線；換個時間再試或臨時換 `https://api.allorigins.win/raw?url=`
- 若是 HTTP 4xx/5xx → 清大 URL 可能變了，先 `curl -I` 驗證

- [ ] **Step 3: Commit**

```bash
cd "/home/username/桌面/nthu-courses-excel"
git add app.js
git commit -m "feat: 實作 fetchCourseData 透過 corsproxy.io 抓清大 JSON"
```

---

### Task 5: 實作 downloadAsExcel

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 在 `app.js` 實作 `downloadAsExcel`**

把 `app.js` 裡 `// downloadAsExcel(records) -> void` 那行替換成：

```javascript
function downloadAsExcel(records) {
  const cleaned = records.map(cleanRecord);
  const worksheet = XLSX.utils.json_to_sheet(cleaned);

  // 計算欄寬：每欄取（欄名長度 vs 該欄所有值最大字數）+ 2，上限 50
  const keys = Object.keys(cleaned[0] || {});
  worksheet['!cols'] = keys.map(key => {
    const maxValueLen = cleaned.reduce((max, row) => {
      const v = row[key];
      const len = v == null ? 0 : String(v).length;
      return Math.max(max, len);
    }, 0);
    const width = Math.min(50, Math.max(key.length, maxValueLen) + 2);
    return { wch: width };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '課程資料');

  const today = new Date();
  const yyyymmdd =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const filename = `清大課程_${yyyymmdd}.xlsx`;

  XLSX.writeFile(workbook, filename);
  return filename;
}
```

- [ ] **Step 2: 在 Console 手動驗收**

打開 `index.html`（不是 test.html，因為要 SheetJS CDN），開 DevTools Console 跑：

```javascript
fetchCourseData().then(downloadAsExcel).then(name => console.log('已下載', name));
```

Expected：
- 數秒後瀏覽器觸發下載一個 `清大課程_YYYYMMDD.xlsx` 檔案
- Console 印出「已下載 清大課程_YYYYMMDD.xlsx」
- 用 LibreOffice / Excel 打開確認：
  - 第一列 19 個中文欄位名
  - 多列資料（2000+）
  - 教師、教室時間欄位的 `\t` 已換空格、`\n` 已換 ` / ` 或被 trim
  - 欄寬合理（沒擠成一團）

- [ ] **Step 3: Commit**

```bash
cd "/home/username/桌面/nthu-courses-excel"
git add app.js
git commit -m "feat: 實作 downloadAsExcel 透過 SheetJS 產生 .xlsx"
```

---

### Task 6: 實作狀態機與按鈕綁定

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 在 `app.js` 實作 `setStatus` 與 `bindButton`**

把 `app.js` 裡剩下兩行註解（`// downloadAsExcel ...` 的下一行起）替換成：

```javascript
function setStatus(state, message) {
  const el = document.getElementById('status');
  el.className = state;  // '' | 'loading' | 'success' | 'error'
  el.textContent = message;
}

function bindButton() {
  const btn = document.getElementById('downloadBtn');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    setStatus('loading', '抓取中…');
    try {
      const records = await fetchCourseData();
      const filename = downloadAsExcel(records);
      setStatus('success', `已下載 ${filename}`);
    } catch (err) {
      console.error(err);
      let message;
      if (err instanceof TypeError || (err.message && err.message.startsWith('HTTP'))) {
        message = '下載失敗：無法連線到資料來源，請稍後再試';
      } else if (err.message && err.message.includes('JSON')) {
        message = '下載失敗：資料格式異常';
      } else {
        message = `下載失敗：${err.message}`;
      }
      setStatus('error', message);
    } finally {
      btn.disabled = false;
    }
  });
}
```

- [ ] **Step 2: 完整 E2E 手動驗收**

```bash
xdg-open "/home/username/桌面/nthu-courses-excel/index.html"
```

跑 spec 裡的 6 條手動驗收 checklist：

1. 開啟頁面，看到按鈕 + 空白 status ✓
2. 點按鈕，status 立刻變灰色「抓取中…」、按鈕 disable ✓
3. 約幾秒後瀏覽器下載 .xlsx，status 變綠色「已下載 …」、按鈕重新 enable ✓
4. 打開 .xlsx 確認 19 欄、數千列、清理過、欄寬合理 ✓
5. 中斷網路（DevTools Network → Offline）再點按鈕，看到紅色「下載失敗：無法連線…」、按鈕重新 enable ✓
6. （可選）在 Chrome / Firefox 各跑一次 ✓

- [ ] **Step 3: Commit**

```bash
cd "/home/username/桌面/nthu-courses-excel"
git add app.js
git commit -m "feat: 加入按鈕綁定與 idle/loading/success/error 狀態機"
```

---

## 收尾

實作完成後，整個專案目錄結構：

```
/home/username/桌面/nthu-courses-excel/
├─ .git/
├─ docs/superpowers/
│  ├─ specs/2026-05-14-nthu-courses-excel-design.md
│  └─ plans/2026-05-14-nthu-courses-excel.md
├─ app.js
├─ index.html
├─ styles.css
└─ test.html
```

`git log --oneline` 預期看到 7 個 commit（spec + 6 個 task）。

如需嵌入到 user 既有後台頁面，把 `index.html` 的 `<button>` + `<div id="status">` + 兩個 `<script>` 標籤、以及 `styles.css` 內的相關規則複製過去即可（變數命名沒衝突就直接放）。
