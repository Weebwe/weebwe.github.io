// script.js

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const gameScreen = document.getElementById('game-screen');
    const walletScreen = document.getElementById('wallet-screen');
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    const tasksScreen = document.getElementById('tasks-screen');

    const progressBarFill = document.getElementById('progressBarFill');
    const loadingText = document.getElementById('loadingText');

    const clickButton = document.getElementById('clickButton');
    const scoreDisplay = document.getElementById('score');
    const mainBalanceDisplay = document.getElementById('mainBalance'); // Для WEE Balance
    const energyBarFill = document.getElementById('energyBarFill');
    const energyText = document.getElementById('energyText');

    const upgrade1Button = document.getElementById('upgrade1');
    const upgrade1CostDisplay = document.getElementById('upgrade1Cost');
    const upgrade2Button = document.getElementById('upgrade2');
    const upgrade2CostDisplay = document.getElementById('upgrade2Cost');

    // Wallet elements
    const weeBalanceDisplay = document.getElementById('weeBalance');
    const walletCoinBalanceDisplay = document.getElementById('walletCoinBalance');
    const exchangeAmountInput = document.getElementById('exchangeAmount');
    const exchangeButton = document.getElementById('exchangeButton');

    // Leaderboard elements
    const leaderboardList = document.getElementById('leaderboardList');
    const refreshLeaderboardButton = document.getElementById('refreshLeaderboard');

    // Tasks elements
    const tasksList = document.getElementById('tasksList');

    // Bottom navigation
    const navItems = document.querySelectorAll('.nav-item');

    let currentScore = 0;
    let clickPower = 1;
    let autoClickRate = 0; // coins per second
    let upgrade1Cost = 100;
    let upgrade2Cost = 500;

    // Збільшений ліміт енергії: 1000
    const MAX_ENERGY = 1000;
    let currentEnergy = MAX_ENERGY; // Починаємо з повної енергії
    const ENERGY_REGEN_RATE = 10; // Energy points per second
    let lastEnergyRegenTime = Date.now();

    // Exchange rate for WEE Coin
    const WEE_EXCHANGE_RATE = 1000000; // 1,000,000 coins = 1 WEE
    let weeBalance = 0.00; // This should come from backend

    // --- Loading Screen Logic ---
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += 10;
        progressBarFill.style.width = `${progress}%`;
        loadingText.textContent = `Завантаження... ${progress}%`;

        if (progress >= 100) {
            clearInterval(loadInterval);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                // Initial update of UI after loading
                updateUI();
                startAutoClicker();
                startEnergyRegen();
                // Show game screen and hide loading screen
                // The main-content-wrapper will correctly place the game screen above the nav
            }, 500); // Small delay to show 100%
        }
    }, 100);

    // --- Telegram Web App Init (if needed) ---
    // if (window.Telegram && window.Telegram.WebApp) {
    //     Telegram.WebApp.ready();
    //     const userId = Telegram.WebApp.initDataUnsafe?.user?.id;
    //     if (userId) {
    //         document.getElementById('debugUserId').textContent = `User ID: ${userId}`;
    //     }
    //     // Example of using Telegram's MainButton
    //     // Telegram.WebApp.MainButton.setText("Клікни мене!");
    //     // Telegram.WebApp.MainButton.show();
    //     // Telegram.WebApp.MainButton.onClick(() => {
    //     //     // Handle main button click
    //     // });
    // }

    // --- Game Logic ---
    function updateUI() {
        scoreDisplay.textContent = currentScore.toLocaleString(); // Format with commas
        energyText.textContent = `${currentEnergy}/${MAX_ENERGY}`;
        energyBarFill.style.width = `${(currentEnergy / MAX_ENERGY) * 100}%`;

        upgrade1CostDisplay.textContent = upgrade1Cost.toLocaleString();
        upgrade2CostDisplay.textContent = upgrade2Cost.toLocaleString();

        upgrade1Button.disabled = currentScore < upgrade1Cost;
        upgrade2Button.disabled = currentScore < upgrade2Cost;

        // Update balances on Wallet screen
        weeBalanceDisplay.textContent = weeBalance.toFixed(2);
        walletCoinBalanceDisplay.textContent = currentScore.toLocaleString(); // Coins are the same as game score
        mainBalanceDisplay.textContent = weeBalance.toFixed(2); // Assuming mainBalance displays WEE
    }

    function showFloatingText(x, y, text) {
        const floatingText = document.createElement('div');
        floatingText.classList.add('floating-text');
        floatingText.textContent = text;
        floatingText.style.left = `${x}px`;
        floatingText.style.top = `${y}px`;
        document.body.appendChild(floatingText);

        floatingText.addEventListener('animationend', () => {
            floatingText.remove();
        });
    }

    clickButton.addEventListener('click', (event) => {
        if (currentEnergy >= 1) {
            currentScore += clickPower;
            currentEnergy = Math.max(0, currentEnergy - 1); // Decrease energy by 1
            updateUI();
            showFloatingText(event.clientX, event.clientY, `+${clickPower}`);
        } else {
            // Optionally, provide feedback that energy is too low
            console.log("Недостатньо енергії!");
        }
    });

    upgrade1Button.addEventListener('click', () => {
        if (currentScore >= upgrade1Cost) {
            currentScore -= upgrade1Cost;
            clickPower += 1;
            upgrade1Cost = Math.floor(upgrade1Cost * 1.5); // Increase cost
            updateUI();
        }
    });

    upgrade2Button.addEventListener('click', () => {
        if (currentScore >= upgrade2Cost) {
            currentScore -= upgrade2Cost;
            autoClickRate += 1;
            upgrade2Cost = Math.floor(upgrade2Cost * 2); // Increase cost
            updateUI();
            startAutoClicker(); // Ensure auto-clicker is running
        }
    });

    function startAutoClicker() {
        if (autoClickRate > 0 && !window.autoClickInterval) {
            window.autoClickInterval = setInterval(() => {
                currentScore += autoClickRate;
                updateUI();
                // No floating text for auto-clicks to avoid clutter
            }, 1000); // Every second
        } else if (autoClickRate === 0 && window.autoClickInterval) {
            clearInterval(window.autoClickInterval);
            window.autoClickInterval = null;
        }
    }

    function startEnergyRegen() {
        setInterval(() => {
            const now = Date.now();
            const elapsedTime = (now - lastEnergyRegenTime) / 1000; // in seconds
            lastEnergyRegenTime = now;

            const energyToRegen = Math.floor(elapsedTime * ENERGY_REGEN_RATE);
            if (energyToRegen > 0) {
                currentEnergy = Math.min(MAX_ENERGY, currentEnergy + energyToRegen);
                updateUI();
            }
        }, 1000); // Check every second
    }

    // --- Wallet Screen Logic ---
    exchangeButton.addEventListener('click', () => {
        const amountToExchange = parseInt(exchangeAmountInput.value);

        if (isNaN(amountToExchange) || amountToExchange < WEE_EXCHANGE_RATE) {
            alert(`Будь ласка, введіть суму, більшу або рівну ${WEE_EXCHANGE_RATE.toLocaleString()} монет.`);
            return;
        }

        if (currentScore >= amountToExchange) {
            const weeEarned = amountToExchange / WEE_EXCHANGE_RATE;
            currentScore -= amountToExchange;
            weeBalance += weeEarned; // Update local balance

            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // TODO: Надсилати запит на бекенд для обміну монет на WEE.
            // Це критично для безпеки та збереження даних.
            // Приклад (псевдокод):
            // fetch('/api/exchange', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ userId: Telegram.WebApp.initDataUnsafe?.user?.id, coins: amountToExchange })
            // })
            // .then(response => response.json())
            // .then(data => {
            //     if (data.success) {
            //         weeBalance = data.newWeeBalance; // Оновлюємо баланс з бекенду
            //         alert(`Успішно обміняно ${amountToExchange.toLocaleString()} монет на ${weeEarned.toFixed(2)} WEE!`);
            //     } else {
            //         alert('Помилка обміну: ' + data.message);
            //         currentScore += amountToExchange; // Повертаємо монети, якщо обмін не вдався
            //     }
            // })
            // .catch(error => {
            //     console.error('Помилка запиту:', error);
            //     alert('Помилка зв\'язку з сервером. Спробуйте пізніше.');
            //     currentScore += amountToExchange; // Повертаємо монети
            // });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

            alert(`Успішно обміняно ${amountToExchange.toLocaleString()} монет на ${weeEarned.toFixed(2)} WEE!`);
            exchangeAmountInput.value = ''; // Clear input
            updateUI();
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
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO: Надсилати запит на бекенд для отримання даних лідерборду.
        // Це необхідно для реального відображення лідерів та їх оновлення.
        // Приклад (псевдокод):
        // try {
        //     const response = await fetch('/api/leaderboard');
        //     const data = await response.json();
        //     if (data.success) {
        //         displayLeaderboard(data.leaders);
        //     } else {
        //         console.error('Failed to load leaderboard:', data.message);
        //         leaderboardList.innerHTML = '<li style="text-align:center;">Помилка завантаження лідерборду.</li>';
        //     }
        // } catch (error) {
        //     console.error('Error fetching leaderboard:', error);
        //     leaderboardList.innerHTML = '<li style="text-align:center;">Не вдалося з\'єднатися з сервером.</li>';
        // }
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

        // Mock data for demonstration without backend (remove this in production)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        const mockLeaders = [
            { rank: 1, name: "Гравець A", score: 5000000 },
            { rank: 2, name: "Гравець B", score: 4500000 },
            { rank: 3, name: "Гравець C", score: 4000000 },
            { rank: 4, name: "Гравець D", score: 3500000 },
            { rank: 5, name: "Гравець E", score: 3000000 },
            { rank: 6, name: "Гравець F", score: 2500000 },
            { rank: 7, name: "Гравець G", score: 2000000 },
            { rank: 8, name: "Гравець H", score: 1500000 },
            { rank: 9, name: "Гравець I", score: 1000000 },
            { rank: 10, name: "Гравець J", score: 500000 },
            { rank: 11, name: "Гравець K", score: 400000 },
            { rank: 12, name: "Гравець L", score: 300000 },
            { rank: 13, name: "Гравець M", score: 200000 },
            { rank: 14, name: "Гравець N", score: 100000 },
            { rank: 15, name: "Гравець O", score: 50000 },
            { rank: 16, name: "Гравець P", score: 20000 },
            { rank: 17, name: "Гравець Q", score: 10000 },
            { rank: 18, name: "Гравець R", score: 5000 },
            { rank: 19, name: "Гравець S", score: 2000 },
            { rank: 20, name: "Гравець T", score: 1000 },
        ];
        displayLeaderboard(mockLeaders);
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
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO: Надсилати запит на бекенд для отримання списку завдань та їхнього статусу для поточного користувача.
        // Це необхідно для відстеження прогресу та видачі нагород.
        // Приклад (псевдокод):
        // try {
        //     const response = await fetch('/api/tasks?userId=' + Telegram.WebApp.initDataUnsafe?.user?.id);
        //     const data = await response.json();
        //     if (data.success) {
        //         displayTasks(data.tasks);
        //     } else {
        //         console.error('Failed to load tasks:', data.message);
        //         tasksList.innerHTML = '<li style="text-align:center;">Помилка завантаження завдань.</li>';
        //     }
        // } catch (error) {
        //     console.error('Error fetching tasks:', error);
        //     tasksList.innerHTML = '<li style="text-align:center;">Не вдалося з\'єднатися з сервером.</li>';
        // }
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

        // Mock data for demonstration without backend (remove this in production)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        const mockTasks = [
            { id: 1, name: "Привітання", description: "Підпишіться на наш Telegram-канал.", reward: "500 🪙", type: "coins", completed: false },
            { id: 2, name: "Перша покупка", description: "Купіть будь-яке покращення.", reward: "0.5 WEE", type: "wee", completed: false },
            { id: 3, name: "Запроси друга", description: "Запросіть одного друга в гру.", reward: "1.0 WEE", type: "wee", completed: true }, // Example of completed task
            { id: 4, name: "Натисни 1000 разів", description: "Клікніть монету 1000 разів.", reward: "1000 🪙", type: "coins", completed: false },
            { id: 5, name: "Досягни 10000 монет", description: "Назбирайте 10000 монет.", reward: "0.1 WEE", type: "wee", completed: false },
        ];
        displayTasks(mockTasks);
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
                <button data-task-id="${task.id}" data-task-type="${task.type}" data-task-reward="${task.reward}" ${task.completed ? 'disabled' : ''}>
                    ${task.completed ? 'Виконано' : 'Виконати'}
                </button>
            `;
            tasksList.appendChild(li);

            const taskButton = li.querySelector('button');
            if (!task.completed) {
                taskButton.addEventListener('click', (e) => {
                    // Prevent multiple clicks before backend response
                    e.target.disabled = true;
                    completeTask(task.id, task.type, task.reward)
                        .finally(() => {
                            // Re-enable button if needed, or rely on fetchTasksData to update
                            // e.target.disabled = false;
                        });
                });
            }
        });
    }

    async function completeTask(taskId, taskType, reward) {
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO: Надсилати запит на бекенд для позначення завдання як виконаного та видачі нагороди.
        // Це критично для безпеки та коректної видачі нагород.
        // Приклад (псевдокод):
        // try {
        //     const response = await fetch('/api/completeTask', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ userId: Telegram.WebApp.initDataUnsafe?.user?.id, taskId: taskId })
        //     });
        //     const data = await response.json();
        //     if (data.success) {
        //         alert(`Завдання "${taskId}" виконано! Отримано: ${reward}`);
        //         if (taskType === 'coins') {
        //             currentScore = data.newCoinsBalance; // Оновлюємо з бекенду
        //         } else if (taskType === 'wee') {
        //             weeBalance = data.newWeeBalance; // Оновлюємо з бекенду
        //         }
        //         updateUI();
        //         fetchTasksData(); // Refresh tasks list to reflect completion
        //     } else {
        //         alert('Помилка виконання завдання: ' + data.message);
        //     }
        // } catch (error) {
        //     console.error('Помилка запиту:', error);
        //     alert('Помилка зв\'язку з сервером. Спробуйте пізніше.');
        // }
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

        // Mock completion for demonstration (remove this in production)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        alert(`Завдання "${taskId}" виконано! (Це імітація)`);
        if (taskType === 'coins') {
            currentScore += parseInt(reward.replace(' 🪙', ''));
        } else if (taskType === 'wee') {
            weeBalance += parseFloat(reward.replace(' WEE', ''));
        }
        updateUI();
        fetchTasksData(); // Re-fetch tasks to update UI for completed task (button disabled)
    }


    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetScreen = item.dataset.screen;

            // Hide all screens
            gameScreen.classList.add('hidden');
            walletScreen.classList.add('hidden');
            leaderboardScreen.classList.add('hidden');
            tasksScreen.classList.add('hidden');

            // Show target screen
            if (targetScreen === 'game') {
                gameScreen.classList.remove('hidden');
                updateUI(); // Оновлюємо UI, щоб відобразити поточний рахунок/енергію
            } else if (targetScreen === 'wallet') {
                walletScreen.classList.remove('hidden');
                updateUI(); // Ensure wallet balance is up-to-date
            } else if (targetScreen === 'leaderboard') {
                leaderboardScreen.classList.remove('hidden');
                fetchLeaderboardData(); // Load data when screen is opened
            } else if (targetScreen === 'tasks') {
                tasksScreen.classList.remove('hidden');
                fetchTasksData(); // Load data when screen is opened
            }

            // Update active state in navigation
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Initial UI update and start auto-clicker/energy regen after loading screen
    // These are called from the loading screen logic
});
