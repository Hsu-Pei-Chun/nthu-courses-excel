# Cloudflare Worker 部署指南

要做的事：在 Cloudflare 上跑一個小小的 proxy，讓你的網頁可以無 CORS 限制地抓清大課程資料。**全程免費、每天 10 萬次呼叫額度**。

## 步驟

### 1. 註冊 Cloudflare 帳號

到 https://dash.cloudflare.com/sign-up 註冊一個免費帳號（用 email + 密碼）。

### 2. 建立 Worker

1. 登入後左側選單點 **Workers & Pages**
2. 點 **Create application** → **Create Worker**
3. 取個名字，建議 `nthu-courses-proxy`（之後會出現在你的 URL 裡）
4. 點 **Deploy**（會先部署一個預設的 hello world）

### 3. 貼上實際的 Worker code

1. 部署後點 **Edit code**（或 **Quick edit**），進入線上編輯器
2. 把編輯器內全部刪掉，貼上 `worker.js` 的內容（這個 repo 根目錄那個檔）
3. 點右上 **Save and Deploy**

### 4. 拿到你的 Worker URL

部署完成後 Cloudflare 會顯示你的 Worker URL，格式長這樣：

```
https://nthu-courses-proxy.<你的子網域>.workers.dev
```

例如：`https://nthu-courses-proxy.philosophysis.workers.dev`

### 5. 驗證能拿到資料

在瀏覽器網址列直接貼上 Worker URL 按 Enter，應該會看到整頁密密麻麻的 JSON 文字（unicode escape 編碼的中文）。如果看到，代表 proxy 已經 work。

## 限制

- **每天 100,000 個 requests**：以你的用量遠遠用不完
- **每個 request 上限 10 MB**：清大檔案 3.2 MB，OK
- **CPU 時間 10ms**：我們只是轉送，不做計算，OK

## 出狀況時

| 症狀 | 可能原因 |
|---|---|
| Worker URL 看不到資料、500 錯誤 | 清大 server 暫時掛了，等一下重試 |
| 顯示 Cloudflare error 1101/1102 | Worker code 有 syntax error，重新貼一次 worker.js |
| HTML 抓 Worker 還是 CORS error | Worker code 漏了 `Access-Control-Allow-Origin` header，檢查 worker.js 是否完整 |

## 下一步

部署完成、確認 Worker URL 能拿到資料後，把 URL 告訴 Claude，他會幫你改 HTML 變成「一鍵下載」版本。
