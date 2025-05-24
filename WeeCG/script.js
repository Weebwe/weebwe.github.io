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
    // Перевіряємо, чи доступний 'db' (екземпляр Firestore)
    // Змінено: тепер db буде window.db завдяки compat SDK
    if (typeof window.db === 'undefined' || !window.db) {
        console.error("Firebase Firestore is not initialized or not accessible (db is undefined).");
        updateScoreDisplay(); // Оновлюємо відображення з початковими значеннями
        return;
    }

    if (!telegramUserId) {
        console.warn("Telegram User ID not available. Running in test mode without saving progress.");
        telegramUserId = 'test_user_local'; // Для локального тестування без Telegram встановлюємо тестовий ID
        updateScoreDisplay(); // Оновлюємо відображення з початковими значеннями
        return;
    }

    try {
        // Отримуємо посилання на документ гравця
        // Змінено для сумісної версії
        const docRef = window.db.collection("players").doc(telegramUserId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            // Якщо дані гравця знайдені, оновлюємо ігрові змінні
            const data = docSnap.data();
            score = data.score;
            clickPower = data.clickPower;
            autoClickPower = data.autoClickPower;
            upgrade1Cost = data.upgrade1Cost;
            upgrade2Cost = data.upgrade2Cost;

            // Якщо авто-клікер був активний, перезапускаємо його
            if (autoClickPower > 0) {
                if (autoClickInterval) {
                    clearInterval(autoClickInterval); // Зупиняємо попередній, якщо був
                }
                autoClickInterval = setInterval(() => {
                    score += autoClickPower;
                    updateScoreDisplay();
                    savePlayerData(); // Автоматичне збереження
                }, 1000); // Кожні 1000 мс (1 секунда)
            }
        } else {
            console.log("No player data found for", telegramUserId, ". Starting new game.");
            // Якщо даних немає, гра почнеться з початкових значень
        }
        updateScoreDisplay(); // Оновлюємо відображення після завантаження/ініціалізації
    } catch (error) {
        console.error('Error loading player data:', error);
        // Якщо сталася помилка завантаження, гра почнеться з нуля
    }
}

// Функція для збереження даних гравця в Firestore
async function savePlayerData() {
    // Перевіряємо, чи доступний 'db' (екземпляр Firestore)
    // Змінено: тепер db буде window.db завдяки compat SDK
    if (typeof window.db === 'undefined' || !window.db) {
        console.error("Firebase Firestore is not initialized or not accessible for saving.");
        return;
    }

    if (!telegramUserId || telegramUserId === 'test_user_local') {
        console.warn("Cannot save data: Telegram User ID is not available or is a test ID.");
        return;
    }

    try {
        // Зберігаємо поточні ігрові дані в Firestore
        // Змінено для сумісної версії
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
        tg.ready(); // Повідомляємо Telegram, що Web App готовий
        if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
            telegramUserId = tg.initDataUnsafe.user.id.toString(); // ID має бути string для Firebase
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

    loadPlayerData(); // ЗАВАНТАЖУЄМО дані гравця при старті гри

    // Обробник кліка по монеті
    clickButton.addEventListener('click', () => {
        console.log("Coin clicked!"); // Вивід у консоль при кліку
        score += clickPower;
        updateScoreDisplay();
        savePlayerData(); // Зберігаємо після кожного кліка
    });

    // Покращення 1: Більше монет за клік
    upgrade1Button.addEventListener('click', () => {
        if (score >= upgrade1Cost) {
            score -= upgrade1Cost;
            clickPower += 1;
            upgrade1Cost = Math.floor(upgrade1Cost * 1.5);
            upgrade1CostElement.textContent = upgrade1Cost;
            updateScoreDisplay();
            savePlayerData(); // Зберігаємо після покупки
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
            savePlayerData(); // Зберігаємо після покупки

            // Запускаємо або оновлюємо інтервал авто-клікера
            if (autoClickInterval) {
                clearInterval(autoClickInterval);
            }
            autoClickInterval = setInterval(() => {
                score += autoClickPower;
                updateScoreDisplay();
                savePlayerData(); // Автоматичне збереження від авто-клікера
            }, 1000);
        }
    });

    // Додаємо автоматичне збереження кожні 5 секунд
    setInterval(savePlayerData, 5000);
});
