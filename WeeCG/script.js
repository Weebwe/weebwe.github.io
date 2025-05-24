// Отримання посилань на HTML-елементи
const scoreElement = document.getElementById('score');
const clickButton = document.getElementById('clickButton');
const upgrade1Button = document.getElementById('upgrade1');
const upgrade1CostElement = document.getElementById('upgrade1Cost');
const upgrade2Button = document.getElementById('upgrade2');
const upgrade2CostElement = document.getElementById('upgrade2Cost');
const debugUserIdElement = document.getElementById('debugUserId'); // Для відображення ID

// Ігрові змінні (початкові значення)
let score = 0;
let clickPower = 1; // Скільки монет за один клік
let autoClickPower = 0; // Скільки монет за секунду від авто-клікера
let upgrade1Cost = 100;
let upgrade2Cost = 500;
let autoClickInterval; // Для зберігання ідентифікатора інтервалу авто-клікера
let telegramUserId = null; // Змінна для зберігання ID користувача Telegram

// Створення аудіооб'єкта для звуку кліка
const coinClickSound = new Audio('coin_click.mp3'); // Переконайтеся, що шлях до файлу правильний
coinClickSound.volume = 0.5; // Можна налаштувати гучність (0.0 - 1.0)


// Функція для оновлення відображення очок
function updateScoreDisplay() {
    scoreElement.textContent = Math.floor(score); // Завжди показуємо цілі числа
    checkUpgradeAvailability();
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
        updateScoreDisplay();
        return;
    }

    if (!telegramUserId) {
        console.warn("Telegram User ID not available. Running in test mode without saving progress.");
        telegramUserId = 'test_user_local';
        updateScoreDisplay();
        return;
    }

    try {
        const docRef = window.db.collection("players").doc(telegramUserId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            score = data.score;
            clickPower = data.clickPower;
            autoClickPower = data.autoClickPower;
            upgrade1Cost = data.upgrade1Cost;
            upgrade2Cost = data.upgrade2Cost;

            // ОНОВЛЕННЯ ВІДОБРАЖЕННЯ ВАРТОСТІ ПОКРАЩЕНЬ ПРИ ЗАВАНТАЖЕННІ
            upgrade1CostElement.textContent = upgrade1Cost;
            upgrade2CostElement.textContent = upgrade2Cost;

            if (autoClickPower > 0) {
                if (autoClickInterval) {
                    clearInterval(autoClickInterval);
                }
                autoClickInterval = setInterval(() => {
                    score += autoClickPower;
                    updateScoreDisplay();
                    savePlayerData();
                }, 1000);
            }
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            // Ініціалізуємо відображення вартості покращень на початкові значення
            upgrade1CostElement.textContent = upgrade1Cost;
            upgrade2CostElement.textContent = upgrade2Cost;
        }
        updateScoreDisplay();
    } catch (error) {
        console.error('Error loading player data:', error);
        // Ініціалізуємо відображення вартості покращень на початкові значення
        upgrade1CostElement.textContent = upgrade1Cost;
        upgrade2CostElement.textContent = upgrade2Cost;
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
            clickPower: clickPower,
            autoClickPower: autoClickPower,
            upgrade1Cost: upgrade1Cost,
            upgrade2Cost: upgrade2Cost
        });
        console.log('Player data saved for', telegramUserId);
    } catch (error) {
        console.error('Error saving player data:', error);
    }
}

// ----- DOMContentLoaded: запускається, коли весь HTML завантажено та розпарсено -----
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізація Telegram Web App API та отримання ID користувача
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        // ДОДАНО: Розширення Web App на весь екран
        tg.expand(); // Це повинно розгорнути додаток на повну висоту

        if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString();
            console.log("Telegram User ID:", telegramUserId);
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
    }

    loadPlayerData();

    // Обробник кліка по монеті
    clickButton.addEventListener('click', () => {
        console.log("Coin clicked!");
        score += clickPower;
        updateScoreDisplay();
        savePlayerData();
        // Відтворення звуку при кліку
        coinClickSound.currentTime = 0;
        coinClickSound.play().catch(e => console.error("Error playing sound:", e));
    });

    // Покращення 1: Більше монет за клік
    upgrade1Button.addEventListener('click', () => {
        if (score >= upgrade1Cost) {
            score -= upgrade1Cost;
            clickPower += 1;
            upgrade1Cost = Math.floor(upgrade1Cost * 1.5);
            upgrade1CostElement.textContent = upgrade1Cost;
            updateScoreDisplay();
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
            updateScoreDisplay();
            savePlayerData();

            if (autoClickInterval) {
                clearInterval(autoClickInterval);
            }
            autoClickInterval = setInterval(() => {
                score += autoClickPower;
                updateScoreDisplay();
                savePlayerData();
            }, 1000);
        }
    });

    // Додаємо автоматичне збереження кожні 5 секунд
    setInterval(savePlayerData, 5000);
});
