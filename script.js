let financialData = null;
let currentYear = "2026";
let currentTimeUnit = "sec";
let cardModes = { left: "spending", right: "income" };
let drift = { left: 1, right: 1 };

const multipliers = {
    sec: 1, min: 60, hour: 3600, day: 86400,
    week: 604800, month: 2592000, year: 31536000
};

const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

async function init() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        setupEventListeners();
        startTickers();
    } catch (e) { console.error("Error:", e); }
}

function setupEventListeners() {
    document.getElementById('timeTabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#timeTabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeUnit = e.target.dataset.unit;
        }
    });

    document.getElementById('yearSelector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#yearSelector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentYear = e.target.innerText;
            // Оновлюємо деталі (категорії) відразу при зміні року
            updateDetails("left");
            updateDetails("right");
        }
    });

    document.querySelectorAll('.mode-switch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const side = card.dataset.side;
            cardModes[side] = e.target.dataset.mode;
            card.className = `card ${e.target.dataset.mode}`;
            card.querySelectorAll('.mode-switch').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateDetails(side);
        });
    });
}

function updateDetails(side) {
    if (!financialData) return;
    const entity = side === "left" ? financialData.entities[0] : financialData.entities[1];
    const effectiveYear = currentYear === "Total" ? "2026" : currentYear;
    const yearData = entity.data[effectiveYear];
    const mode = cardModes[side];

    if (!yearData || !yearData[mode]) return;

    // Оновлення списку категорій
    const detailsContainer = document.getElementById(`${side}Details`);
    detailsContainer.innerHTML = '';
    
    const breakdown = yearData[mode].breakdown;
    if (breakdown) {
        Object.values(breakdown).forEach(item => {
            const row = document.createElement('div');
            row.className = 'detail-item';
            row.innerHTML = `<span class="detail-name">${item.name}</span><span class="detail-value">${item.percent}%</span>`;
            detailsContainer.appendChild(row);
        });
    }

    // Оновлення методології
    const infoBtn = document.getElementById(`${side}Methodology`);
    infoBtn.onclick = () => alert(`Methodology (${entity.name} - ${effectiveYear}):\n\n${yearData.methodology}`);
}

function startTickers() {
    const update = () => {
        if (!financialData) return;
        const now = new Date();
        const realYear = "2026"; // Встановлюємо жорстко, бо ми в 2026-му
        let effectiveYear = currentYear === "Total" ? "2026" : currentYear;
        const isCurrentYear = effectiveYear === realYear;
        
        // Для минулих років secondsPassed = повний рік (статично)
        let secondsPassed = isCurrentYear ? (now - new Date(now.getFullYear(), 0, 1)) / 1000 : multipliers.year;

        financialData.entities.forEach((entity, index) => {
            const side = index === 0 ? "left" : "right";
            const mode = cardModes[side];
            const yearData = entity.data[effectiveYear] || entity.data["2025"];
            const baseValuePerYear = yearData[mode].total || 0;
            const basePerSec = baseValuePerYear / multipliers.year;

            // Дрифт працює ТІЛЬКИ для поточного року
            if (isCurrentYear && currentTimeUnit !== "year") {
                drift[side] += (Math.random() - 0.5) * 0.002;
                drift[side] = Math.max(0.85, Math.min(drift[side], 1.15));
            } else { 
                drift[side] = 1; 
            }

            const currentRatePerSec = basePerSec * drift[side];
            const cumulative = secondsPassed * basePerSec;
            let displayRate = (currentTimeUnit === 'year') ? baseValuePerYear : currentRatePerSec * multipliers[currentTimeUnit];
            
            // Оновлення UI
            document.getElementById(`${side}Name`).innerText = entity.name;
            document.getElementById(`${side}Type`).innerText = entity.category;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;
            document.getElementById(`${side}Approx`).style.display = isCurrentYear ? "inline" : "none";
            
            const activeFormatter = (currentTimeUnit === 'sec' || currentTimeUnit === 'min') ? rateFormatter : wholeFormatter;
            document.getElementById(`${side}Rate`).innerText = activeFormatter.format(displayRate);
            document.getElementById(`${side}Cumulative`).innerText = wholeFormatter.format(Math.floor(cumulative));
            document.getElementById(`${side}Icon`).src = entity.image;

            // Висота бару
            let heightFactor = (basePerSec / 8000) * 100; 
            document.getElementById(`${side}Bar`).style.height = `${Math.max(8, Math.min(heightFactor, 92))}%`;
        });
        requestAnimationFrame(update);
    };
    
    updateDetails("left");
    updateDetails("right");
    update();
}

init();
