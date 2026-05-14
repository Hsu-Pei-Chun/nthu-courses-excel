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

// downloadAsExcel(records) -> void
// bindButton() -> void
