let currentLang = 'en'; 
let currentYear = "2026";
let currentTimeUnit = "sec";
let cardModes = { left: "spending", right: "income" };
let financialData = { left: null, right: null };
let drift = { left: 1, right: 1 };

const availableLangs = ['en', 'ua']; 
const multipliers = {
    sec: 1, min: 60, hour: 3600, day: 86400,
    week: 604800, month: 2592000, year: 31536000
};

const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

async function init() {
    applyInitialTheme();
    
    // Визначаємо мову
    const browserLang = navigator.language.split('-')[0];
    const savedLang = localStorage.getItem('lang');
    if (savedLang) {
        currentLang = savedLang;
    } else if (availableLangs.includes(browserLang)) {
        currentLang = browserLang;
    }

    await loadLanguage(currentLang);
    setupEventListeners();
    setupLangSelector();
    startTickers();
}

async function loadLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    try {
        // 1. Завантажуємо основні тексти інтерфейсу
        const mainRes = await fetch(`i18n/${lang}/main.json`);
        if (!mainRes.ok) throw new Error('Main JSON not found');
        const mainTexts = await mainRes.json();
        applyInterfaceTexts(mainTexts);

        // 2. Завантажуємо дані (виправлено назву musk -> elon-musk)
        const leftRes = await fetch(`i18n/${lang}/data/nasa.json`);
        const rightRes = await fetch(`i18n/${lang}/data/elon-musk.json`);
        
        financialData.left = await leftRes.json();
        financialData.right = await rightRes.json();
        
        updateDetails("left");
        updateDetails("right");
    } catch (e) {
        console.error("Помилка ініціалізації даних:", e);
    }
}

function applyInterfaceTexts(t) {
    if (!t || !t.ui) return;
    
    // Основні заголовки
    document.getElementById('mainTitle').innerText = t.ui.title;
    document.getElementById('donateTitle').innerText = t.donate.title;
    document.getElementById('donateDesc').innerText = t.donate.desc;
    document.getElementById('donateBtn').innerText = t.donate.btn_text;
    document.getElementById('footerCreated').innerText = t.ui.created_by;
    document.getElementById('footerSlogan').innerText = t.ui.slogan;
    
    if (t.seo_text) {
        document.getElementById('seoContent').innerHTML = t.seo_text;
    }

    // Текст накопичення в картках
    document.querySelectorAll('.subtext').forEach(el => {
        el.innerText = t.ui.cumulative_label;
    });
}

function setupEventListeners() {
    // Вибір одиниць часу
    document.getElementById('timeTabs').onclick = (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#timeTabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeUnit = e.target.dataset.unit;
        }
    };

    // Вибір року
    document.getElementById('yearSelector').onclick = (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#yearSelector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentYear = e.target.innerText;
            updateDetails("left");
            updateDetails("right");
        }
    };

    // Перемикач режимів у картках (Витрати/Доходи)
    document.querySelectorAll('.mode-switch').forEach(btn => {
        btn.onclick = (e) => {
            const card = e.target.closest('.card');
            const side = card.dataset.side;
            cardModes[side] = e.target.dataset.mode;
            card.className = `card ${e.target.dataset.mode}`;
            card.querySelectorAll('.mode-switch').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateDetails(side);
        };
    });

    document.getElementById('themeToggle').onclick = toggleTheme;
}

function setupLangSelector() {
    const container = document.getElementById('langSelector');
    if (!container) return;
    container.innerHTML = '';
    
    availableLangs.forEach(lang => {
        const img = document.createElement('img');
        // Шлях i18n/ua/UA.png
        img.src = `i18n/${lang}/${lang.toUpperCase()}.png`; 
        img.className = `lang-btn ${lang === currentLang ? 'active' : ''}`;
        img.onclick = () => loadLanguage(lang);
        container.appendChild(img);
    });
}

function updateDetails(side) {
    const data = financialData[side];
    if (!data || !data.data[currentYear]) return;
    
    const yearData = data.data[currentYear];
    const mode = cardModes[side];
    const detailsContainer = document.getElementById(`${side}Details`);
    if (!detailsContainer) return;

    detailsContainer.innerHTML = '';
    
    const breakdown = yearData[mode]?.breakdown;
    if (breakdown) {
        Object.values(breakdown).forEach(item => {
            const row = document.createElement('div');
            row.className = 'detail-item';
            row.innerHTML = `<span class="detail-name">${item.name}</span><span class="detail-value">${item.percent}%</span>`;
            detailsContainer.appendChild(row);
        });
    }
}

function startTickers() {
    const update = () => {
        const isCurrentYear = currentYear === "2026";
        const now = new Date();
        // Рахуємо секунди з початку 2026 року
        let secondsPassed = isCurrentYear ? (now - new Date(2026, 0, 1)) / 1000 : multipliers.year;

        ["left", "right"].forEach(side => {
            const data = financialData[side];
            if (!data) return;

            const mode = cardModes[side];
            const yearData = data.data[currentYear];
            if (!yearData || !yearData[mode]) return;

            const baseValuePerYear = yearData[mode].total || 0;
            const basePerSec = baseValuePerYear / multipliers.year;

            // Ефект "живого" лічильника тільки для 2026
            if (isCurrentYear && currentTimeUnit !== "year") {
                drift[side] += (Math.random() - 0.5) * 0.002;
                drift[side] = Math.max(0.9, Math.min(drift[side], 1.1));
            } else { 
                drift[side] = 1; 
            }

            const currentRatePerSec = basePerSec * drift[side];
            const cumulative = secondsPassed * basePerSec;
            let displayRate = (currentTimeUnit === 'year') ? baseValuePerYear : currentRatePerSec * multipliers[currentTimeUnit];

            // Оновлення DOM
            document.getElementById(`${side}Name`).innerText = data.name;
            document.getElementById(`${side}Type`).innerText = data.category;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;
            document.getElementById(`${side}Approx`).style.display = isCurrentYear ? "inline" : "none";
            
            const formatter = (['sec', 'min'].includes(currentTimeUnit)) ? rateFormatter : wholeFormatter;
            document.getElementById(`${side}Rate`).innerText = formatter.format(displayRate);
            document.getElementById(`${side}Cumulative`).innerText = wholeFormatter.format(Math.floor(cumulative));
            document.getElementById(`${side}Icon`).src = data.image;

            // Висота бару (динамічна)
            let heightFactor = (basePerSec / 8000) * 100; 
            document.getElementById(`${side}Bar`).style.height = `${Math.max(8, Math.min(heightFactor, 95))}%`;
        });
        requestAnimationFrame(update);
    };
    update();
}

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').innerText = savedTheme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.getElementById('themeToggle').innerText = next === 'dark' ? '🌙' : '☀️';
}

init();
