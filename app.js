let radioData = [];

// 網頁初始化
document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            radioData = data;
            initFilters();
            updateTimeDisplay();
            renderTable();
            
            // 監聽選單變更
            document.getElementById("filterTime").addEventListener("change", renderTable);
            document.getElementById("filterLang").addEventListener("change", renderTable);
            document.getElementById("filterStation").addEventListener("change", renderTable);
        })
        .catch(err => console.error("無法讀取資料庫:", err));
        
    // 每分鐘更新一次手機時間顯示
    setInterval(updateTimeDisplay, 60000);
});

// 更新時間文字顯示
function updateTimeDisplay() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    document.getElementById("currentTime").innerText = `手機時間：${hh}:${mm}`;
}

// 初始化並動態生成下拉選單選項
function initFilters() {
    const timeSelect = document.getElementById("filterTime");
    const langSelect = document.getElementById("filterLang");
    const stationSelect = document.getElementById("filterStation");

    const times = new Set();
    const langs = new Set();
    const stations = new Set();

    radioData.forEach(item => {
        if(item.time) times.add(item.time);
        if(item.language) langs.add(item.language);
        if(item.station) stations.add(item.station);
    });

    // 填入時間區間
    Array.from(times).sort().forEach(t => {
        timeSelect.options.add(new Option(t, t));
    });
    // 填入語言
    Array.from(langs).sort().forEach(l => {
        langSelect.options.add(new Option(l, l));
    });
    // 填入電台
    Array.from(stations).sort().forEach(s => {
        stationSelect.options.add(new Option(s, s));
    });
}

// 核心時間比對演算法
function isTimeMatched(currentTimeStr, targetInterval) {
    // 提取目標區間的前四碼數字 (例如 "1900-2000" 提取 1900 和 2000)
    const match = targetInterval.match(/^(\d{4})-(\d{4})/);
    if (!match) return false;

    const current = parseInt(currentTimeStr, 10);
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    if (end < start) { 
        // 💡 跨子夜處理邏輯 (例如 2300-0100)
        return current >= start || current < end;
    }
    return current >= start && current < end;
}

// 核心篩選與渲染畫面
function renderTable() {
    const selectTime = document.getElementById("filterTime").value;
    const selectLang = document.getElementById("filterLang").value;
    const selectStation = document.getElementById("filterStation").value;
    const alertBox = document.getElementById("alertBox");
    const container = document.getElementById("listContainer");

    // 取得當前手機時間的四碼字串 (例如 "1625")
    const now = new Date();
    const current4DigitTime = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');

    // 1. 執行篩選
    let filtered = radioData.filter(item => {
        // 時間篩選
        if (selectTime === "auto") {
            if (!isTimeMatched(current4DigitTime, item.time)) return false;
        } else if (selectTime !== "all" && item.time !== selectTime) {
            return false;
        }
        // 語言篩選
        if (selectLang !== "all" && item.language !== selectLang) return false;
        // 電台篩選
        if (selectStation !== "all" && item.station !== selectStation) return false;

        return true;
    });

    // 2. 防呆機制：若查無資料，改為顯示全部
    if (filtered.length === 0) {
        filtered = radioData;
        alertBox.style.display = "block";
    } else {
        alertBox.style.display = "none";
    }

    // 3. 渲染卡片介面
    container.innerHTML = "";
    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "radio-card";
        card.innerHTML = `
            <div class="card-title">${item.station}</div>
            <div class="card-meta">
                <span>時段: ${item.time}</span>
                <span>語言: ${item.language}</span>
            </div>
            <div class="card-meta" style="align-items: center; margin-top: 8px;">
                <span class="frequency-badge">${item.frequency} kHz</span>
                <span class="region-text">${item.region !== '未註明' ? item.region : ''}</span>
            </div>
        `;
        container.appendChild(card);
    });
}
