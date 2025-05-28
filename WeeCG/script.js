// script.js - Фінальна версія з коректним відновленням енергії та таймером

// --- Firebase Initialization START ---
const firebaseConfig = {
  apiKey: "AIzaSyAt5GlmmqhW6IeDd3oFB0yq2xQARd8YPNs",
  authDomain: "weegamebot-7c44b.firebaseapp.com",
  databaseURL: "https://weegamebot-7c44b-default-rtdb.firebaseio.com",
  projectId: "weegamebot-7c44b",
  storageBucket: "weegamebot-7c44b.appspot.com",
  messagingSenderId: "1052981895153",
  appId: "1:1052981895153:web:0c8426bf8e5b97729a6e50"
};

let db;

const firebaseAppScript = document.createElement('script');
firebaseAppScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
firebaseAppScript.onload = () => {
    const firebaseFirestoreScript = document.createElement('script');
    firebaseFirestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";
    firebaseFirestoreScript.onload = () => {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase Firestore initialized.");
        initializeGameAfterFirebase();
    };
    document.head.appendChild(firebaseFirestoreScript);
};
document.head.appendChild(firebaseAppScript);
// --- Firebase Initialization END ---

// --- DOM Elements ---
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

// --- Game Variables ---
let score = 0;
let mainBalance = 0;
let clickPower = 1;
let autoClickPower = 0;
let upgrade1Cost = 100;
let upgrade2Cost = 500;
let telegramUserId = null;

let currentEnergy = 100;
const maxEnergy = 100;
// lastEnergyZeroTime: час, коли енергія ВОСТАННЄ стала 0.
// Якщо енергія повна, це значення має бути 0 або null.
let lastEnergyZeroTime = 0;
let autoClickInterval;
let rechargeTimerInterval; // Змінна для інтервалу таймера

const coinClickSound = new Audio('coin_click.mp3');
coinClickSound.volume = 0.5;

// --- UI Update ---
function updateDisplay() {
    scoreElement.textContent = Math.floor(score);
    mainBalanceElement.textContent = Math.floor(mainBalance);
    upgrade1CostElement.textContent = upgrade1Cost;
    upgrade2CostElement.textContent = upgrade2Cost;
    checkUpgradeAvailability();
    updateEnergyDisplay(); // Ця функція тепер вирішує, що показувати
}

function updateEnergyDisplay() {
    const percentage = (currentEnergy / maxEnergy) * 100;
    energyBarFill.style.width = `${percentage}%`;

    clickButton.disabled = currentEnergy <= 0;
    clickButton.style.opacity = currentEnergy <= 0 ? 0.7 : 1;
    clickButton.style.cursor = currentEnergy <= 0 ? 'not-allowed' : 'pointer';

    if (currentEnergy === 0) {
        // Якщо енергія 0, показуємо таймер
        startRechargeTimerDisplay();
    } else {
        // Якщо енергія не 0, показуємо звичайний текст і зупиняємо таймер
        if (rechargeTimerInterval) {
            clearInterval(rechargeTimerInterval);
            rechargeTimerInterval = null;
        }
        energyText.textContent = `🔋 ${Math.floor(currentEnergy)} / ${maxEnergy}`;
    }
}

// НОВА ФУНКЦІЯ: оновлення відображення таймера відновлення
function updateRechargeTimerDisplay() {
    const now = Date.now();
    const fullDayInMs = 24 * 60 * 60 * 1000;
    const timePassedSinceZero = now - lastEnergyZeroTime;
    const timeLeftMs = fullDayInMs - timePassedSinceZero;

    if (timeLeftMs <= 0) {
        // Якщо час минув, спробуємо відновити енергію
        rechargeEnergyOncePerDay(); // Ця функція перевірить, чи можна відновити
        if (currentEnergy === maxEnergy) {
            // Якщо енергія відновилася, зупиняємо таймер
            if (rechargeTimerInterval) {
                clearInterval(rechargeTimerInterval);
                rechargeTimerInterval = null;
            }
            energyText.textContent = `🔋 ${Math.floor(currentEnergy)} / ${maxEnergy}`;
            return;
        }
    }

    // Якщо енергія ще не відновилася, показуємо відлік
    const displayHours = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const displayMinutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    const displaySeconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

    energyText.textContent = `⏳ ${displayHours}г ${String(displayMinutes).padStart(2, '0')}хв ${String(displaySeconds).padStart(2, '0')}с`;
}

// Функція для запуску інтервалу відображення таймера
function startRechargeTimerDisplay() {
    if (!rechargeTimerInterval) {
        // Запускаємо оновлення таймера кожну секунду
        rechargeTimerInterval = setInterval(updateRechargeTimerDisplay, 1000);
        updateRechargeTimerDisplay(); // Викликаємо одразу, щоб уникнути затримки
    }
}


function checkUpgradeAvailability() {
    upgrade1Button.disabled = score < upgrade1Cost;
    upgrade2Button.disabled = score < upgrade2Cost;
}

// --- Energy Recharge Logic (ОНОВЛЕНО) ---
function rechargeEnergyOncePerDay() {
    const now = Date.now();
    const fullDayInMs = 24 * 60 * 60 * 1000;

    // Енергія відновлюється, тільки якщо вона ДОСЯГЛА 0 І пройшло 24 години
    if (currentEnergy === 0 && (now - lastEnergyZeroTime >= fullDayInMs)) {
        currentEnergy = maxEnergy; // Повне відновлення
        // lastEnergyZeroTime залишається на значенні, коли енергія стала 0,
        // це важливо, якщо в майбутньому знадобиться знати, коли вона була *відновлена*.
        // Для вашої поточної логіки (24 год. після 0) її не потрібно оновлювати тут.
        updateDisplay(); // Оновлюємо дисплей, який перемкнеться з таймера на повну енергію
        savePlayerData();
        console.log("Energy fully recharged after 24 hours of being 0.");
        // Тут можна додати спливаюче повідомлення "Енергія відновлена!"
    }
    // Всі інші випадки обробляються функцією updateRechargeTimerDisplay
}

// --- Firebase: Load & Save ---
async function loadPlayerData() {
    if (!db) {
        console.error("Firestore not initialized yet. Cannot load player data.");
        return;
    }
    if (!telegramUserId) {
        telegramUserId = 'test_user_local';
        console.warn("Telegram User ID not available for load. Running in test mode.");
        updateDisplay();
        startAutoClicker();
        return;
    }

    try {
        const doc = await db.collection("players").doc(telegramUserId).get();
        if (doc.exists) {
            const data = doc.data();
            score = data.score || 0;
            mainBalance = data.mainBalance || 0;
            clickPower = data.clickPower || 1;
            autoClickPower = data.autoClickPower || 0;
            upgrade1Cost = data.upgrade1Cost || 100;
            upgrade2Cost = data.upgrade2Cost || 500;
            currentEnergy = data.currentEnergy !== undefined ? data.currentEnergy : maxEnergy;
            
            // Завантажуємо lastEnergyZeroTime. Важливо: якщо енергія НЕ 0,
            // lastEnergyZeroTime має бути 0 або null, щоб таймер не відображався.
            // Якщо енергія 0, а часу немає, встановлюємо зараз, щоб почати відлік.
            lastEnergyZeroTime = data.lastEnergyZeroTime || 0; // Завантажуємо
            if (currentEnergy === 0 && !lastEnergyZeroTime) {
                lastEnergyZeroTime = Date.now(); // Якщо енергія 0, але час не був збережений
            }


        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            // Для нового гравця енергія повна, тому lastEnergyZeroTime = 0
            lastEnergyZeroTime = 0;
        }
        updateDisplay(); // Оновлюємо дисплей, що запустить таймер, якщо потрібно
        startAutoClicker();
        rechargeEnergyOncePerDay(); // Перевіряємо, чи можна вже відновити енергію
    } catch (e) {
        console.error("Error loading player data:", e);
        updateDisplay();
    }
}

async function savePlayerData() {
    if (!db || !telegramUserId || telegramUserId === 'test_user_local') {
        return;
    }
    try {
        await db.collection("players").doc(telegramUserId).set({
            score, mainBalance, clickPower, autoClickPower,
            upgrade1Cost, upgrade2Cost, currentEnergy,
            lastEnergyZeroTime // Зберігаємо lastEnergyZeroTime
        }, { merge: true });
    } catch (e) {
        console.error("Error saving player data:", e);
    }
}

// --- Autoclicker ---
function startAutoClicker() {
    if (autoClickInterval) clearInterval(autoClickInterval);
    if (autoClickPower > 0) {
        autoClickInterval = setInterval(() => {
            score += autoClickPower;
            updateDisplay();
            if (telegramUserId !== 'test_user_local') {
                savePlayerData();
            }
        }, 1000);
    }
}

// --- Loading Screen ---
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
            }, 4000);
        }
    }, 50);
}


// --- Main Game Initialization Logic ---
function initializeGameAfterFirebase() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        setTimeout(() => tg.expand(), 100);

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            debugUserIdElement.textContent = "ID: " + telegramUserId;
            console.log("Telegram User ID obtained:", telegramUserId);
            loadPlayerData();
        } else {
            console.warn("Telegram User ID not available from tg.initDataUnsafe.user.id.");
            debugUserIdElement.textContent = "ID: Недоступний (тест)";
            loadPlayerData();
        }
    } else {
        console.warn("Telegram Web App API not found. Please open in Telegram to get user ID.");
        debugUserIdElement.textContent = "ID: API Telegram не знайдено";
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            loadPlayerData();
        }, 2000);
    }
}


// --- Event Listeners and Initial Setup (ОНОВЛЕНО clickButton.addEventListener) ---
document.addEventListener('DOMContentLoaded', () => {
    startLoadingProgress();

    // Click handler for the main coin
    clickButton.addEventListener('click', (event) => {
        if (currentEnergy > 0) {
            score += clickPower;
            currentEnergy--;
            
            // НОВЕ: Якщо енергія щойно стала 0, фіксуємо цей час
            if (currentEnergy === 0) {
                lastEnergyZeroTime = Date.now();
                console.log("Energy hit 0. Recording time:", lastEnergyZeroTime);
            }
            updateDisplay(); // updateDisplay викличе updateEnergyDisplay, яка запустить таймер
            savePlayerData(); // Зберігаємо дані після кожного кліку

            try {
                coinClickSound.currentTime = 0;
                coinClickSound.play();
            } catch (e) {
                console.error("Sound error:", e);
            }

            // Floating text effect
            const floatingText = document.createElement('div');
            floatingText.classList.add('floating-text');
            floatingText.textContent = `+${clickPower}`;
            floatingText.style.left = `${event.clientX}px`;
            floatingText.style.top = `${event.clientY - 20}px`;
            gameScreen.appendChild(floatingText);
            floatingText.addEventListener('animationend', () => {
                floatingText.remove();
            });
        } else {
            console.log("Energy depleted. Cannot click.");
            // Тут можна додати візуальний фідбек "Енергія вичерпана!"
        }
    });

    // Upgrade buttons (без змін)
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
          
