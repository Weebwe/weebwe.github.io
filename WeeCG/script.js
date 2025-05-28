// script.js - Оновлена версія для коректної роботи Firebase та логіки гри

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

// Зробимо db глобальною змінною
let db;
let firebaseInitialized = false; // Флаг, щоб відстежувати ініціалізацію Firebase

// Завантажуємо Firebase SDK
const loadFirebaseSDK = () => {
    return new Promise((resolve, reject) => {
        const firebaseAppScript = document.createElement('script');
        firebaseAppScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
        firebaseAppScript.onload = () => {
            const firebaseFirestoreScript = document.createElement('script');
            firebaseFirestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";
            firebaseFirestoreScript.onload = () => {
                try {
                    const app = firebase.initializeApp(firebaseConfig);
                    db = firebase.firestore();
                    firebaseInitialized = true;
                    // console.log("Firebase Firestore initialized.");
                    resolve();
                } catch (e) {
                    console.error("Error initializing Firebase:", e);
                    reject(e);
                }
            };
            firebaseFirestoreScript.onerror = reject;
            document.head.appendChild(firebaseFirestoreScript);
        };
        firebaseAppScript.onerror = reject;
        document.head.appendChild(firebaseAppScript);
    });
};
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
let mainBalance = 0; // Це WEE Balance
let clickPower = 1;
let autoClickPower = 0;
let upgrade1Cost = 100;
let upgrade2Cost = 500;
let telegramUserId = null;

let currentEnergy = 100;
const maxEnergy = 100;
let lastEnergyRechargeTime = 0; // Unix timestamp
let autoClickInterval = null; // Змінено на null для чіткості

const coinClickSound = new Audio('coin_click.mp3'); // Переконайтесь, що шлях до файлу правильний
coinClickSound.volume = 0.5;

// --- UI Update ---
function updateDisplay() {
    scoreElement.textContent = Math.floor(score).toLocaleString(); // Форматуємо для читабельності
    mainBalanceElement.textContent = parseFloat(mainBalance).toFixed(2); // WEE Balance, 2 знаки після коми
    upgrade1CostElement.textContent = Math.floor(upgrade1Cost).toLocaleString();
    upgrade2CostElement.textContent = Math.floor(upgrade2Cost).toLocaleString();
    checkUpgradeAvailability();
    updateEnergyDisplay();
}

function updateEnergyDisplay() {
    const percentage = (currentEnergy / maxEnergy) * 100;
    energyBarFill.style.width = `${percentage}%`;
    const icon = currentEnergy <= 0 ? '🪫' : '🔋';
    energyText.textContent = `${icon} ${Math.floor(currentEnergy)} / ${maxEnergy}`;

    // Додаємо візуальний фідбек при вичерпанні енергії
    if (currentEnergy <= 0) {
        clickButton.disabled = true;
        clickButton.classList.add('no-energy'); // Додаємо клас для анімації/стилю
    } else {
        clickButton.disabled = false;
        clickButton.classList.remove('no-energy');
    }
}

function checkUpgradeAvailability() {
    upgrade1Button.disabled = score < upgrade1Cost;
    upgrade2Button.disabled = score < upgrade2Cost;
}

// --- Energy Recharge ---
// Енергія відновлюється до максимуму, якщо пройшло більше 24 годин
function rechargeEnergyLogic() {
    const now = Date.now();
    const fullDay = 24 * 60 * 60 * 1000; // 24 години в мілісекундах

    // Якщо енергії менше максимуму І пройшло більше доби з останнього повного перезарядження/збереження часу
    if (currentEnergy < maxEnergy && (now - lastEnergyRechargeTime) >= fullDay) {
        currentEnergy = maxEnergy;
        lastEnergyRechargeTime = now; // Оновлюємо час останнього перезарядження
        updateEnergyDisplay();
        savePlayerData();
        console.log("Energy recharged to max.");
    } else if (currentEnergy === maxEnergy) {
        // Якщо енергія вже повна, просто оновлюємо час останнього перезарядження.
        // Це важливо для коректного відліку наступних 24 годин, якщо гравець довго не заходив.
        lastEnergyRechargeTime = now;
        savePlayerData();
    }
    // Якщо енергії менше max, але 24 години ще не пройшли, нічого не робимо (чекаємо реген)
}

// --- Firebase: Load & Save ---
async function loadPlayerData() {
    if (!firebaseInitialized || !db) {
        console.error("Firestore not initialized yet. Cannot load player data.");
        // Можливо, тут варто додати затримку і спробувати знову,
        // або показати повідомлення користувачеві.
        return;
    }
    if (!telegramUserId) {
        // Це буде тільки в режимі розробки поза Telegram Web App
        telegramUserId = 'test_user_local';
        console.warn("Telegram User ID not available. Running in test mode.");
        debugUserIdElement.textContent = "ID: Недоступний (тест)";
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic(); // Викликаємо логіку перезарядки для тестового користувача
        // Приховуємо екран завантаження після завантаження тестових даних
        loadingScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
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
            currentEnergy = data.currentEnergy || maxEnergy;
            lastEnergyRechargeTime = data.lastEnergyRechargeTime || Date.now();
            console.log("Player data loaded for", telegramUserId);
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            lastEnergyRechargeTime = Date.now(); // Для нового гравця встановлюємо поточний час
        }
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic(); // Застосовуємо логіку перезарядки після завантаження даних
    } catch (e) {
        console.error("Error loading player data:", e);
        // Якщо помилка завантаження, все одно показуємо гру з початковими даними
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic();
    } finally {
        // Приховуємо екран завантаження лише після спроби завантаження даних
        loadingScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    }
}

async function savePlayerData() {
    // Зберігаємо дані тільки якщо Firebase ініціалізований і є реальний telegramUserId
    if (!firebaseInitialized || !db || !telegramUserId || telegramUserId === 'test_user_local') {
        return;
    }
    try {
        await db.collection("players").doc(telegramUserId).set({
            score: Math.floor(score), // Зберігаємо ціле число
            mainBalance: parseFloat(mainBalance.toFixed(2)), // Зберігаємо з фіксованою точністю
            clickPower, autoClickPower,
            upgrade1Cost: Math.floor(upgrade1Cost),
            upgrade2Cost: Math.floor(upgrade2Cost),
            currentEnergy: Math.floor(currentEnergy),
            lastEnergyRechargeTime
        }, { merge: true });
        // console.log("Player data saved for", telegramUserId);
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
            // Зберігаємо дані тут, тільки якщо це не тестовий користувач
            // Додамо затримку, щоб не зберігати надто часто від автоклікера
            // або покладаємося на загальний setInterval(savePlayerData, 5000);
        }, 1000); // Кожну секунду
    }
}

// --- Loading Screen ---
function startLoadingProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 5; // Невеликий випадковий приріст для "живості"
        if (progress > 95) progress = 95; // Максимум 95%, щоб останні 5% дочекалися Firebase
        progressBarFill.style.width = `${progress}%`;
        loadingText.textContent = `Завантаження... ${Math.floor(progress)}%`;

        if (progress >= 95 && firebaseInitialized) { // Чекаємо Firebase
            clearInterval(interval);
            // Далі перехід на ігровий екран відбудеться після завантаження даних в initializeGameAfterFirebase()
        }
    }, 50);
}

// --- Main Game Initialization ---
// Ця функція викликається, коли Firebase повністю ініціалізовано
async function initializeGameAfterFirebase() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        // Якщо MainButton потрібна, то додайте її сюди
        // tg.MainButton.setText("Грати");
        // tg.MainButton.show();
        // tg.MainButton.onClick(() => { /* ваша логіка */ });

        setTimeout(() => tg.expand(), 100); // Розширюємо Web App

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            debugUserIdElement.textContent = "ID: " + telegramUserId;
            // console.log("Telegram User ID obtained:", telegramUserId);
        
