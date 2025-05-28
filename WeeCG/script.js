// script.js - Повна інтегрована версія з Firebase та додатковими сторінками

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

// --- DOM Elements (Game Screen) ---
const scoreElement = document.getElementById('score');
const clickButton = document.getElementById('clickButton');
const upgrade1Button = document.getElementById('upgrade1');
const upgrade1CostElement = document.getElementById('upgrade1Cost');
const upgrade2Button = document.getElementById('upgrade2');
const upgrade2CostElement = document.getElementById('upgrade2Cost');
const debugUserIdElement = document.getElementById('debugUserId'); // Для налагодження Telegram ID

const loadingScreen = document.getElementById('loading-screen');
const gameScreen = document.getElementById('game-screen');
const progressBarFill = document.getElementById('progressBarFill');
const loadingText = document.getElementById('loadingText');

const mainBalanceElement = document.getElementById('mainBalance'); // Для WEE Balance на головному екрані
const energyBarFill = document.getElementById('energyBarFill');
const energyText = document.getElementById('energyText');

// --- DOM Elements (Wallet Screen) ---
const walletScreen = document.getElementById('wallet-screen');
const weeBalanceDisplay = document.getElementById('weeBalance');
const walletCoinBalanceDisplay = document.getElementById('walletCoinBalance');
const exchangeAmountInput = document.getElementById('exchangeAmount');
const exchangeButton = document.getElementById('exchangeButton');

// --- DOM Elements (Leaderboard Screen) ---
const leaderboardScreen = document.getElementById('leaderboard-screen');
const leaderboardList = document.getElementById('leaderboardList');
const refreshLeaderboardButton = document.getElementById('refreshLeaderboard');

// --- DOM Elements (Tasks Screen) ---
const tasksScreen = document.getElementById('tasks-screen');
const tasksList = document.getElementById('tasksList');

// --- Bottom Navigation ---
const navItems = document.querySelectorAll('.nav-item');


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

const WEE_EXCHANGE_RATE = 1000000; // 1,000,000 монет = 1 WEE

const coinClickSound = new Audio('coin_click.mp3');
coinClickSound.volume = 0.5;

// --- Task Data (Defined locally, ideally would come from backend/Firebase config) ---
// Примітка: В реальному додатку список завдань може бути динамічним або завантажуватися з Firebase.
const allAvailableTasks = [
    { id: 'task1', name: "Привітання", description: "Підпишіться на наш Telegram-канал.", reward: "500 🪙", type: "coins", value: 500 },
    { id: 'task2', name: "Перша покупка", description: "Купіть будь-яке покращення.", reward: "0.5 WEE", type: "wee", value: 0.5 },
    { id: 'task3', name: "Запроси друга", description: "Запросіть одного друга в гру.", reward: "1.0 WEE", type: "wee", value: 1.0 },
    { id: 'task4', name: "Натисни 1000 разів", description: "Клікніть монету 1000 разів.", reward: "1000 🪙", type: "coins", value: 1000 },
    { id: 'task5', name: "Досягни 10000 монет", description: "Назбирайте 10000 монет.", reward: "0.1 WEE", type: "wee", value: 0.1 },
];
let playerTasksStatus = {}; // Зберігатиме { 'taskId': true/false }

// --- UI Update ---
function updateDisplay() {
    scoreElement.textContent = Math.floor(score).toLocaleString();
    mainBalanceElement.textContent = parseFloat(mainBalance).toFixed(2);
    upgrade1CostElement.textContent = Math.floor(upgrade1Cost).toLocaleString();
    upgrade2CostElement.textContent = Math.floor(upgrade2Cost).toLocaleString();
    checkUpgradeAvailability();
    updateEnergyDisplay();

    // Оновлення елементів Wallet Screen
    if (!walletScreen.classList.contains('hidden')) {
        weeBalanceDisplay.textContent = parseFloat(mainBalance).toFixed(2);
        walletCoinBalanceDisplay.textContent = Math.floor(score).toLocaleString();
    }
}

function updateEnergyDisplay() {
    const percentage = (currentEnergy / MAX_ENERGY) * 100;
    energyBarFill.style.width = `${percentage}%`;
    const icon = currentEnergy <= 0 ? '🪫' : '🔋';
    energyText.textContent = `${icon} ${Math.floor(currentEnergy)} / ${MAX_ENERGY}`;

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
    const fullDay = 24 * 60 * 60 * 1000;

    if (currentEnergy < MAX_ENERGY && (now - lastEnergyRechargeTime) >= fullDay) {
        currentEnergy = MAX_ENERGY;
        lastEnergyRechargeTime = now;
        updateEnergyDisplay();
        savePlayerData();
        console.log("Energy recharged to max.");
    } else if (currentEnergy === MAX_ENERGY) {
        lastEnergyRechargeTime = now;
        savePlayerData();
    }
}

// --- Firebase: Load & Save Player Data ---
async function loadPlayerData() {
    console.log("Attempting to load player data...");
    if (!firebaseInitialized || !db) {
        console.error("Firestore not initialized or Firebase not ready. Cannot load player data.");
        telegramUserId = 'test_user_local';
        debugUserIdElement.textContent = "ID: Недоступний (локальний тест)";
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic();
        hideLoadingScreen();
        return;
    }

    if (!telegramUserId) {
        console.warn("Telegram User ID not available for load. Running in test mode.");
        telegramUserId = 'test_user_local';
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
            lastEnergyRechargeTime = data.lastEnergyRechargeTime || Date.now();
            playerTasksStatus = data.tasks || {}; // Завантажуємо статус завдань
            console.log("Player data loaded for", telegramUserId, ":", data);
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            lastEnergyRechargeTime = Date.now();
            // Ініціалізуємо порожній статус завдань для нового гравця
            playerTasksStatus = {};
        }
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic();
    } catch (e) {
        console.error("Error loading player data:", e);
        updateDisplay();
        startAutoClicker();
        rechargeEnergyLogic();
    } finally {
        hideLoadingScreen();
    }
}

async function savePlayerData() {
    if (!firebaseInitialized || !db || !telegramUserId || telegramUserId === 'test_user_local') {
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
            lastEnergyRechargeTime,
            tasks: playerTasksStatus // Зберігаємо статус завдань
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
        }, 1000);
    }
}

// --- Loading Screen Logic ---
function startLoadingProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 95) progress = 95;
        progressBarFill.style.width = `${progress}%`;
        loadingText.textContent = `Завантаження... ${Math.floor(progress)}%`;

        if (progress >= 95 && firebaseInitialized) {
            clearInterval(interval);
        }
    }, 50);
}

function hideLoadingScreen() {
    console.log("Hiding loading screen and showing game screen.");
    loadingScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden'); // Показуємо початковий екран гри
}

// --- Wallet Screen Logic ---
exchangeButton.addEventListener('click', async () => {
    const amountToExchange = parseInt(exchangeAmountInput.value);

    if (isNaN(amountToExchange) || amountToExchange < WEE_EXCHANGE_RATE) {
        alert(`Будь ласка, введіть суму, більшу або рівну ${WEE_EXCHANGE_RATE.toLocaleString()} монет.`);
        return;
    }

    if (score >= amountToExchange) {
        const weeEarned = amountToExchange / WEE_EXCHANGE_RATE;
        score -= amountToExchange;
        mainBalance += weeEarned; // Оновлюємо WEE баланс

        alert(`Успішно обміняно ${amountToExchange.toLocaleString()} монет на ${weeEarned.toFixed(2)} WEE!`);
        exchangeAmountInput.value = ''; // Очищаємо поле вводу
        updateDisplay();
        savePlayerData(); // Зберігаємо оновлені баланси
    } else {
        alert('Недостатньо монет для обміну!');
    }
});

// --- Leaderboard Screen Logic ---
refreshLeaderboardButton.addEventListener('click', () => {
    fetchLeaderboardData();
});

async function fetchLeaderboardData() {
    leaderboardList.innerHTML = '<li style="text-align:center;">Завантаження лідерборду...</li>';
    if (!firebaseInitialized || !db) {
        leaderboardList.innerHTML = '<li style="text-align:center;">Помилка: Firebase не ініціалізовано.</li>';
        console.error("Cannot fetch leaderboard: Firebase not initialized.");
        return;
    }

    try {
        // Отримання топ-N гравців з Firebase, відсортованих за score
        // Примітка: Для великої кількості гравців таку операцію краще робити через Cloud Functions
        // або використовувати Firebase Realtime Database для лідербордів.
        // Також потрібні правила безпеки Firebase, які дозволяють читати "score" інших гравців.
        const playersRef = db.collection("players");
        const snapshot = await playersRef.orderBy("score", "desc").limit(20).get(); // Отримуємо топ-20

        const leaders = [];
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            // Виключаємо тестових користувачів з лідерборду, якщо це не потрібно
            if (doc.id === 'test_user_local') return;

            // Можна додати ім'я користувача, якщо воно зберігається в даних про гравця,
            // інакше використовуємо ID або просто "Гравець N"
            let playerName = data.name || `Гравець ${rank}`;
            if (doc.id === telegramUserId) {
                playerName = "Ви"; // Позначаємо поточного гравця
            }

            leaders.push({
                rank: rank++,
                name: playerName,
                score: data.score || 0
            });
        });
        displayLeaderboard(leaders);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardList.innerHTML = '<li style="text-align:center;">Не вдалося завантажити лідерборд.</li>';
    }
}

function displayLeaderboard(leaders) {
    leaderboardList.innerHTML = '';
    if (leaders.length === 0) {
        leaderboardList.innerHTML = '<li style="text-align:center;">Лідерборд порожній.</li>';
        return;
    }
    leaders.forEach(leader => {
        const li = document.createElement('li');
        li.classList.add('leaderboard-item');
        // Додаємо клас 'current-player' для виділення поточного гравця
        if (leader.name === "Ви") {
            li.classList.add('current-player');
        }
        li.innerHTML = `
            <span class="rank">${leader.rank}.</span>
            <span class="name">${leader.name}</span>
            <span class="score">${leader.score.toLocaleString()} 🪙</span>
        `;
        leaderboardList.appendChild(li);
    });
}

// --- Tasks Screen Logic ---
async function fetchTasksData() {
    tasksList.innerHTML = '<li style="text-align:center;">Завантаження завдань...</li>';
    if (!firebaseInitialized || !db) {
        tasksList.innerHTML = '<li style="text-align:center;">Помилка: Firebase не ініціалізовано.</li>';
        console.error("Cannot fetch tasks: Firebase not initialized.");
        return;
    }

    // Отримуємо поточний статус завдань користувача з playerTasksStatus, який завантажується з Firebase
    const tasksToDisplay = allAvailableTasks.map(task => ({
        ...task,
        completed: playerTasksStatus[task.id] === true
    }));
    displayTasks(tasksToDisplay);
}

function displayTasks(tasks) {
    tasksList.innerHTML = '';
    if (tasks.length === 0) {
        tasksList.innerHTML = '<li style="text-align:center;">Наразі немає доступних завдань.</li>';
        return;
    }
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.classList.add('task-item');
        li.innerHTML = `
            <h3>${task.name}</h3>
            <p>${task.description}</p>
            <span class="reward">Нагорода: ${task.reward}</span>
            <button data-task-id="${task.id}" ${task.completed ? 'disabled' : ''}>
                ${task.completed ? 'Виконано' : 'Виконати'}
            </button>
        `;
        tasksList.appendChild(li);

        const taskButton = li.querySelector('button');
        if (!task.completed) {
            taskButton.addEventListener('click', async (e) => {
                e.target.disabled = true; // Вимикаємо кнопку, щоб уникнути повторних кліків
                await completeTask(task.id, task.type, task.value, task.reward);
                // Після виконання завдання, оновимо список завдань, щоб кнопка стала "Виконано"
                fetchTasksData();
            });
        }
    });
}

async function completeTask(taskId, taskType, rewardValue, rewardString) {
    if (!telegramUserId || telegramUserId === 'test_user_local') {
        alert("Неможливо виконати завдання в тестовому режимі. Будь ласка, відкрийте гру в Telegram.");
        return;
    }
    if (playerTasksStatus[taskId]) {
        alert("Це завдання вже виконано!");
        return;
    }

    try {
        // У реальному додатку тут потрібна серверна перевірка виконання умови завдання
        // (наприклад, чи дійсно підписався на канал, чи запросив друга).
        // Для демонстрації ми просто позначаємо його як виконане.

        playerTasksStatus[taskId] = true; // Позначаємо як виконане локально

        if (taskType === 'coins') {
            score += rewardValue;
        } else if (taskType === 'wee') {
            mainBalance += rewardValue;
        }

        updateDisplay();
        await savePlayerData(); // Зберігаємо оновлений статус завдань та баланси

        alert(`Завдання "${allAvailableTasks.find(t => t.id === taskId).name}" виконано! Отримано: ${rewardString}`);

    } catch (error) {
        console.error('Error completing task:', error);
        playerTasksStatus[taskId] = false; // Якщо помилка, повертаємо статус
        alert('Помилка при виконанні завдання. Спробуйте пізніше.');
    }
}


// --- Main Game Initialization After DOM and Firebase Ready ---
async function initializeGame() {
    console.log("Initializing game...");

    // 1. Ініціалізація Telegram Web App API
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        setTimeout(() => tg.expand(), 100);

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

    startLoadingProgress(); // Запускаємо анімацію прогрес-бару одразу

    // Завантажуємо Firebase SDK, а потім ініціалізуємо гру
    loadFirebaseSDK()
        .then(() => {
            console.log("Firebase SDK loaded, proceeding with game initialization.");
            initializeGame();
        })
        .catch(error => {
    
