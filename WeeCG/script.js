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

    const MAX_ENERGY = 1000;
    let currentEnergy = MAX_ENERGY; // Починаємо з повної енергії
    const ENERGY_REGEN_RATE = 10; // Energy points per second
    let lastEnergyRegenTime = Date.now();

    const WEE_EXCHANGE_RATE = 1000000; // 1,000,000 coins = 1 WEE
    let weeBalance = 0.00; // This should come from backend (mocked here)

    // Mock Backend Data (for demonstration without a real server)
    const mockUserData = {
        userId: 'mock_user_123',
        coins: 0, // Will be updated by currentScore
        weeBalance: 0.00,
        completedTasks: new Set(), // Store IDs of completed tasks
    };

    const mockTasksData = [
        { id: 1, name: "Привітання", description: "Підпишіться на наш Telegram-канал.", reward: "500 🪙", type: "coins", completed: false },
        { id: 2, name: "Перша покупка", description: "Купіть будь-яке покращення.", reward: "0.5 WEE", type: "wee", completed: false },
        { id: 3, name: "Запроси друга", description: "Запросіть одного друга в гру.", reward: "1.0 WEE", type: "wee", completed: false },
        { id: 4, name: "Натисни 1000 разів", description: "Клікніть монету 1000 разів.", reward: "1000 🪙", type: "coins", completed: false },
        { id: 5, name: "Досягни 10000 монет", description: "Назбирайте 10000 монет.", reward: "0.1 WEE", type: "wee", completed: false },
    ];

    // Mock Backend API Function
    async function mockBackendApi(endpoint, data = {}) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

        if (endpoint === '/api/exchange') {
            if (data.coins > mockUserData.coins) {
                return { success: false, message: 'Недостатньо монет на бекенді!' };
            }
            const weeEarned = data.coins / WEE_EXCHANGE_RATE;
            mockUserData.coins -= data.coins; // Update backend coins
            mockUserData.weeBalance += weeEarned;
            return { success: true, newWeeBalance: mockUserData.weeBalance, newCoinsBalance: mockUserData.coins };
        } else if (endpoint === '/api/leaderboard') {
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
            ];
            // Add current user to leaderboard if not present and score is high enough
            const currentUserScore = currentScore; // Use frontend currentScore for mock
            const existingUserIndex = mockLeaders.findIndex(l => l.name === "Ви (Mock)");
            if (existingUserIndex !== -1) {
                mockLeaders[existingUserIndex].score = Math.max(mockLeaders[existingUserIndex].score, currentUserScore);
            } else if (currentUserScore > 0) {
                mockLeaders.push({ rank: 0, name: "Ви (Mock)", score: currentUserScore });
            }
            mockLeaders.sort((a, b) => b.score - a.score);
            mockLeaders.forEach((leader, index) => leader.rank = index + 1);

            return { success: true, leaders: mockLeaders.slice(0, 10) }; // Return top 10
        } else if (endpoint === '/api/tasks') {
            const tasksForUser = mockTasksData.map(task => ({
                ...task,
                completed: mockUserData.completedTasks.has(task.id)
            }));
            return { success: true, tasks: tasksForUser };
        } else if (endpoint === '/api/completeTask') {
            const taskId = data.taskId;
            if (mockUserData.completedTasks.has(taskId)) {
                return { success: false, message: 'Завдання вже виконано!' };
            }
            const task = mockTasksData.find(t => t.id === taskId);
            if (!task) {
                return { success: false, message: 'Завдання не знайдено.' };
            }

            mockUserData.completedTasks.add(taskId); // Mark as completed in mock backend
            let rewardValue;
            if (task.type === 'coins') {
                rewardValue = parseInt(task.reward.replace(' 🪙', ''));
                mockUserData.coins += rewardValue;
            } else if (task.type === 'wee') {
                rewardValue = parseFloat(task.reward.replace(' WEE', ''));
                mockUserData.weeBalance += rewardValue;
            }
            return {
                success: true,
                message: `Завдання "${task.name}" виконано! Отримано: ${task.reward}`,
                newCoinsBalance: mockUserData.coins,
                newWeeBalance: mockUserData.weeBalance
            };
        }
        return { success: false, message: 'Невідомий ендпоінт' };
    }

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
            }, 500); // Small delay to show 100%
        }
    }, 100);

    // --- Telegram Web App Init (if needed) ---
    // if (window.Telegram && window.Telegram.WebApp) {
    //     Telegram.WebApp.ready();
    //     const userId = Telegram.WebApp.initDataUnsafe?.user?.id;
    //     if (userId) {
    //         document.getElementById('debugUserId').textContent = `User ID: ${userId}`;
    //         mockUserData.userId = userId; // Set mock user ID from Telegram
    //     }
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
        weeBalanceDisplay.textContent = mockUserData.weeBalance.toFixed(2); // Use mock backend balance
        walletCoinBalanceDisplay.textContent = currentScore.toLocaleString(); // Coins are the same as game score
        mainBalanceDisplay.textContent = mockUserData.weeBalance.toFixed(2); // Assuming mainBalance displays WEE
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
            console.log("Недостатньо енергії!");
            // Optionally, show a visual cue that energy is low
            const energyBar = document.querySelector('.energy-bar');
            energyBar.classList.add('shake');
            setTimeout(() => {
                energyBar.classList.remove('shake');
            }, 500);
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
    exchangeButton.addEventListener('click', async () => {
        const amountToExchange = parseInt(exchangeAmountInput.value);

        if (isNaN(amountToExchange) || amountToExchange < WEE_EXCHANGE_RATE) {
            alert(`Будь ласка, введіть суму, більшу або рівну ${WEE_EXCHANGE_RATE.toLocaleString()} монет.`);
            return;
        }

        if (currentScore >= amountToExchange) {
            // Send request to mock backend
            const response = await mockBackendApi('/api/exchange', {
                userId: mockUserData.userId,
                coins: amountToExchange
            });

            if (response.success) {
                currentScore -= amountToExchange; // Update local coins
                mockUserData.weeBalance = response.newWeeBalance; // Update local WEE balance from mock backend
                alert(`Успішно обміняно ${amountToExchange.toLocaleString()} монет на ${response.newWeeBalance.toFixed(2)} WEE!`);
                exchangeAmountInput.value = ''; // Clear input
            } else {
                alert('Помилка обміну: ' + response.message);
            }
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
        const response = await mockBackendApi('/api/leaderboard');

        if (response.success) {
            displayLeaderboard(response.leaders);
        } else {
            console.error('Failed to load leaderboard:', response.message);
            leaderboardList.innerHTML = '<li style="text-align:center;">Помилка завантаження лідерборду.</li>';
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
        const response = await mockBackendApi('/api/tasks', { userId: mockUserData.userId });

        if (response.success) {
            displayTasks(response.tasks);
        } else {
            console.error('Failed to load tasks:', response.message);
            tasksList.innerHTML = '<li style="text-align:center;">Помилка завантаження завдань.</li>';
        }
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
                taskButton.addEventListener('click', async (e) => {
                    e.target.disabled = true;
                    await completeTask(task.id, task.type, task.reward);
                    e.target.disabled = false; // Re-enable if needed, or rely on fetchTasksData
                });
            }
        });
    }

    async function completeTask(taskId, taskType, reward) {
        const response = await mockBackendApi('/api/completeTask', {
            userId: mockUserData.userId,
            taskId: taskId
        });

        if (response.success) {
            alert(response.message);
            currentScore = response.newCoinsBalance !== undefined ? response.newCoinsBalance : currentScore;
            mockUserData.weeBalance = response.newWeeBalance !== undefined ? response.newWeeBalance : mockUserData.weeBalance;
            updateUI();
            fetchTasksData(); // Refresh tasks list to reflect completion
        } else {
            alert('Помилка виконання завдання: ' + response.message);
        }
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
                updateUI();
            } else if (targetScreen === 'wallet') {
                walletScreen.classList.remove('hidden');
                updateUI();
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
