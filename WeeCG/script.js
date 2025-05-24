document.addEventListener('DOMContentLoaded', () => {
    const scoreElement = document.getElementById('score');
    const clickButton = document.getElementById('clickButton');
    const upgrade1Button = document.getElementById('upgrade1');
    const upgrade1CostElement = document.getElementById('upgrade1Cost');
    const upgrade2Button = document.getElementById('upgrade2');
    const upgrade2CostElement = document.getElementById('upgrade2Cost');

    let score = 0;
    let clickPower = 1; // Скільки монет за один клік
    let autoClickPower = 0; // Скільки монет за секунду від авто-клікера
    let upgrade1Cost = 100;
    let upgrade2Cost = 500;
    let autoClickInterval; // Для зберігання інтервалу авто-клікера

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

    // Обробник кліка по монеті
    clickButton.addEventListener('click', () => {
        score += clickPower;
        updateScoreDisplay();
        // Тут можна додати анімацію або звуковий ефект при кліку
    });

    // Покращення 1: Більше монет за клік
    upgrade1Button.addEventListener('click', () => {
        if (score >= upgrade1Cost) {
            score -= upgrade1Cost;
            clickPower += 1; // Збільшуємо потужність кліка
            upgrade1Cost = Math.floor(upgrade1Cost * 1.5); // Збільшуємо вартість наступного покращення
            upgrade1CostElement.textContent = upgrade1Cost;
            updateScoreDisplay();
            // alert('Покращення "Більше монет за клік" активовано!'); // Можна прибрати або замінити на тимчасове сповіщення в грі
        } else {
            // alert('Недостатньо монет!'); // Можна прибрати або замінити на тимчасове сповіщення в грі
        }
    });

    // Покращення 2: Авто-клікер
    upgrade2Button.addEventListener('click', () => {
        if (score >= upgrade2Cost) {
            score -= upgrade2Cost;
            autoClickPower += 1; // Збільшуємо силу авто-клікера
            upgrade2Cost = Math.floor(upgrade2Cost * 2); // Збільшуємо вартість наступного покращення
            upgrade2CostElement.textContent = upgrade2Cost;
            updateScoreDisplay();
            // alert('Покращення "Авто-клікер" активовано!'); // Можна прибрати або замінити на тимчасове сповіщення в грі

            // Запускаємо або оновлюємо інтервал авто-клікера
            if (autoClickInterval) {
                clearInterval(autoClickInterval); // Зупиняємо попередній, якщо він був
            }
            autoClickInterval = setInterval(() => {
                score += autoClickPower;
                updateScoreDisplay();
            }, 1000); // Кожні 1000 мс (1 секунда)
        } else {
            // alert('Недостатньо монет!'); // Можна прибрати або замінити на тимчасове сповіщення в грі
        }
    });

    // Ініціалізація: оновлюємо відображення очок та доступність покращень при завантаженні
    updateScoreDisplay();
});
