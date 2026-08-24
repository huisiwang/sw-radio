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
// 3. 時間轉換、排序與跨午夜匹配邏輯
// ==========================================
function getCurrentHHMM() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return parseInt(hh + mm, 10);
}

function parseStartTime(timeStr) {
  if (!timeStr) return 9999;
  const match = String(timeStr).match(/(\d{4})\s*-\s*(\d{4})/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 9999;
}

function isTimeMatch(timeStr, targetNum) {
  if (!timeStr) return false;

  const match = String(timeStr).match(/(\d{4})\s*-\s*(\d{4})/);
  if (!match || match.length < 3) return false;

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);

  // 跨午夜判斷 (如 2300-0100)
  if (start > end) {
    return targetNum >= start || targetNum <= end;
  }

  // 一般時段判斷 (如 1410-1430)
  return targetNum >= start && targetNum <= end;
}

// ==========================================
// 4. UI 初始化與選項生成 (時段按開始時間排序)
// ==========================================
function initFilters() {
  const times = new Set();
  const langs = new Set();
  const stations = new Set();

  radioData.forEach(item => {
    if (!isValidItem(item)) return;
    if (item.time && String(item.time).trim()) times.add(String(item.time).trim());
    if (item.language && String(item.language).trim()) langs.add(String(item.language).trim());
    if (item.station && String(item.station).trim()) stations.add(String(item.station).trim());
  });

  // 1. 時段依照「開始時間」升序排序 (例如 0000 -> 0600 -> 1400 -> 2200)
  const sortedTimes = Array.from(times).sort((a, b) => {
    const startA = parseStartTime(a);
    const startB = parseStartTime(b);
    return startA - startB;
  });

  timeSelect.innerHTML = '';
  const optAuto = document.createElement('option');
  optAuto.value = 'AUTO';
  optAuto.textContent = '現在時間 (自動匹配)';
  timeSelect.appendChild(optAuto);

  const optAllTime = document.createElement('option');
  optAllTime.value = 'ALL';
  optAllTime.textContent = '全部時段';
  timeSelect.appendChild(optAllTime);

  sortedTimes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  });

  // 2. 語言列表
  langSelect.innerHTML = '<option value="ALL">全部語言</option>';
  Array.from(langs).sort().forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    langSelect.appendChild(opt);
  });

  // 3. 電台列表
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

  const filtered = validData.filter(item => {
    let matchT = true;
    let matchL = true;
    let matchS = true;

    if (selectedTime === 'AUTO') {
      matchT = isTimeMatch(item.time, currentNum);
    } else if (selectedTime === 'ALL') {
      matchT = true;
    } else {
      matchT = (item.time && String(item.time).trim() === selectedTime);
    }

    if (selectedLang !== 'ALL') {
      matchL = (item.language && String(item.language).trim() === selectedLang);
    }

    if (selectedStation !== 'ALL') {
      matchS = (item.station && String(item.station).trim() === selectedStation);
    }

    return matchT && matchL && matchS;
  });

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
      listTitle.textContent = '篩選結果';
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
// 6. 資料載入 (標準快取機制)
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
// 7. 選單連動事件
// ==========================================
timeSelect.addEventListener('change', applyFilter);

// 切換「語言」時：自動將時段設為「全部時段」
langSelect.addEventListener('change', () => {
  timeSelect.value = 'ALL';
  applyFilter();
});

// 切換「電台」時：自動將時段設為「全部時段」，且自動將語言重設為「全部語言」
stationSelect.addEventListener('change', () => {
  timeSelect.value = 'ALL';
  langSelect.value = 'ALL';
  applyFilter();
});

// 初始化
loadData();
setInterval(updateClock, 10000);
