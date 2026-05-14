// Cloudflare Worker：清大開放課程 JSON 的 CORS proxy。
//
// 為什麼存在：清大 server 沒給 Access-Control-Allow-Origin，
// 瀏覽器直接 fetch 會被 CORS 擋；免費公開 proxy 又會截斷大檔。
// 自己跑 Worker 既穩定又免費（每天 100k requests free tier）。
//
// 部署方式請看 DEPLOY.md。

const UPSTREAM = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json';

export default {
  async fetch() {
    const response = await fetch(UPSTREAM, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
