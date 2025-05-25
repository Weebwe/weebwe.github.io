// script.js

// --- Firebase Initialization START ---
// Це ваші конфігураційні дані Firebase.
// УВАГА: Публікація цих ключів у відкритому репозиторії GitHub НЕБЕЗПЕЧНА для реальних проектів.
// Використовуйте цей метод тільки для ТЕСТУВАННЯ, якщо ви розумієте ризики,
// або для приватних репозиторіїв.
// Для продакшену потрібні більш складні рішення (наприклад, функція Firebase, проксі-сервер).
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
// Використовуємо стару версію Firebase SDK для сумісності з 'firebase.firestore()'
// яка була вказана у вашому коді. Для нових версій використовується getFirestore().
firebaseAppScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"; // Останній актуальний CDN шлях для v8
firebaseAppScript.onload = () => {
    const firebaseFirestoreScript = document.createElement('script');
    firebaseFirestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"; // Останній актуальний CDN шлях для v8
    firebaseFirestoreScript.onload = () => {
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore(); // Використовуємо firebase.firestore() для Firebase SDK v8
        window.db = db; // Зробити доступним глобально

        console.log("Firebase Firestore initialized.");

        // Тепер, коли Firebase ініціалізовано, завантажуємо дані та запускаємо інтервали
        loadPlayerData(); // Цей виклик тепер безпечний
    };
    document.head.appendChild(firebaseFirestoreScript);
};
document.head.appendChild(firebaseAppScript);

// --- Firebase Initialization END ---

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
        console.error("Firestore не ініціалізований. (loadPlayerData)");
        updateDisplay();
        return;
    }

    if (!telegramUserId) {
        console.warn("Telegram User ID not available for load. Running in test mode.");
        telegramUserId = 'test_user_local'; // Встановлюємо тестовий ID, щоб гра не зупинялась
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
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
        }
        updateDisplay();

        // Запуск інтервалів ПІСЛЯ завантаження даних
        startAutoClicker();
        startEnergyRecharge();

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
    if (telegramUserId === 'test_user_local' || !telegramUserId) { // Перевірка на null також
        console.warn("Cannot save data: Telegram User ID is test ID or not available. Data will not be saved to Firestore.");
        return;
    }

    try {
        await window.db.collection("players").doc(telegramUserId).set({
            score, mainBalance, clickPower, autoClickPower,
            upgrade1Cost, upgrade2Cost, currentEnergy
        });
        // console.log("Player data saved for", telegramUserId); // Закоментовано для чистоти логів
    } catch (e) {
        console.error("Помилка збереження даних гравця:", e);
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
                // loadPlayerData() та інші інтервали тепер викликаються з Firebase onload
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
        setTimeout(() => tg.expand(), 100); // Розширюємо Web App на весь екран

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            debugUserIdElement.textContent = "ID: " + telegramUserId;
            console.log("Telegram User ID obtained:", telegramUserId);
        } else {
            console.warn("Telegram User ID not available from tg.initDataUnsafe.user.id.");
            debugUserIdElement.textContent = "ID: Недоступний (тест)";
        }
    } else {
        console.warn("Telegram Web App API not found. Please open in Telegram to get user ID.");
        debugUserIdElement.textContent = "ID: API Telegram не знайдено";
        // Для тестування без Telegram, показуємо гру
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            // loadPlayerData() та інші інтервали тепер викликаються зсередини Firebase onload, а не тут
        }, 2000);
    }

    startLoadingProgress(); // Запускаємо процес завантаження при старті

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
                console.error("Помилка відтворення звуку:", e);
            }
        } else {
            console.log("Енергія вичерпана!");
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
            startAutoClicker(); // Перезапускаємо автоклікер з новою потужністю
            updateDisplay();
            savePlayerData();
        }
    });

    setInterval(savePlayerData, 5000); // Автоматичне збереження кожні 5 секунд
});
