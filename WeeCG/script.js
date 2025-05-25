// Отримання посилань на HTML-елементи
const scoreElement = document.getElementById('score');
const clickButton = document.getElementById('clickButton');
const upgrade1Button = document.getElementById('upgrade1');
const upgrade1CostElement = document.getElementById('upgrade1Cost');
const upgrade2Button = document.getElementById('upgrade2');
const upgrade2CostElement = document.getElementById('upgrade2Cost');
const debugUserIdElement = document.getElementById('debugUserId');

const loadingScreen = document.getElementById('loading-screen');
const gameScreen = document.getElementById('game-screen');
const progressBarFill = document.getElementById('progressBarFill');
const loadingText = document.getElementById('loadingText');

const mainBalanceElement = document.getElementById('mainBalance');
const energyBarFill = document.getElementById('energyBarFill');
const energyText = document.getElementById('energyText');

// Ігрові змінні
let score = 0;
let mainBalance = 0;
let clickPower = 1;
let autoClickPower = 0;
let upgrade1Cost = 100;
let upgrade2Cost = 500;
let telegramUserId = null;

let currentEnergy = 1000;
const maxEnergy = 1000;
const energyRechargeRate = 100;
const energyRechargeIntervalTime = 5000;

let autoClickInterval;
let energyRechargeInterval;

const coinClickSound = new Audio('coin_click.mp3');
coinClickSound.volume = 0.5;

// Оновлення відображення
function updateDisplay() {
    scoreElement.textContent = Math.floor(score);
    mainBalanceElement.textContent = Math.floor(mainBalance);
    upgrade1CostElement.textContent = upgrade1Cost;
    upgrade2CostElement.textContent = upgrade2Cost;
    checkUpgradeAvailability();
    updateEnergyDisplay();
}

// Відображення енергії
function updateEnergyDisplay() {
    const percentage = (currentEnergy / maxEnergy) * 100;
    energyBarFill.style.width = `${percentage}%`;
    const icon = currentEnergy <= 0 ? '🪫' : '🔋';
    energyText.textContent = `${icon} ${Math.floor(currentEnergy)} / ${maxEnergy}`;
    clickButton.disabled = currentEnergy <= 0;
    clickButton.style.opacity = currentEnergy <= 0 ? 0.7 : 1;
    clickButton.style.cursor = currentEnergy <= 0 ? 'not-allowed' : 'pointer';
}

// Перевірка апгрейдів
function checkUpgradeAvailability() {
    upgrade1Button.disabled = score < upgrade1Cost;
    upgrade2Button.disabled = score < upgrade2Cost;
}

// Відновлення енергії
function rechargeEnergy() {
    if (currentEnergy < maxEnergy) {
        currentEnergy += energyRechargeRate;
        currentEnergy = Math.min(currentEnergy, maxEnergy);
        updateEnergyDisplay();
        savePlayerData();
    }
}

// Завантаження з Firestore
async function loadPlayerData() {
    if (!window.db) {
        console.error("Firestore не ініціалізований.");
        updateDisplay();
        return;
    }

    if (!telegramUserId) {
        telegramUserId = 'test_user_local';
        updateDisplay();
        return;
    }

    try {
        const doc = await window.db.collection("players").doc(telegramUserId).get();
        if (doc.exists) {
            const data = doc.data();
            score = data.score || 0;
            mainBalance = data.mainBalance || 0;
            clickPower = data.clickPower || 1;
            autoClickPower = data.autoClickPower || 0;
            upgrade1Cost = data.upgrade1Cost || 100;
            upgrade2Cost = data.upgrade2Cost || 500;
            currentEnergy = data.currentEnergy || maxEnergy;
        }

        startAutoClicker();
        startEnergyRecharge();
        updateDisplay();
    } catch (e) {
        console.error('Помилка завантаження:', e);
        updateDisplay();
    }
}

// Збереження в Firestore
async function savePlayerData() {
    if (!window.db || telegramUserId === 'test_user_local') return;

    try {
        await window.db.collection("players").doc(telegramUserId).set({
            score, mainBalance, clickPower, autoClickPower,
            upgrade1Cost, upgrade2Cost, currentEnergy
        });
    } catch (e) {
        console.error("Помилка збереження:", e);
    }
}

// Автоклік
function startAutoClicker() {
    if (autoClickInterval) clearInterval(autoClickInterval);
    if (autoClickPower > 0) {
        autoClickInterval = setInterval(() => {
            score += autoClickPower;
            updateDisplay();
            savePlayerData();
        }, 1000);
    }
}

// Відновлення енергії
function startEnergyRecharge() {
    if (energyRechargeInterval) clearInterval(energyRechargeInterval);
    energyRechargeInterval = setInterval(rechargeEnergy, energyRechargeIntervalTime);
}

// Прогрес завантаження
function startLoadingProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 99) progress = 99;
        progressBarFill.style.width = `${progress}%`;
        loadingText.textContent = `Завантаження... ${Math.floor(progress)}%`;
        if (progress === 99) {
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                loadPlayerData();
            }, 4000);
        }
    }, 50);
}

// Старт при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        setTimeout(() => tg.expand(), 100);

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            debugUserIdElement.textContent = "ID: " + telegramUserId;
        } else {
            debugUserIdElement.textContent = "ID: Недоступний (тест)";
        }
    } else {
        debugUserIdElement.textContent = "ID: API Telegram не знайдено";
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            loadPlayerData();
        }, 2000);
    }

    startLoadingProgress();

    // Обробник кліку
    clickButton.addEventListener('click', () => {
        if (currentEnergy > 0) {
            score += clickPower;
            currentEnergy--;
            updateDisplay();
            savePlayerData();
            try {
                coinClickSound.currentTime = 0;
                coinClickSound.play();
            } catch (e) {
                console.error("Помилка звуку:", e);
            }
        }
    });

    upgrade1Button.addEventListener('click', () => {
        if (score >= upgrade1Cost) {
            score -= upgrade1Cost;
            clickPower += 1;
            upgrade1Cost = Math.floor(upgrade1Cost * 1.5);
            updateDisplay();
            savePlayerData();
        }
    });

    upgrade2Button.addEventListener('click', () => {
        if (score >= upgrade2Cost) {
            score -= upgrade2Cost;
            autoClickPower += 1;
            upgrade2Cost = Math.floor(upgrade2Cost * 2);
            startAutoClicker();
            updateDisplay();
            savePlayerData();
        }
    });

    setInterval(savePlayerData, 5000);
});
