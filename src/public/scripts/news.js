// Constants
const API_BASE_URL = '/api';
const COUNTRIES = {
    'us': 'United States',
    'gb': 'United Kingdom',
    'ca': 'Canada',
    'au': 'Australia',
    // Add more countries as needed
};
const LANGUAGES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    // Add more languages as needed
};

// DOM Elements
const loading = document.getElementById('loading');
const newsGrid = document.getElementById('newsGrid');

// State
let currentNews = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load header
    fetch('/components/header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header').innerHTML = html;
        });

    // Initialize filters and load news
    initializeFilters();
    loadNews();
    setupEventListeners();

    // Fetch trending keywords
    tryFetchTrendingKeywords();
});

// Initialize country and language dropdowns
function initializeFilters() {
    const countryFilter = document.getElementById('countryFilter');
    const languageFilter = document.getElementById('languageFilter');

    // Populate country dropdowns
    Object.entries(COUNTRIES).forEach(([code, name]) => {
        countryFilter.add(new Option(name, code));
    });

    // Populate language dropdowns
    Object.entries(LANGUAGES).forEach(([code, name]) => {
        languageFilter.add(new Option(name, code));
    });
}

 // Function to attempt to fetch trending keywords
 function tryFetchTrendingKeywords() {
    fetch('/api/trends/keywords?timeframe=daily')
        .then(response => {
            if (!response.ok) {
                throw new Error('API response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.data && data.data.length > 0) {
                const tickerContainer = document.getElementById('trending-keywords');
                if (tickerContainer) {
                    tickerContainer.innerHTML = '';
                    
                    data.data.forEach(item => {
                        const tickerItem = document.createElement('span');
                        tickerItem.className = 'ticker-item';
                        
                        const link = document.createElement('a');
                        link.href = `/news?search=${encodeURIComponent(item.keyword)}`;
                        link.textContent = `${item.keyword} (${item.count})`;
                        
                        tickerItem.appendChild(link);
                        tickerContainer.appendChild(tickerItem);
                    });
                }
            }
        })
        .catch(error => {
            console.log('Using default trending keywords:', error);
            // Keep using the default keywords
        });
}

// Load news from API
async function loadNews() {
    loading.classList.remove('d-none');
    try {
        const response = await fetch(`${API_BASE_URL}/news`);
        const data = await response.json();
        
        if (data.success) {
            currentNews = data.data;
            renderNews();
        }
    } catch (error) {
        console.error('Error loading news:', error);
        alert('Failed to load news. Please try again.');
    } finally {
        loading.classList.add('d-none');
    }
}

// Render news grid
function renderNews() {
    newsGrid.innerHTML = '';
    
    currentNews.forEach(article => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card news-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${article.title}</h5>
                    <p class="card-text">${article.description}</p>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-tag"></i> ${article.categories.join(', ')}
                            <i class="bi bi-globe ms-2"></i> ${COUNTRIES[article.countries[0]] || article.countries[0]}
                            <i class="bi bi-translate ms-2"></i> ${LANGUAGES[article.language] || article.language}
                        </small>
                    </p>
                    <p class="card-text">
                        <a href="${article.url}" target="_blank" class="text-decoration-none">
                            <i class="bi bi-link-45deg"></i> Read more
                        </a>
                    </p>
                </div>
            </div>
        `;
        newsGrid.appendChild(card);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Filter news
    document.getElementById('searchInput').addEventListener('input', filterNews);
    document.getElementById('categoryFilter').addEventListener('change', filterNews);
    document.getElementById('countryFilter').addEventListener('change', filterNews);
    document.getElementById('languageFilter').addEventListener('change', filterNews);
    document.getElementById('statusFilter').addEventListener('change', filterNews);
}

// Filter news based on search and filter criteria
function filterNews() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const country = document.getElementById('countryFilter').value;
    const language = document.getElementById('languageFilter').value;
    const status = document.getElementById('statusFilter').value;

    const filteredNews = currentNews.filter(article => {
        const matchesSearch = !searchTerm || 
            article.title.toLowerCase().includes(searchTerm) ||
            article.description.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !category || article.categories.includes(category);
        const matchesCountry = !country || article.countries.includes(country);
        const matchesLanguage = !language || article.language === language;

        return matchesSearch && matchesCategory && matchesCountry && matchesLanguage;
    });

    renderFilteredNews(filteredNews);
}

// Render filtered news
function renderFilteredNews(news) {
    newsGrid.innerHTML = '';
    
    if (news.length === 0) {
        newsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <h4 class="text-muted">No news found matching your criteria</h4>
            </div>
        `;
        return;
    }

    news.forEach(article => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card news-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${article.title}</h5>
                    <p class="card-text">${article.description}</p>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-tag"></i> ${article.categories.join(', ')}
                            <i class="bi bi-globe ms-2"></i> ${COUNTRIES[article.countries[0]] || article.countries[0]}
                            <i class="bi bi-translate ms-2"></i> ${LANGUAGES[article.language] || article.language}
                        </small>
                    </p>
                    <p class="card-text">
                        <a href="${article.url}" target="_blank" class="text-decoration-none">
                            <i class="bi bi-link-45deg"></i> Read more
                        </a>
                    </p>
                </div>
            </div>
        `;
        newsGrid.appendChild(card);
    });
}
