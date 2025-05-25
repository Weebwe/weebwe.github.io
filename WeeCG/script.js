// script.js

// --- Firebase Initialization START ---
// ... (цей блок залишається без змін) ...
// Зберігайте ваші реальні ключі тут
const firebaseConfig = {
  apiKey: "AIzaSyAt5GlmmqhW6IeDd3oFB0yq2xQARd8YPNs",
  authDomain: "weegamebot-7c44b.firebaseapp.com",
  databaseURL: "https://weegamebot-7c44b-default-rtdb.firebaseio.com",
  projectId: "weegamebot-7c44b",
  storageBucket: "weegamebot-7c44b.firebasestorage.app",
  messagingSenderId: "1052981895153",
  appId: "1:1052981895153:web:0c8426bf8e5b97729a6e50"
};

// Підключення Firebase SDK з CDN
const firebaseAppScript = document.createElement('script');
firebaseAppScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
firebaseAppScript.onload = () => {
    const firebaseFirestoreScript = document.createElement('script');
    firebaseFirestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";
    firebaseFirestoreScript.onload = () => {
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        window.db = db;

        console.log("Firebase Firestore initialized.");

        // loadPlayerData() тепер викликається зDOMContentLoaded після отримання Telegram ID
        // startAutoClicker() та startEnergyRecharge() будуть викликані з loadPlayerData()
    };
    document.head.appendChild(firebaseFirestoreScript);
};
document.head.appendChild(firebaseAppScript);

// --- Firebase Initialization END ---

// Отримання посилань на HTML-елементи
// ... (цей блок залишається без змін) ...
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
// const energyRechargeRate = 100; // Ця змінна більше не потрібна для щоденного поповнення
// const energyRechargeIntervalTime = 5000; // Ця змінна більше не потрібна

// НОВА ЗМІННА: Час останнього повного відновлення енергії
let lastEnergyRechargeTime = 0; // Зберігаємо як мілісекунди з початку епохи (timestamp)

let autoClickInterval;
// let energyRechargeInterval; // Цей інтервал більше не потрібен

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

// Перевірка апгрейдів (без змін)
function checkUpgradeAvailability() {
    upgrade1Button.disabled = score < upgrade1Cost;
    upgrade2Button.disabled = score < upgrade2Cost;
}

// ЗМІНЕНА функція відновлення енергії
function rechargeEnergyOncePerDay() {
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000; // 24 години в мілісекундах
    const currentTime = Date.now();

    // Якщо енергія не повна і минуло 24 години з останнього поповнення
    if (currentEnergy < maxEnergy && (currentTime - lastEnergyRechargeTime) >= twentyFourHoursInMs) {
        currentEnergy = maxEnergy; // Поповнюємо до максимуму
        lastEnergyRechargeTime = currentTime; // Оновлюємо час останнього повного поповнення
        updateEnergyDisplay();
        savePlayerData(); // Зберігаємо дані після поповнення
        console.log("Енергія повністю відновлена!");
    } else if (currentEnergy >= maxEnergy) {
        // Якщо енергія повна, просто оновлюємо час останнього повного поповнення,
        // щоб наступне поповнення було через 24 години від цього моменту.
        lastEnergyRechargeTime = currentTime;
        savePlayerData();
    }
}


// Завантаження з Firestore
async function loadPlayerData() {
    if (!window.db) {
        console.error("Firestore не ініціалізований. (loadPlayerData)");
        updateDisplay();
        return;
    }

    if (!telegramUserId) {
        console.warn("Telegram User ID not available for load. Running in test mode.");
        telegramUserId = 'test_user_local';
        updateDisplay();
        // Запускаємо автоклікер, навіть для тестового режиму, без Firestore
        startAutoClicker();
        return; // Виходимо, якщо немає реального ID
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
            // Зчитуємо час останнього поповнення з Firestore
            lastEnergyRechargeTime = data.lastEnergyRechargeTime || 0;
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            // Якщо нові гравці, встановлюємо початковий час поповнення на поточний момент
            lastEnergyRechargeTime = Date.now();
        }
        updateDisplay();

        // Запуск інтервалів ПІСЛЯ завантаження даних
        startAutoClicker();

        // ОДНОРАЗОВА ПЕРЕВІРКА ЕНЕРГІЇ ПРИ ЗАВАНТАЖЕННІ
        rechargeEnergyOncePerDay();

    } catch (e) {
        console.error('Помилка завантаження даних гравця:', e);
        updateDisplay();
    }
}

// Збереження в Firestore
async function savePlayerData() {
    if (!window.db) {
        console.warn("Firestore не ініціалізований. Збереження неможливе.");
        return;
    }
    if (telegramUserId === 'test_user_local' || !telegramUserId) {
        console.warn("Cannot save data: Telegram User ID is test ID or not available. Data will not be saved to Firestore.");
        return;
    }

    try {
        await window.db.collection("players").doc(telegramUserId).set({
            score, mainBalance, clickPower, autoClickPower,
            upgrade1Cost, upgrade2Cost, currentEnergy,
            lastEnergyRechargeTime // Зберігаємо час останнього поповнення
        }, { merge: true }); // Використовуємо merge, щоб не перезаписувати інші поля
        // console.log("Player data saved for", telegramUserId);
    } catch (e) {
        console.error("Помилка збереження даних гравця:", e);
    }
}

// Автоклік (без змін)
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

// ЦЯ ФУНКЦІЯ БІЛЬШЕ НЕ ПОТРІБНА ДЛЯ ЩОДЕННОГО ПОПОВНЕННЯ:
// function startEnergyRecharge() {
//     if (energyRechargeInterval) clearInterval(energyRechargeInterval);
//     energyRechargeInterval = setInterval(rechargeEnergy, energyRechargeIntervalTime);
// }

// Прогрес завантаження (без змін)
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
                // loadPlayerData() тепер викликається з DOMContentLoaded після отримання Telegram ID
            }, 4000);
        }
    }, 50);
}

// Старт при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізація Telegram Web App API та отримання ID користувача
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        setTimeout(() => tg.expand(), 100);

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            debugUserIdElement.textContent = "ID: " + telegramUserId;
            console.log("Telegram User ID obtained:", telegramUserId);
            loadPlayerData(); // Викликаємо loadPlayerData тут, після отримання Telegram ID
        } else {
            console.warn("Telegram User ID not available from tg.initDataUnsafe.user.id.");
            debugUserIdElement.textContent = "ID: Недоступний (тест)";
            loadPlayerData(); // Викликаємо loadPlayerData навіть для тестового режиму
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

    startLoadingProgress();

    // Обробник кліку
    clickButton.addEventListener('click', () => {
        if (currentEnergy > 0) {
            score += clickPower;
            currentEnergy--;
            updateDisplay();
            savePlayerData(); // Зберігаємо дані після кожного кліку

            try {
                coinClickSound.currentTime = 0;
                coinClickSound.play();
            } catch (e) {
                console.error("Помилка відтворення звуку:", e);
            }
        } else {
            console.log("Енергія вичерпана!");
            // Додайте візуальний фідбек, якщо енергія вичерпана
            // Наприклад, тимчасово змінюйте колір кнопки або показуйте повідомлення
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

    setInterval(savePlayerData, 5000); // Автоматичне збереження кожні 5 секунд
});
