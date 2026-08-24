// ==========================================
// 1. 全域變數與 DOM 元素抓取
// ==========================================
let radioData = [];

const timeSelect = document.getElementById('timeSelect');
const langSelect = document.getElementById('langSelect');
const stationSelect = document.getElementById('stationSelect');
const stationContainer = document.getElementById('stationContainer');
const alertBanner = document.getElementById('alertBanner');
const listTitle = document.getElementById('listTitle');
const listCount = document.getElementById('listCount');
const currentClock = document.getElementById('currentClock');

// ==========================================
// 2. 嚴格過濾雜訊項目
// ==========================================
function isValidItem(item) {
  if (!item || typeof item !== 'object') return false;
  if ('filename' in item || 'name' in item) return false;

  const station = String(item.station || '').trim();
  if (station.toLowerCase().includes('.json') || station.toLowerCase().includes('data.json')) {
    return false;
  }
  return station.length > 0;
}

// ==========================================
// 3. 時間轉換、區間交集（重疊）匹配邏輯
// ==========================================
function getCurrentHHMM() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return parseInt(hh + mm, 10);
}

// 解析時段字串中的起訖時間 (自動忽略星期幾等附帶文字)
// 例如 "1700-1800"、"2230-2300(週一至五)" 皆能解析
function parseTimeRange(timeStr) {
  if (!timeStr) return null;
  const match = String(timeStr).match(/(\d{4})\s*-\s*(\d{4})/);
  if (!match || match.length < 3) return null;

  return {
    start: parseInt(match[1], 10),
    end: parseInt(match[2], 10),
    raw: `${match[1]}-${match[2]}` // 標準化四碼區間
  };
}

// 判斷特定時間點 (targetNum) 是否落在電台時段內
function isPointInTime(timeStr, targetNum) {
  const r = parseTimeRange(timeStr);
  if (!r) return false;

  // 跨午夜判斷 (如 2300-0100)
  if (r.start > r.end) {
    return targetNum >= r.start || targetNum <= r.end;
  }
  // 一般時段 (如 1410-1430)
  return targetNum >= r.start && targetNum <= r.end;
}

// 判斷兩個時段是否有重疊/相交 (Overlap / Interval Intersection)
// 例如：選取 1700-1800 能匹配 1700-1730、1730-1830、1600-1900 等相容時段
function isTimeRangeOverlap(selectedRangeStr, itemTimeStr) {
  const r1 = parseTimeRange(selectedRangeStr); // 選單選取的時段
  const r2 = parseTimeRange(itemTimeStr);       // 電台資料庫的時段
  if (!r1 || !r2) return false;

  // 展開為 [start, end] 區間列表，完整處理跨午夜 (如 2300-0100 拆成 2300~2400 與 0000~0100)
  function expandIntervals(r) {
    if (r.start > r.end) {
      return [
        { s: r.start, e: 2400 },
        { s: 0, e: r.end }
      ];
    }
    return [{ s: r.start, e: r.end }];
  }

  const list1 = expandIntervals(r1);
  const list2 = expandIntervals(r2);

  // 兩組區間只要有任一區間交集 > 0，即判定為相容時段
  for (const i1 of list1) {
    for (const i2 of list2) {
      const maxStart = Math.max(i1.s, i2.s);
      const minEnd = Math.min(i1.e, i2.e);
      if (maxStart < minEnd) {
        return true;
      }
    }
  }
  return false;
}

// 單項資料與選取條件比對輔助函式
function matchCriteria(item, tVal, lVal, sVal, currentNum) {
  let matchT = true;
  let matchL = true;
  let matchS = true;

  if (tVal === 'AUTO') {
    matchT = isPointInTime(item.time, currentNum);
  } else if (tVal === 'ALL') {
    matchT = true;
  } else {
    // 模糊區間重疊匹配（同時自動忽略星期幾等文字）
    matchT = isTimeRangeOverlap(tVal, item.time);
  }

  if (lVal !== 'ALL') {
    matchL = (item.language && String(item.language).trim() === lVal);
  }

  if (sVal !== 'ALL') {
    matchS = (item.station && String(item.station).trim() === sVal);
  }

  return matchT && matchL && matchS;
}

// ==========================================
// 4. UI 初始化與選項生成 (標準化純時段選單)
// ==========================================
function initFilters() {
  const timeRanges = new Map(); // key: "1700-1800", value: startInt
  const langs = new Set();
  const stations = new Set();

  radioData.forEach(item => {
    if (!isValidItem(item)) return;

    // 將時段純化為標準 "XXXX-XXXX"，去除星期幾等雜訊並去重
    const r = parseTimeRange(item.time);
    if (r) {
      if (!timeRanges.has(r.raw)) {
        timeRanges.set(r.raw, r.start);
      }
    }

    if (item.language && String(item.language).trim()) langs.add(String(item.language).trim());
    if (item.station && String(item.station).trim()) stations.add(String(item.station).trim());
  });

  // 依開始時間由早到晚排序
  const sortedTimeRanges = Array.from(timeRanges.entries()).sort((a, b) => a[1] - b[1]);

  timeSelect.innerHTML = '';
  const optAuto = document.createElement('option');
  optAuto.value = 'AUTO';
  optAuto.textContent = '現在時間 (自動匹配)';
  timeSelect.appendChild(optAuto);

  const optAllTime = document.createElement('option');
  optAllTime.value = 'ALL';
  optAllTime.textContent = '全部時段';
  timeSelect.appendChild(optAllTime);

  sortedTimeRanges.forEach(([rawTime]) => {
    const opt = document.createElement('option');
    opt.value = rawTime;
    opt.textContent = rawTime;
    timeSelect.appendChild(opt);
  });

  // 語言選單
  langSelect.innerHTML = '<option value="ALL">全部語言</option>';
  Array.from(langs).sort().forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    langSelect.appendChild(opt);
  });

  // 電台選單
  stationSelect.innerHTML = '<option value="ALL">全部電台</option>';
  Array.from(stations).sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    stationSelect.appendChild(opt);
  });
}

function renderList(data) {
  stationContainer.innerHTML = '';
  const validList = data.filter(isValidItem);

  validList.forEach(item => {
    const card = document.createElement('div');
    card.className = 'station-card';
    card.innerHTML = `
      <div class="station-info">
        <div class="station-name">${item.station || '未知電台'}</div>
        <div class="station-meta">
          <span class="meta-tag">🕒 ${item.time || '未指定'}</span>
          <span class="meta-tag">🗣️ ${item.language || '未註明'}</span>
          ${item.region ? `<span class="meta-tag">📍 ${item.region}</span>` : ''}
        </div>
      </div>
      <div class="freq-box">
        <div class="freq-val">${item.frequency || '--'}</div>
        <div class="freq-unit">kHz</div>
      </div>
    `;
    stationContainer.appendChild(card);
  });
  listCount.textContent = `${validList.length} 個頻率`;
}

// ==========================================
// 5. 篩選判斷與查無結果處理
// ==========================================
function applyFilter() {
  const selectedTime = timeSelect.value;
  const selectedLang = langSelect.value;
  const selectedStation = stationSelect.value;
  const currentNum = getCurrentHHMM();

  const validData = radioData.filter(isValidItem);
  const filtered = validData.filter(item => matchCriteria(item, selectedTime, selectedLang, selectedStation, currentNum));

  if (filtered.length === 0) {
    alertBanner.style.display = 'block';
    listTitle.textContent = '全部電台清單 (查無符合結果)';
    renderList(validData);
  } else {
    alertBanner.style.display = 'none';
    if (selectedTime === 'AUTO') {
      listTitle.textContent = '現正播音電台';
    } else if (selectedTime === 'ALL') {
      listTitle.textContent = '全部時段電台';
    } else {
      listTitle.textContent = `時段涵蓋 ${selectedTime} 之電台`;
    }
    renderList(filtered);
  }
}

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  currentClock.textContent = `目前時間：${hh}:${mm}`;
}

// ==========================================
// 6. 資料載入
// ==========================================
async function loadData() {
  try {
    const jsonUrl = new URL('data.json', window.location.href).href;
    const response = await fetch(jsonUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (${response.statusText})`);
    }

    let text = await response.text();
    text = text.replace(/^\uFEFF/, '').trim();
    const sanitizedText = text.replace(/,\s*([\]}])/g, '$1');

    const rawData = JSON.parse(sanitizedText);
    radioData = Array.isArray(rawData) ? rawData.filter(isValidItem) : [];

    initFilters();
    updateClock();
    applyFilter();
  } catch (error) {
    console.error('無法載入 data.json:', error);
    alertBanner.style.display = 'block';
    alertBanner.textContent = `❌ 無法載入資料: ${error.message}`;
  }
}

// ==========================================
// 7. 三向智慧交叉連動事件
// ==========================================
timeSelect.addEventListener('change', () => {
  const tVal = timeSelect.value;
  let lVal = langSelect.value;
  let sVal = stationSelect.value;
  const currentNum = getCurrentHHMM();
  const validData = radioData.filter(isValidItem);

  if (validData.some(item => matchCriteria(item, tVal, lVal, sVal, currentNum))) {
    applyFilter();
    return;
  }

  if (sVal !== 'ALL' && validData.some(item => matchCriteria(item, tVal, 'ALL', sVal, currentNum))) {
    langSelect.value = 'ALL';
    applyFilter();
    return;
  }

  if (lVal !== 'ALL' && validData.some(item => matchCriteria(item, tVal, lVal, 'ALL', currentNum))) {
    stationSelect.value = 'ALL';
    applyFilter();
    return;
  }

  langSelect.value = 'ALL';
  stationSelect.value = 'ALL';
  applyFilter();
});

stationSelect.addEventListener('change', () => {
  let tVal = timeSelect.value;
  let lVal = langSelect.value;
  const sVal = stationSelect.value;
  const currentNum = getCurrentHHMM();
  const validData = radioData.filter(isValidItem);

  if (validData.some(item => matchCriteria(item, tVal, lVal, sVal, currentNum))) {
    applyFilter();
    return;
  }

  if (validData.some(item => matchCriteria(item, tVal, 'ALL', sVal, currentNum))) {
    langSelect.value = 'ALL';
    applyFilter();
    return;
  }

  if (lVal !== 'ALL' && validData.some(item => matchCriteria(item, 'ALL', lVal, sVal, currentNum))) {
    timeSelect.value = 'ALL';
    applyFilter();
    return;
  }

  timeSelect.value = 'ALL';
  langSelect.value = 'ALL';
  applyFilter();
});

langSelect.addEventListener('change', () => {
  let tVal = timeSelect.value;
  const lVal = langSelect.value;
  let sVal = stationSelect.value;
  const currentNum = getCurrentHHMM();
  const validData = radioData.filter(isValidItem);

  if (validData.some(item => matchCriteria(item, tVal, lVal, sVal, currentNum))) {
    applyFilter();
    return;
  }

  if (validData.some(item => matchCriteria(item, tVal, lVal, 'ALL', currentNum))) {
    stationSelect.value = 'ALL';
    applyFilter();
    return;
  }

  if (sVal !== 'ALL' && validData.some(item => matchCriteria(item, 'ALL', lVal, sVal, currentNum))) {
    timeSelect.value = 'ALL';
    applyFilter();
    return;
  }

  timeSelect.value = 'ALL';
  stationSelect.value = 'ALL';
  applyFilter();
});

// 初始化
loadData();
setInterval(updateClock, 10000);
