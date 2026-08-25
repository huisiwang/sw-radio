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
const refreshBtn = document.getElementById('refreshBtn');

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

function parseTimeRange(timeStr) {
  if (!timeStr) return null;
  const match = String(timeStr).match(/(\d{4})\s*-\s*(\d{4})/);
  if (!match || match.length < 3) return null;

  return {
    start: parseInt(match[1], 10),
    end: parseInt(match[2], 10),
    raw: `${match[1]}-${match[2]}`
  };
}

function isPointInTime(timeStr, targetNum) {
  const r = parseTimeRange(timeStr);
  if (!r) return false;

  if (r.start > r.end) {
    return targetNum >= r.start || targetNum <= r.end;
  }
  return targetNum >= r.start && targetNum <= r.end;
}

function isTimeRangeOverlap(selectedRangeStr, itemTimeStr) {
  const r1 = parseTimeRange(selectedRangeStr);
  const r2 = parseTimeRange(itemTimeStr);
  if (!r1 || !r2) return false;

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

function matchCriteria(item, tVal, lVal, sVal, currentNum) {
  let matchT = true;
  let matchL = true;
  let matchS = true;

  if (tVal === 'AUTO') {
    matchT = isPointInTime(item.time, currentNum);
  } else if (tVal === 'ALL') {
    matchT = true;
  } else {
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

// 語言自訂排序權重：普通話/華語/國語最優先，其次為英語，其餘依筆畫/字母排序
function getLangPriority(lang) {
  const l = String(lang).toLowerCase();
  if (l.includes('普通話') || l.includes('华语') || l.includes('華語') || l.includes('国语') || l.includes('國語') || l.includes('mandarin') || l.includes('chinese')) {
    return 1;
  }
  if (l.includes('英語') || l.includes('英语') || l.includes('english') || l === 'en') {
    return 2;
  }
  return 3;
}

// ==========================================
// 4. UI 初始化與選項生成 (普通話/英語 置頂)
// ==========================================
function initFilters() {
  const timeRanges = new Map();
  const langs = new Set();
  const stations = new Set();

  radioData.forEach(item => {
    if (!isValidItem(item)) return;

    const r = parseTimeRange(item.time);
    if (r && !timeRanges.has(r.raw)) {
      timeRanges.set(r.raw, r.start);
    }

    if (item.language && String(item.language).trim()) langs.add(String(item.language).trim());
    if (item.station && String(item.station).trim()) stations.add(String(item.station).trim());
  });

  // 1. 時段選單
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
  
  timeSelect.innerHTML = `
    <option value="AUTO">現在時間（自動匹配）</option>
    <option value="ALL">全部時段</option>
  `;
  
  for (let hour = 0; hour < 24; hour += 1) {
      const start = String(hour).padStart(2, '0') + '00';
      const end = String(hour + 1).padStart(2, '0') + '00';

      const option = document.createElement('option');
      option.value = `${start}-${end}`;
      option.textContent = `${start}-${end}`;
      timeSelect.appendChild(option);
  }

  sortedTimeRanges.forEach(([rawTime]) => {
    const opt = document.createElement('option');
    opt.value = rawTime;
    opt.textContent = rawTime;
    timeSelect.appendChild(opt);
  });

  // 2. 語言選單 (普通話系列 -> 英語 -> 其餘語言)
  const sortedLangs = Array.from(langs).sort((a, b) => {
    const pA = getLangPriority(a);
    const pB = getLangPriority(b);
    if (pA !== pB) return pA - pB;
    return a.localeCompare(b, 'zh-Hant');
  });

  langSelect.innerHTML = '<option value="ALL">全部語言</option>';
  sortedLangs.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    langSelect.appendChild(opt);
  });

  // 3. 電台選單
  stationSelect.innerHTML = '<option value="ALL">全部電台</option>';
  Array.from(stations).sort((a, b) => a.localeCompare(b, 'zh-Hant')).forEach(s => {
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
          ${item.target ? `<span class="meta-tag">📍 ${item.target}</span>` : ''}
          ${item.remarks ? `<span class="meta-tag">📝 ${item.remarks}</span>` : ''}
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

// ==========================================
// 8. 重新整理
// ==========================================
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    window.location.reload();
  });
}

// 初始化
loadData();
setInterval(updateClock, 10000);
