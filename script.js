// script.js
import { firebaseConfig } from './firebase-config.js'; // Імпорт конфігурації

// Імпортуємо функції з Firebase SDK v9+
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

// Ініціалізуємо Firebase
const app = initializeApp(firebaseConfig); // Тепер firebaseConfig імпортується
const db = getDatabase(app);

let currentLanguage = 'uk'; // Мова за замовчуванням завжди українська
let allPagesContent = {}; // Для зберігання всього текстового контенту сторінок
let allMenuData = {}; // Для зберігання даних меню

document.addEventListener('DOMContentLoaded', function() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    const pages = document.querySelectorAll('.page');
    const navMenuContainer = document.getElementById('nav-menu-container');

    // --- Функції для завантаження даних з Firebase та рендерингу ---

    // Завантаження всього текстового контенту сторінок (Home, About, Contact)
    // Ця функція також запускає завантаження проєктів та меню після отримання основного контенту
    onValue(ref(db, 'pages'), (snapshot) => {
        allPagesContent = snapshot.val() || {};
        renderPageContent(); // Оновлюємо контент сторінок Home, About, Contact
        loadProjects(); // Завантажуємо і рендеримо проекти
        loadNavMenu(); // Завантажуємо і рендеримо меню

        // Приховуємо екран завантаження і показуємо основний контент
        // Додаємо невелику затримку, щоб анімація логотипу встигла показатися
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                mainContent.style.display = 'flex'; // Показуємо основний контент
            }, 500); // Час анімації зникнення екрану завантаження
        }, 1500); // Затримка перед початком зникнення (для видимості анімації завантаження)

    }, (error) => {
        console.error("Помилка завантаження основного контенту: ", error);
        // Навіть якщо є помилка, спробуємо відобразити те, що є
        renderPageContent();
        loadProjects();
        loadNavMenu();
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                mainContent.style.display = 'flex';
            }, 500);
        }, 1500);
    });

    // Рендеринг контенту сторінок (Новини, Про компанію, Контакти)
    function renderPageContent() {
        // *************** НОВА ГОЛОВНА СТОРІНКА (НОВИНИ) ***************
        const homePageData = allPagesContent.home;
        if (homePageData) {
            document.getElementById('home-title').innerText = homePageData[`title_${currentLanguage}`];
            const newsListDiv = document.getElementById('news-list');
            newsListDiv.innerHTML = ''; // Очищаємо список новин

            onValue(ref(db, 'news_articles'), (snapshot) => {
                const newsArticles = snapshot.val() || {};
                if (newsArticles) {
                    // Перетворюємо об'єкт новин на масив і сортуємо за датою (від найновіших)
                    const sortedNews = Object.keys(newsArticles).map(key => ({
                        id: key,
                        ...newsArticles[key]
                    })).sort((a, b) => new Date(b.date) - new Date(a.date));

                    sortedNews.forEach(news => {
                        const newsCard = document.createElement('div');
                        newsCard.className = 'section news-card';
                        newsCard.innerHTML = `
                            <h3>${news[`title_${currentLanguage}`]}</h3>
                            <p class="news-date">${news.date}</p>
                            <div>${news[`content_${currentLanguage}`]}</div>
                        `;
                        newsListDiv.appendChild(newsCard);
                    });
                } else {
                    newsListDiv.innerHTML = `<p>Наразі новин немає.</p>`;
                }
            }, (error) => {
                console.error("Помилка завантаження новин: ", error);
                newsListDiv.innerHTML = `<p>Не вдалося завантажити новини.</p>`;
            });
        }

        // *************** СТОРІНКА ПРО КОМПАНІЮ (колишні "Послуги") ***************
        const aboutPageData = allPagesContent.about;
        if (aboutPageData) {
            document.getElementById('about-title').innerText = aboutPageData[`title_${currentLanguage}`];
            document.getElementById('about-intro').innerText = aboutPageData[`intro_${currentLanguage}`] || '';
            const aboutContentDiv = document.getElementById('about-content');
            aboutContentDiv.innerHTML = `
                <p>${aboutPageData[`content_${currentLanguage}_p1`] || ''}</p>
                <p>${aboutPageData[`content_${currentLanguage}_p2`] || ''}</p>
            `;
        }

        // *************** СТОРІНКА КОНТАКТІВ ***************
        const contactPageData = allPagesContent.contact;
        if (contactPageData) {
            document.getElementById('contact-title').innerText = contactPageData[`title_${currentLanguage}`];
            document.getElementById('contact-intro').innerText = contactPageData[`intro_${currentLanguage}`];
            document.getElementById('contact-email').innerHTML = `📧 Email: <a href="mailto:${contactPageData.email_ua}">${contactPageData.email_ua}</a>`;
            document.getElementById('contact-telegram').innerHTML = `💬 Telegram: <a href="https://t.me/${contactPageData.telegram_ua.substring(1)}" target="_blank">${contactPageData.telegram_ua}</a>`;
        }

        // Оновлюємо заголовок сторінки
        updatePageTitle();
    }

    // Завантаження проектів
    function loadProjects() {
        onValue(ref(db, 'projects'), (snapshot) => {
            const projectsListDiv = document.getElementById('projects-list');
            projectsListDiv.innerHTML = ''; // Очищаємо попередній список
            const projects = snapshot.val();

            if (projects) {
                Object.keys(projects).forEach(key => {
                    const project = projects[key];
                    const projectCard = document.createElement('div');
                    projectCard.className = 'project-card';
                    projectCard.innerHTML = `
                        <h3>${project[`title_${currentLanguage}`]}</h3>
                        ${project.id === 'weeclick' ? `
                            <div class="weeclick-logo-wrapper">
                                <span class="weeclick-logo-text">WeeClick</span>
                            </div>
                        ` : ''}
                        <p>${project[`description_${currentLanguage}`]}</p>
                        ${project.link ? `<p><a href="${project.link}" target="_blank">Детальніше</a></p>` : ''}
                    `;
                    projectsListDiv.appendChild(projectCard);
                });
            } else {
                projectsListDiv.innerHTML = `<p>Наразі проєктів немає.</p>`;
            }
        }, (error) => {
            console.error("Помилка завантаження проєктів: ", error);
            document.getElementById('projects-list').innerHTML = `<p>Не вдалося завантажити проєкти.</p>`;
        });
    }

    // Завантаження та рендеринг навігаційного меню
    function loadNavMenu() {
        onValue(ref(db, 'menu_items'), (snapshot) => {
            allMenuData = snapshot.val() || {};
            navMenuContainer.innerHTML = ''; // Очищаємо перед додаванням

            // Визначений порядок кнопок
            const menuOrder = ['home-page', 'about-page', 'projects-page', 'contact-page'];
            menuOrder.forEach(pageId => {
                const item = allMenuData[pageId];
                if (item) { // Перевірка наявності елемента в Firebase
                    const button = document.createElement('button');
                    button.className = 'nav-button';
                    button.setAttribute('data-page', pageId);
                    button.setAttribute('onclick', `showPage('${pageId}')`);
                    button.innerHTML = `<span>${item.icon}</span> <span>${item[`text_${currentLanguage}`]}</span>`;
                    navMenuContainer.appendChild(button);
                }
            });
            // Показуємо домашню сторінку за замовчуванням після завантаження меню
            // Перевіряємо, чи є кнопки меню, перш ніж викликати showPage
            if (navMenuContainer.children.length > 0) {
                showPage('home-page');
            }
        }, (error) => {
            console.error("Помилка завантаження меню: ", error);
            navMenuContainer.innerHTML = `<p style="color:white; font-size:0.8em;">Помилка завантаження меню.</p>`;
        });
    }

    // Функція для перемикання сторінок
    window.showPage = function(pageId) {
        pages.forEach(page => {
            page.style.display = 'none'; // Приховуємо всі сторінки
        });
        document.getElementById(pageId).style.display = 'block'; // Показуємо обрану сторінку

        // Оновлення активної кнопки меню
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.classList.remove('active');
        });
        const activeButton = document.querySelector(`.nav-button[data-page="${pageId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        updatePageTitle(); // Оновлюємо заголовок сторінки
    };

    // Функція для оновлення заголовка сторінки в браузері
    function updatePageTitle() {
        const activePageId = document.querySelector('.page[style*="display: block"]')?.id;
        let pageTitle = 'Weebwe LLC'; // Заголовок за замовчуванням

        if (activePageId && allPagesContent[activePageId.replace('-page', '')]) {
            pageTitle = allPagesContent[activePageId.replace('-page', '')][`title_${currentLanguage}`] || pageTitle;
        } else if (activePageId === 'home-page' && allPagesContent.home) {
            pageTitle = allPagesContent.home[`title_${currentLanguage}`] || pageTitle;
        }
        document.title = pageTitle;
    }
}); // Кінець DOMContentLoaded
