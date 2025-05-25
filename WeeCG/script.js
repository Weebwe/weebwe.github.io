// script.js

// --- Firebase Initialization START ---
const firebaseConfig = {
  apiKey: "AIzaSyAt5GlmmqhW6IeDd3oFB0yq2xQARd8YPNs",
  authDomain: "weegamebot-7c44b.firebaseapp.com",
  databaseURL: "https://weegamebot-7c44b-default-rtdb.firebaseio.com",
  projectId: "weegamebot-7c44b",
  storageBucket: "weegamebot-7c44b.firebasestorage.app",
  messagingSenderId: "1052981895153",
  appId: "1:1052981895153:web:0c8426bf8e5b97729a6e50"
};

function loadFirebaseScripts() {
  return new Promise((resolve, reject) => {
    const firebaseAppScript = document.createElement('script');
    firebaseAppScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
    firebaseAppScript.onload = () => {
      const firebaseFirestoreScript = document.createElement('script');
      firebaseFirestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";
      firebaseFirestoreScript.onload = resolve;
      firebaseFirestoreScript.onerror = () => reject(new Error('Failed to load firebase-firestore.js'));
      document.head.appendChild(firebaseFirestoreScript);
    };
    firebaseAppScript.onerror = () => reject(new Error('Failed to load firebase-app.js'));
    document.head.appendChild(firebaseAppScript);
  });
}

let db = null;
let app = null;

loadFirebaseScripts().then(() => {
  app = firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  window.db = db;
  console.log("Firebase Firestore initialized.");
  loadPlayerData();
}).catch(err => {
  console.error("Помилка підключення Firebase:", err);
  updateDisplay();
});

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

const coinClickSound = new Audio('coin_click.mp3');
coinClickSound.volume = 0.5;

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
// Змінив інтервал відновлення на 24 години
const energyRechargeIntervalTime = 24 * 60 * 60 * 1000; // 86400000 мс (24 години)
const energyRechargeAmount = maxEnergy; // Відновлюємо повністю енергію раз на 24 години

let autoClickInterval;
let energyRechargeInterval;

let saveTimeout = null;

// --- Оновлення відображення ---
function updateDisplay() {
  if (scoreElement) scoreElement.textContent = Math.floor(score);
  if (mainBalanceElement) mainBalanceElement.textContent = Math.floor(mainBalance);
  if (upgrade1CostElement) upgrade1CostElement.textContent = upgrade1Cost;
  if (upgrade2CostElement) upgrade2CostElement.textContent = upgrade2Cost;
  checkUpgradeAvailability();
  updateEnergyDisplay();
}

// Відображення енергії
function updateEnergyDisplay() {
  if (!energyBarFill || !energyText || !clickButton) return;
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
  if (upgrade1Button) upgrade1Button.disabled = score < upgrade1Cost;
  if (upgrade2Button) upgrade2Button.disabled = score < upgrade2Cost;
}

// Відновлення енергії (раз на 24 години)
function rechargeEnergy() {
  if (currentEnergy < maxEnergy) {
    currentEnergy = Math.min(currentEnergy + energyRechargeAmount, maxEnergy);
    updateEnergyDisplay();
    debounceSavePlayerData();
  }
}

// Завантаження з Firestore
async function loadPlayerData() {
  if (!db) {
    console.error("Firestore не ініціалізований. (loadPlayerData)");
    updateDisplay();
    return;
  }

  if (!telegramUserId) {
    console.warn("Telegram User ID not available for load. Running in test mode.");
    telegramUserId = 'test_user_local';
    updateDisplay();
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
    } else {
      console.log("No player data found for", telegramUserId, ". Starting new game.");
    }
    updateDisplay();
    startAutoClicker();
    startEnergyRecharge();
  } catch (e) {
    console.error('Помилка завантаження даних гравця:', e);
    updateDisplay();
  }
}

// Збереження в Firestore з дебаунсом
function debounceSavePlayerData() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    savePlayerData();
  }, 5000); // зберігати не частіше, ніж раз на 5 секунд
}

async function savePlayerData() {
  if (!db) {
    console.warn("Firestore не ініціалізований. Збереження неможливе.");
    return;
  }
  if (telegramUserId === 'test_user_local' || !telegramUserId) {
    console.warn("Cannot save data: Telegram User ID is test ID or not available. Data will not be saved.");
    return;
  }

  try {
    await db.collection("players").doc(telegramUserId).set({
      score, mainBalance, clickPower, autoClickPower,
      upgrade1Cost, upgrade2Cost, currentEnergy
    });
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
      debounceSavePlayerData();
    }, 1000);
  }
}

// Відновлення енергії раз на 24 години
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
    if (progressBarFill) progressBarFill.style.width = `${progress}%`;
    if (loadingText) loadingText.textContent = `Завантаження... ${Math.floor(progress)}%`;
    if (progress === 99) {
      clearInterval(interval);
      setTimeout(() => {
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (gameScreen) gameScreen.classList.remove('hidden');
        // loadPlayerData() тепер викликається після ініціалізації Firebase
      }, 4000);
    }
  }, 50);
}

// Старт при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    setTimeout(() => tg.expand(), 100);
    if (tg.initDataUnsafe?.user?.id) {
      telegramUserId = tg.initDataUnsafe.user.id.toString();
      if (debugUserIdElement) debugUserIdElement.textContent = "ID: " + telegramUserId;
      console.log("Telegram User ID obtained:", telegramUserId);
    } else {
      console
