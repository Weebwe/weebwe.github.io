// script.js - Оновлена версія для коректної роботи Firebase

// --- Firebase Initialization START ---
const firebaseConfig = {
  apiKey: "AIzaSyAt5GlmmqhW6IeDd3oFB0yq2xQARd8YPNs",
  authDomain: "weegamebot-7c44b.firebaseapp.com",
  databaseURL: "https://weegamebot-7c44b-default-rtdb.firebaseio.com",
  projectId: "weegamebot-7c44b",
  storageBucket: "weegamebot-7c44b.appspot.com", // Це має бути appspot.com
  messagingSenderId: "1052981895153",
  appId: "1:1052981895153:web:0c8426bf8e5b97729a6e50"
};

// Зробимо db глобальною змінною з самого початку
let db;

const firebaseAppScript = document.createElement('script');
firebaseAppScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
firebaseAppScript.onload = () => {
    const firebaseFirestoreScript = document.createElement('script');
    firebaseFirestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";
    firebaseFirestoreScript.onload = () => {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(); // Присвоюємо db до глобальної змінної
        // console.log("Firebase Firestore initialized:", db); // Для налагодження

        // Тепер, коли Firebase повністю ініціалізовано, ми готові завантажувати дані
        // Виклик loadPlayerData() перенесено сюди, щоб гарантувати, що db доступний
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

let currentEnergy = 100; // Змінено на 100
const maxEnergy = 100;    // Змінено на 100
let lastEnergyRechargeTime = 0;
let autoClickInterval;

const coinClickSound = new Audio('coin_click.mp3');
coinClickSound.volume = 0.5;

// --- UI Update ---
function updateDisplay() {
    scoreElement.textContent = Math.floor(score);
    mainBalanceElement.textContent = Math.floor(mainBalance);
    upgrade1CostElement.textContent = upgrade1Cost;
    upgrade2CostElement.textContent = upgrade2Cost;
    checkUpgradeAvailability();
    updateEnergyDisplay();
}

function updateEnergyDisplay() {
    const percentage = (currentEnergy / maxEnergy) * 100;
    energyBarFill.style.width = `${percentage}%`;
    const icon = currentEnergy <= 0 ? '🪫' : '🔋';
    energyText.textContent = `${icon} ${Math.floor(currentEnergy)} / ${maxEnergy}`;
    clickButton.disabled = currentEnergy <= 0;
    clickButton.style.opacity = currentEnergy <= 0 ? 0.7 : 1;
    clickButton.style.cursor = currentEnergy <= 0 ? 'not-allowed' : 'pointer';
}

function checkUpgradeAvailability() {
    upgrade1Button.disabled = score < upgrade1Cost;
    upgrade2Button.disabled = score < upgrade2Cost;
}

// --- Energy Recharge ---
function rechargeEnergyOncePerDay() {
    const now = Date.now();
    const fullDay = 24 * 60 * 60 * 1000;
    if (currentEnergy < maxEnergy && now - lastEnergyRechargeTime >= fullDay) {
        currentEnergy = maxEnergy;
        lastEnergyRechargeTime = now;
        updateEnergyDisplay();
        savePlayerData();
        console.log("Energy recharged.");
    } else if (currentEnergy >= maxEnergy) {
        lastEnergyRechargeTime = now;
        savePlayerData();
    }
}

// --- Firebase: Load & Save ---
async function loadPlayerData() {
    if (!db) { // Перевіряємо глобальну змінну db
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
        const doc = await db.collection("players").doc(telegramUserId).get(); // Використовуємо глобальну db
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
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            lastEnergyRechargeTime = Date.now(); // Для нового гравця встановлюємо поточний час
        }
        updateDisplay();
        startAutoClicker();
        rechargeEnergyOncePerDay();
    } catch (e) {
        console.error("Error loading player data:", e);
        updateDisplay();
    }
}

async function savePlayerData() {
    if (!db || !telegramUserId || telegramUserId === 'test_user_local') { // Перевіряємо глобальну змінну db
        // console.warn("Cannot save data: Firestore not initialized or Telegram User ID is test ID/not available.");
        return;
    }
    try {
        await db.collection("players").doc(telegramUserId).set({ // Використовуємо глобальну db
            score, mainBalance, clickPower, autoClickPower,
            upgrade1Cost, upgrade2Cost, currentEnergy,
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
                // initializeGameAfterFirebase() тепер викликає loadPlayerData()
            }, 4000);
        }
    }, 50);
}

// --- Main Game Initialization ---
// Ця функція викликається, коли Firebase повністю ініціалізовано
function initializeGameAfterFirebase() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        setTimeout(() => tg.expand(), 100);

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            debugUserIdElement.textContent = "ID: " + telegramUserId;
            console.log("Telegram User ID obtained:", telegramUserId);
            loadPlayerData(); // Викликаємо loadPlayerData ТУТ
        } else {
            console.warn("Telegram User ID not available from tg.initDataUnsafe.user.id.");
            debugUserIdElement.textContent = "ID: Недоступний (тест)";
            loadPlayerData(); // Викликаємо loadPlayerData для тестового режиму
        }
    } else {
        console.warn("Telegram Web App API not found. Please open in Telegram to get user ID.");
        debugUserIdElement.textContent = "ID: API Telegram не знайдено";
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            loadPlayerData(); // Викликаємо loadPlayerData для тестового режиму
        }, 2000);
    }
}


// --- Event Listeners and Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    // startLoadingProgress() має бути викликана раніше,
    // щоб екран завантаження відображався
    startLoadingProgress();

    // Click handler
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
            gameScreen.appendChild(floatingText);
            floatingText.addEventListener('animationend', () => {
                floatingText.remove();
            });
        } else {
            console.log("Energy depleted.");
            // Тут можна додати візуальний фідбек для вичерпаної енергії,
            // наприклад, показати спливаюче повідомлення "Енергія вичерпана!"
        }
    });

    // Upgrade buttons
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

    // Autosave
    setInterval(savePlayerData, 5000);
});
