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
const coinImage = document.querySelector('.coin-image'); // Отримуємо посилання на зображення монети

// Ігрові змінні
let score = 0; // Монети для кліків
let mainBalance = 0; // Основний баланс (нова валюта)
let clickPower = 1;
let autoClickPower = 0;
let upgrade1Cost = 100;
let upgrade2Cost = 500;
let telegramUserId = null;

let currentEnergy = 1000; // Поточна енергія кліків
const maxEnergy = 1000;   // Максимальна енергія
const energyRechargeRate = 100; // Енергія відновлюється на 100 одиниць кожні 5 секунд
const energyRechargeIntervalTime = 5000; // Інтервал відновлення в мс (5 секунд)

let autoClickInterval;
let energyRechargeInterval;

const coinClickSound = new Audio('coin_click.mp3');
coinClickSound.volume = 0.5;

// Функція оновлення відображення очок та балансів
function updateDisplay() {
    scoreElement.textContent = Math.floor(score);
    mainBalanceElement.textContent = Math.floor(mainBalance);
    checkUpgradeAvailability();
    updateEnergyDisplay();
}

// Функція оновлення відображення енергії
function updateEnergyDisplay() {
    const energyPercentage = (currentEnergy / maxEnergy) * 100;
    energyBarFill.style.width = `${energyPercentage}%`;

    let energyIcon = '🔋';
    if (currentEnergy <= 0) {
        energyIcon = '🪫'; // Розряджена батарея
    } else if (currentEnergy < maxEnergy * 0.2) {
        energyIcon = '🔋'; // Можна додати іншу іконку для низького заряду, якщо потрібно
    }

    energyText.textContent = `${energyIcon} ${Math.floor(currentEnergy)} / ${maxEnergy}`;

    // Якщо енергія вичерпана, вимикаємо клік
    clickButton.disabled = currentEnergy <= 0;
    clickButton.style.opacity = currentEnergy <= 0 ? 0.7 : 1;
    clickButton.style.cursor = currentEnergy <= 0 ? 'not-allowed' : 'pointer';
}

// Функція відновлення енергії
function rechargeEnergy() {
    if (currentEnergy < maxEnergy) {
        currentEnergy += energyRechargeRate;
        if (currentEnergy > maxEnergy) {
            currentEnergy = maxEnergy;
        }
        updateEnergyDisplay();
        savePlayerData(); // Зберігаємо енергію
    }
}

// Функція для перевірки доступності покращень
function checkUpgradeAvailability() {
    upgrade1Button.disabled = score < upgrade1Cost;
    upgrade2Button.disabled = score < upgrade2Cost;
}

// Функція для завантаження даних гравця з Firestore
async function loadPlayerData() {
    if (typeof window.db === 'undefined' || !window.db) {
        console.error("Firebase Firestore is not initialized or not accessible (db is undefined).");
        updateDisplay();
        return;
    }

    if (!telegramUserId) {
        console.warn("Telegram User ID not available. Running in test mode without saving progress.");
        telegramUserId = 'test_user_local';
        updateDisplay();
        return;
    }

    try {
        const docRef = window.db.collection("players").doc(telegramUserId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            score = data.score || 0;
            mainBalance = data.mainBalance || 0; // Завантажуємо основний баланс
            clickPower = data.clickPower || 1;
            autoClickPower = data.autoClickPower || 0;
            upgrade1Cost = data.upgrade1Cost || 100;
            upgrade2Cost = data.upgrade2Cost || 500;
            currentEnergy = data.currentEnergy || maxEnergy; // Завантажуємо енергію
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            // Якщо даних немає, початкові значення вже встановлені
        }

        // Оновлюємо відображення вартості покращень незалежно від того, завантажені дані чи ні
        upgrade1CostElement.textContent = upgrade1Cost;
        upgrade2CostElement.textContent = upgrade2Cost;

        updateDisplay(); // Оновлюємо всі відображення після завантаження/ініціалізації

        // Запускаємо авто-клікер, якщо був активний
        if (autoClickPower > 0) {
            if (autoClickInterval) {
                clearInterval(autoClickInterval);
            }
            autoClickInterval = setInterval(() => {
                score += autoClickPower;
                updateDisplay();
                savePlayerData();
            }, 1000);
        }

        // Запускаємо відновлення енергії
        if (energyRechargeInterval) {
            clearInterval(energyRechargeInterval);
        }
        energyRechargeInterval = setInterval(rechargeEnergy, energyRechargeIntervalTime);

    } catch (error) {
        console.error('Error loading player data:', error);
        // Якщо сталася помилка завантаження, ініціалізуємо відображення
        upgrade1CostElement.textContent = upgrade1Cost;
        upgrade2CostElement.textContent = upgrade2Cost;
        updateDisplay();
    }
}

// Функція для збереження даних гравця в Firestore
async function savePlayerData() {
    if (typeof window.db === 'undefined' || !window.db) {
        console.error("Firebase Firestore is not initialized or not accessible for saving.");
        return;
    }

    if (!telegramUserId || telegramUserId === 'test_user_local') {
        console.warn("Cannot save data: Telegram User ID is not available or is a test ID.");
        return;
    }

    try {
        await window.db.collection("players").doc(telegramUserId).set({
            score: score,
            mainBalance: mainBalance, // Зберігаємо основний баланс
            clickPower: clickPower,
            autoClickPower: autoClickPower,
            upgrade1Cost: upgrade1Cost,
            upgrade2Cost: upgrade2Cost,
            currentEnergy: currentEnergy // Зберігаємо енергію
        });
        // console.log('Player data saved for', telegramUserId); // Закоментовано для зменшення логів
    } catch (error) {
        console.error('Error saving player data:', error);
    }
}

// Функція для імітації прогресу завантаження
function startLoadingProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 5; // Випадковий приріст
        if (progress > 99) {
            progress = 99; // Залишаємо на 99% на 4 секунди
        }
        progressBarFill.style.width = `${progress}%`;
        loadingText.textContent = `Завантаження... ${Math.floor(progress)}%`;

        if (progress === 99) {
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                loadPlayerData(); // Завантажуємо дані після показу гри
            }, 4000); // Затримка 4 секунди на 99%
        }
    }, 50); // Оновлюємо прогрес кожні 50 мс
}


// ----- DOMContentLoaded: запускається, коли весь HTML завантажено та розпарсено -----
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізація Telegram Web App API та отримання ID користувача
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        // Розширення Web App на весь екран
        setTimeout(() => {
            tg.expand();
        }, 100);

        if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            if (debugUserIdElement) {
                debugUserIdElement.textContent = "ID: " + telegramUserId;
            }
        } else {
            console.warn("Telegram User ID not available (tg.initDataUnsafe.user.id is missing).");
            if (debugUserIdElement) {
                debugUserIdElement.textContent = "ID: Недоступний (тест)";
            }
        }
    } else {
        console.warn("Telegram Web App API not found. Please open in Telegram to get user ID.");
        if (debugUserIdElement) {
            debugUserIdElement.textContent = "ID: API Telegram не знайдено";
        }
        // Для тестування без Telegram, одразу показуємо гру після завантаження
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            loadPlayerData();
        }, 2000); // Невелика затримка для демонстрації завантаження
    }

    startLoadingProgress(); // Запускаємо процес завантаження при старті

    // Обробник кліка по монеті
    clickButton.addEventListener('click', () => {
        if (currentEnergy > 0) {
            score += clickPower;
            currentEnergy--; // Зменшуємо енергію
            updateDisplay();
            savePlayerData();
            coinClickSound.currentTime = 0;
            coinClickSound.play().catch(e => console.error("Error playing sound:", e));
        } else {
            console.log("Енергія вичерпана!");
            // Можна додати візуальне сповіщення, що енергія вичерпана
        }
    });

    // Покращення 1: Більше монет за клік
    upgrade1Button.addEventListener('click', () => {
        if (score >= upgrade1Cost) {
            score -= upgrade1Cost;
            clickPower += 1;
            upgrade1Cost = Math.floor(upgrade1Cost * 1.5);
            upgrade1CostElement.textContent = upgrade1Cost;
            updateDisplay();
            savePlayerData();
        }
    });

    // Покращення 2: Авто-клікер
    upgrade2Button.addEventListener('click', () => {
        if (score >= upgrade2Cost) {
            score -= upgrade2Cost;
            autoClickPower += 1;
            upgrade2Cost = Math.floor(upgrade2Cost * 2);
            upgrade2CostElement.textContent = upgrade2Cost;
            updateDisplay();
            savePlayerData();

            if (autoClickInterval) {
                clearInterval(autoClickInterval);
            }
            autoClickInterval = setInterval(() => {
                score += autoClickPower;
                updateDisplay();
                savePlayerData();
            }, 1000);
        }
    });

    // Автоматичне збереження кожні 5 секунд
    setInterval(savePlayerData, 5000);
});
