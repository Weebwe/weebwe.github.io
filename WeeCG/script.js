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

let db; // Глобальна змінна для Firebase Firestore
let firebaseInitialized = false; // Флаг стану ініціалізації Firebase

/**
 * Асинхронно завантажує Firebase SDK та ініціалізує додаток.
 * Повертає Promise, який резолвиться після успішної ініціалізації.
 */
const loadFirebaseSDK = () => {
    return new Promise((resolve, reject) => {
        // Перевіряємо, чи Firebase вже завантажений, щоб уникнути повторного завантаження
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            db = firebase.firestore();
            firebaseInitialized = true;
            console.log("Firebase SDK already loaded and initialized.");
            return resolve();
        }

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
                    console.log("Firebase Firestore initialized successfully.");
                    resolve();
                } catch (e) {
                    console.error("Error initializing Firebase:", e);
                    reject(e);
                }
            };
            firebaseFirestoreScript.onerror = () => {
                console.error("Failed to load firebase-firestore.js");
                reject(new Error("Failed to load firebase-firestore.js"));
            };
            document.head.appendChild(firebaseFirestoreScript);
        };
        firebaseAppScript.onerror = () => {
            console.error("Failed to load firebase-app.js");
            reject(new Error("Failed to load firebase-app.js"));
        };
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

const mainBalanceElement = document.getElementById('mainBalance'); // Для WEE Balance
const energyBarFill = document.getElementById('energyBarFill');
const energyText = document.getElementById('energyText');

// --- Game Variables ---
let score = 0;
let mainBalance = 0; // Це WEE Balance
let clickPower = 1;
let autoClickPower = 0;
let upgrade1Cost = 100;
let upgrade2Cost = 500;
let telegramUserId = null; // Буде встановлено з Telegram Web App

const MAX_ENERGY = 100;
let currentEnergy = MAX_ENERGY;
let lastEnergyRechargeTime = 0; // Unix timestamp
let autoClickInterval = null;

const coinClickSound = new Audio('coin_click.mp3'); 
coinClickSound.volume = 0.5;

// --- UI Update ---
function updateDisplay() {
    scoreElement.textContent = Math.floor(score).toLocaleString();
    mainBalanceElement.textContent = parseFloat(mainBalance).toFixed(2);
    upgrade1CostElement.textContent = Math.floor(upgrade1Cost).toLocaleString();
    upgrade2CostElement.textContent = Math.floor(upgrade2Cost).toLocaleString();
    checkUpgradeAvailability();
    updateEnergyDisplay();
}

function updateEnergyDisplay() {
    const percentage = (currentEnergy / MAX_ENERGY) * 100;
    energyBarFill.style.width = `${percentage}%`;
    const icon = currentEnergy <= 0 ? '🪫' : '🔋';
    energyText.textContent = `${icon} ${Math.floor(currentEnergy)} / ${MAX_ENERGY}`;

    // Візуальний фідбек при вичерпанні енергії
    if (currentEnergy <= 0) {
        clickButton.disabled = true;
        clickButton.classList.add('no-energy');
    } else {
        clickButton.disabled = false;
        clickButton.classList.remove('no-energy');
    }
}

function checkUpgradeAvailability() {
    upgrade1Button.disabled = score < upgrade1Cost;
    upgrade2Button.disabled = score < upgrade2Cost;
}

// --- Energy Recharge Logic ---
function rechargeEnergyLogic() {
    const now = Date.now();
    const fullDay = 24 * 60 * 60 * 1000; // 24 години в мілісекундах

    if (currentEnergy < MAX_ENERGY && (now - lastEnergyRechargeTime) >= fullDay) {
        currentEnergy = MAX_ENERGY;
        lastEnergyRechargeTime = now;
        updateEnergyDisplay();
        savePlayerData();
        console.log("Energy recharged to max.");
    } else if (currentEnergy === MAX_ENERGY) {
        // Якщо енергія вже повна, оновлюємо час, щоб наступний відлік був коректним
        lastEnergyRechargeTime = now;
        savePlayerData();
    }
}

// --- Firebase: Load & Save Player Data ---
async function loadPlayerData() {
    console.log("Attempting to load player data...");
    if (!firebaseInitialized || !db) {
        console.error("Firestore not initialized or Firebase not ready. Cannot load player data.");
        // Показуємо гру з початковими даними, якщо Firebase недоступний
        telegramUserId = 'test_user_local'; // Встановлюємо тестовий ID, щоб гра запустилася
        debugUserIdElement.textContent = "ID: Недоступний (локальний тест)";
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic();
        hideLoadingScreen();
        return;
    }

    if (!telegramUserId) {
        console.warn("Telegram User ID not available for load. Running in test mode.");
        telegramUserId = 'test_user_local'; // Встановлюємо тестовий ID для розробки
        debugUserIdElement.textContent = "ID: Недоступний (локальний тест)";
    } else {
        debugUserIdElement.textContent = "ID: " + telegramUserId;
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
            currentEnergy = data.currentEnergy || MAX_ENERGY;
            lastEnergyRechargeTime = data.lastEnergyRechargeTime || Date.now(); // Якщо немає, встановлюємо зараз
            console.log("Player data loaded for", telegramUserId, ":", data);
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            lastEnergyRechargeTime = Date.now(); // Для нового гравця встановлюємо поточний час
        }
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic(); // Застосовуємо логіку перезарядки після завантаження/ініціалізації даних
    } catch (e) {
        console.error("Error loading player data:", e);
        // Якщо помилка завантаження, все одно показуємо гру з початковими даними
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic();
    } finally {
        hideLoadingScreen(); // Завжди приховуємо екран завантаження після спроби завантаження даних
    }
}

async function savePlayerData() {
    // Зберігаємо дані тільки якщо Firebase ініціалізований і є реальний telegramUserId
    if (!firebaseInitialized || !db || !telegramUserId || telegramUserId === 'test_user_local') {
        // console.warn("Cannot save data: Firestore not initialized or Telegram User ID is test ID/not available.");
        return;
    }
    try {
        await db.collection("players").doc(telegramUserId).set({
            score: Math.floor(score),
            mainBalance: parseFloat(mainBalance.toFixed(2)),
            clickPower,
            autoClickPower,
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
    if (autoClickInterval) clearInterval(autoClickInterval); // Очищаємо попередній інтервал
    if (autoClickPower > 0) {
        autoClickInterval = setInterval(() => {
            score += autoClickPower;
            updateDisplay();
        }, 1000); // Кожну секунду
    }
}

// --- Loading Screen Logic ---
function startLoadingProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 5; // Невеликий випадковий приріст для "живості"
        if (progress > 95) progress = 95; // Максимум 95%, щоб останні 5% дочекалися Firebase
        progressBarFill.style.width = `${progress}%`;
        loadingText.textContent = `Завантаження... ${Math.floor(progress)}%`;

        if (progress >= 95 && firebaseInitialized) {
            clearInterval(interval);
            // Прогрес зупиняється на 95%, решта 5% чекає на initializeGameAfterFirebase()
        }
    }, 50);
}

function hideLoadingScreen() {
    console.log("Hiding loading screen and showing game screen.");
    loadingScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}


// --- Main Game Initialization After DOM and Firebase Ready ---
async function initializeGame() {
    console.log("Initializing game...");

    // 1. Ініціалізація Telegram Web App API
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        setTimeout(() => tg.expand(), 100); // Розширюємо Web App

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            console.log("Telegram User ID obtained:", telegramUserId);
        } else {
            console.warn("Telegram User ID not available from tg.initDataUnsafe.user.id. Running in test mode.");
        }
    } else {
        console.warn("Telegram Web App API not found. Please open in Telegram for full functionality.");
    }

    // 2. Завантаження даних гравця (відбувається після ініціалізації Firebase)
    await loadPlayerData();
}


// --- Event Listeners and Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded.");

    // Запускаємо анімацію прогрес-бару одразу
    startLoadingProgress();

    // Завантажуємо Firebase SDK, а потім ініціалізуємо гру
    loadFirebaseSDK()
        .then(() => {
            console.log("Firebase SDK loaded, proceeding with game initialization.");
            initializeGame();
        })
        .catch(error => {
            console.error("Failed to load Firebase SDK or initialize game:", error);
            loadingText.textContent = "Помилка завантаження гри. Спробуйте пізніше.";
            progressBarFill.style.width = '0%';
            // Якщо Firebase не завантажився, показуємо гру в тестовому режимі
            telegramUserId = 'test_user_local';
            debugUserIdElement.textContent = "ID: Помилка Firebase (локальний тест)";
            updateDisplay();
            startAutoClicker();
            rechargeEnergyLogic();
            hideLoadingScreen(); // Приховуємо екран завантаження, навіть якщо Firebase не працює
        });

    // --- Click handler ---
    clickButton.addEventListener('click', (event) => {
        if (currentEnergy > 0) {
            score += clickPower;
            currentEnergy--;
            updateDisplay();
            savePlayerData(); // Зберігаємо дані після кожного кліку

            try {
                coinClickSound.currentTime = 0;
                coinClickSound.play();
            } catch (e) {
                console.error("Sound error:", e);
            }

            const floatingText = document.createElement('div');
            floatingText.classList.add('floating-text');
            floatingText.textContent = `+${clickPower}`;
            floatingText.style.left = `${event.clientX}px`;
            floatingText.style.top = `${event.clientY - 20}px`;
            gameScreen.appendChild(floatingText); // Додаємо до gameScreen, щоб була правильна позиція
            floatingText.addEventListener('animationend', () => {
                floatingText.remove();
            });
        } else {
            console.log("Energy depleted.");
            // Клас 'no-energy' вже додається/видаляється в updateEnergyDisplay
        }
    });

    // --- Upgrade buttons ---
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
            startAutoClicker(); // Перезапускаємо автоклікер, щоб оновити швидкість
            updateDisplay();
            savePlayerData();
        }
    });

    // --- Autosave ---
    // Зберігаємо дані кожні 5 секунд для синхронізації з Firebase
    setInterval(savePlayerData, 5000);
});

/*
    Вам також потрібно додати ці стилі до вашого CSS файлу, якщо їх там ще немає:

    .floating-text {
        position: absolute;
        font-size: 1.5em;
        font-weight: bold;
        color: #0094FE; // Використано ваш корпоративний колір
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        opacity: 0;
        animation: floatUp 1s forwards;
        pointer-events: none; // Щоб не блокувати кліки
        z-index: 100;
        white-space: nowrap; // Щоб текст не переносився
    }

    @keyframes floatUp {
        from {
            transform: translateY(0) scale(1);
            opacity: 1;
        }
        to {
            transform: translateY(-50px) scale(1.2);
            opacity: 0;
        }
    }

    .no-energy {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        transform: translate3d(0, 0, 0);
        backface-visibility: hidden;
        perspective: 1000px;
    }

    @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
    }
*/
    
