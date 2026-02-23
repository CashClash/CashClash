let financialData = null;
let currentYear = "2025";
let currentTimeUnit = "sec";

// Завантаження даних
async function init() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        updateUI();
        startTickers();
    } catch (e) {
        console.error("Помилка завантаження даних:", e);
    }
}

// Функція оновлення цифр у реальному часі
function startTickers() {
    const update = () => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const secondsPassed = (now - startOfYear) / 1000;

        financialData.entities.forEach((entity, index) => {
            const yearData = entity.data[currentYear] || { income: 0, spending: 0 };
            
            // Визначаємо, що показувати (ліва картка - витрати, права - дохід)
            const valuePerYear = (index === 0) ? yearData.spending : yearData.income;
            const perSec = valuePerYear / (365 * 24 * 60 * 60);
            
            const cumulative = secondsPassed * perSec;
            
            // Форматування одиниць (sec, min, hour, year)
            let displayRate = perSec;
            if (currentTimeUnit === "min") displayRate *= 60;
            if (currentTimeUnit === "hour") displayRate *= 3600;
            if (currentTimeUnit === "year") displayRate = valuePerYear;

            // Оновлення DOM
            const prefix = index === 0 ? "left" : "right";
            document.getElementById(`${prefix}Cumulative`).innerText = cumulative.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById(`${prefix}Rate`).innerText = displayRate.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            // Оновлення висоти бару (пропорційно)
            const barHeight = Math.min((perSec / 1000) * 100, 100); // Спрощена логіка масштабу
            document.getElementById(`${prefix}Bar`).style.height = `${barHeight + 10}%`;
        });

        requestAnimationFrame(update);
    };
    update();
}

// Обробка кліків на кнопки (роки та таби)
document.getElementById('timeTabs').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('#timeTabs button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTimeUnit = e.target.dataset.unit;
    }
});

init();
