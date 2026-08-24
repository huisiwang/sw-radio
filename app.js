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
// 2. 時間轉換與跨午夜匹配邏輯
// ==========================================
function getCurrentHHMM() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return parseInt(hh + mm, 10);
}

function isTimeMatch(timeStr, targetNum) {
  if (!timeStr) return false;

  const match = timeStr.match(/(\d{4})\s*-\s*(\d{4})/);
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
// 3. UI 初始化與選項生成
// ==========================================
function initFilters() {
  const times = new Set();
  const langs = new Set();
  const stations = new Set();

  radioData.forEach(item => {
    if (item.time) times.add(item.time.trim());
    if (item.language) langs.add(item.language.trim());
    if (item.station) stations.add(item.station.trim());
  });

  times.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  });

  langs.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    langSelect.appendChild(opt);
  });

  stations.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    stationSelect.appendChild(opt);
  });
}

function renderList(data) {
  stationContainer.innerHTML = '';
  data.forEach(item => {
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
  listCount.textContent = `${data.length} 個頻率`;
}

// ==========================================
// 4. 篩選判斷與查無結果處理
// ==========================================
function applyFilter() {
  const selectedTime = timeSelect.value;
  const selectedLang = langSelect.value;
  const selectedStation = stationSelect.value;
  const currentNum = getCurrentHHMM();

  const filtered = radioData.filter(item => {
    let matchT = true;
    let matchL = true;
    let matchS = true;

    if (selectedTime === 'AUTO') {
      matchT = isTimeMatch(item.time, currentNum);
    } else {
      matchT = (item.time && item.time.trim() === selectedTime);
    }

    if (selectedLang !== 'ALL') {
      matchL = (item.language && item.language.trim() === selectedLang);
    }

    if (selectedStation !== 'ALL') {
      matchS = (item.station && item.station.trim() === selectedStation);
    }

    return matchT && matchL && matchS;
  });

  if (filtered.length === 0) {
    alertBanner.style.display = 'block';
    listTitle.textContent = '全部電台清單 (查無符合結果)';
    renderList(radioData);
  } else {
    alertBanner.style.display = 'none';
    listTitle.textContent = selectedTime === 'AUTO' ? '現正播音電台' : '篩選結果';
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
// 5. 資料載入 (Fetch data.json 相對路徑解析)
// ==========================================
async function loadData() {
  try {
    // 依據目前 HTML 所在完整 URL 相對解析 data.json，避免 GitHub Pages 子路徑差異
    const jsonUrl = new URL('data.json', window.location.href).href;
    const response = await fetch(jsonUrl, { cache: 'no-cache' });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (${response.statusText})`);
    }

    const text = await response.text();
    try {
      radioData = JSON.parse(text);
    } catch (parseErr) {
      throw new Error(`JSON 語法解析失敗: ${parseErr.message}`);
    }

    initFilters();
    updateClock();
    applyFilter();
  } catch (error) {
    console.error('無法載入 data.json:', error);
    alertBanner.style.display = 'block';
    alertBanner.textContent = `❌ 無法載入資料: ${error.message}。請檢查檔案大小寫或 JSON 語法。`;
  }
}

timeSelect.addEventListener('change', applyFilter);
langSelect.addEventListener('change', applyFilter);
stationSelect.addEventListener('change', applyFilter);

// 初始化
loadData();
setInterval(updateClock, 10000);
