'use strict';

const NTHU_URL = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json';
const CORS_PROXY = 'https://corsproxy.io/?url=';

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

// fetchCourseData() -> Promise<Array>
// downloadAsExcel(records) -> void
// bindButton() -> void
