'use strict';

const NTHU_URL = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json';
const CORS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest=';

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
  let response;
  try {
    response = await fetch(url);
  } catch (_) {
    throw new Error('NETWORK_ERROR');
  }
  if (!response.ok) {
    throw new Error('NETWORK_ERROR');
  }
  let data;
  try {
    data = await response.json();
  } catch (_) {
    throw new Error('PARSE_ERROR');
  }
  if (!Array.isArray(data)) {
    throw new Error('PARSE_ERROR');
  }
  return data;
}

async function downloadAsExcel(records, setPhase) {
  if (setPhase) setPhase('整理欄位中…');
  await new Promise(r => setTimeout(r, 0));
  const cleaned = records.map(cleanRecord);

  if (setPhase) setPhase('產生 Excel 中…');
  await new Promise(r => setTimeout(r, 0));
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

function setStatus(state, message) {
  const el = document.getElementById('status');
  el.className = state;  // '' | 'loading' | 'success' | 'error'
  el.textContent = message;
}

function bindButton() {
  const btn = document.getElementById('downloadBtn');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    setStatus('loading', '下載資料中…');
    try {
      const records = await fetchCourseData();
      const filename = await downloadAsExcel(records, msg => setStatus('loading', msg));
      setStatus('success', `已下載 ${filename}`);
    } catch (err) {
      console.error(err);
      let message;
      switch (err.message) {
        case 'NETWORK_ERROR':
          message = '下載失敗：無法連線到資料來源，請稍後再試';
          break;
        case 'PARSE_ERROR':
          message = '下載失敗：資料格式異常';
          break;
        default:
          message = `下載失敗：${err.message}`;
      }
      setStatus('error', message);
    } finally {
      btn.disabled = false;
    }
  });
}
