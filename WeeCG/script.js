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

let currentEnergy = 1000;
const maxEnergy = 1000;
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
    if (!window.db) return console.error("Firestore not initialized.");
    if (!telegramUserId) {
        telegramUserId = 'test_user_local';
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
            currentEnergy = data.currentEnergy || maxEnergy;
            lastEnergyRechargeTime = data.lastEnergyRechargeTime || Date.now();
        } else {
            lastEnergyRechargeTime = Date.now();
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
    if (!window.db || !telegramUserId || telegramUserId === 'test_user_local') return;
    try {
        await db.collection("players").doc(telegramUserId).set({
            score, mainBalance, clickPower, autoClickPower,
            upgrade1Cost, upgrade2Cost, currentEnergy,
            lastEnergyRechargeTime
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
            savePlayerData();
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        setTimeout(() => tg.expand(), 100);

        if (tg.initDataUnsafe?.user?.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            debugUserIdElement.textContent = "ID: " + telegramUserId;
            loadPlayerData();
        } else {
            debugUserIdElement.textContent = "ID: Недоступний (тест)";
            loadPlayerData();
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

    // Click handler
    clickButton.addEventListener('click', (event) => {
        if (currentEnergy > 0) {
            score += clickPower;
            currentEnergy--;
            updateDisplay();
            savePlayerData();

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
