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
const sourcesGrid = document.getElementById('sourcesGrid');
const sourceForm = document.getElementById('sourceForm');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Initialize Bootstrap modals
let sourceModal;
let deleteModal;

// State
let currentSources = [];
let currentSourceId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    loading = document.getElementById('loading');
    
    // Initialize Bootstrap modals
    sourceModal = new bootstrap.Modal(document.getElementById('sourceModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Initialize filters and load sources
    initializeFilters();
    loadSources();
    setupEventListeners();

    // Fetch trending keywords
    tryFetchTrendingKeywords();

    // Add Source button
    const addSourceBtn = document.getElementById('addSourceBtn');
    if (addSourceBtn) {
        addSourceBtn.addEventListener('click', () => {
            resetSourceForm();
            sourceModal.show();
        });
    }

    // Load header
    fetch('/components/header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header').innerHTML = html;
            
            // After header is loaded, set up the action button
            const actionBtn = document.getElementById('actionBtn');
            if (actionBtn) {
                actionBtn.addEventListener('click', () => {
                    currentSourceId = null;
                    sourceForm.reset();
                    document.getElementById('sourceModalTitle').textContent = 'Add New Source';
                    sourceModal.show();
                });
            }
        });
});

// Initialize country and language dropdowns
function initializeFilters() {
    const countryFilter = document.getElementById('countryFilter');
    const languageFilter = document.getElementById('languageFilter');
    const sourceCountry = document.getElementById('sourceCountry');
    const sourceLanguage = document.getElementById('sourceLanguage');

    // Populate country dropdowns
    Object.entries(COUNTRIES).forEach(([code, name]) => {
        countryFilter.add(new Option(name, code));
        sourceCountry.add(new Option(name, code));
    });

    // Populate language dropdowns
    Object.entries(LANGUAGES).forEach(([code, name]) => {
        languageFilter.add(new Option(name, code));
        sourceLanguage.add(new Option(name, code));
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

// Load sources from API
async function loadSources() {
    loading.classList.remove('d-none');
    try {
        const response = await fetch(`${API_BASE_URL}/sources`);
        const data = await response.json();
        
        if (data.success) {
            currentSources = data.data;
            renderSources();
        }
    } catch (error) {
        console.error('Error loading sources:', error);
        alert('Failed to load sources. Please try again.');
    } finally {
        loading.classList.add('d-none');
    }
}

// Render sources grid
function renderSources() {
    sourcesGrid.innerHTML = '';
    
    if (!currentSources || currentSources.length === 0) {
        sourcesGrid.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No sources available. Add a new source to get started!
                </div>
            </div>
        `;
        return;
    }
    
    currentSources.forEach(source => {
        // Format last fetched date if available
        let lastFetched = 'Never';
        if (source.lastFetchedAt) {
            const date = new Date(source.lastFetchedAt);
            lastFetched = date.toLocaleString();
        }
        
        // Format fetch status
        let statusBadge = 'bg-secondary';
        let statusText = 'Unknown';
        
        if (source.fetchStatus) {
            if (source.fetchStatus.success) {
                statusBadge = 'bg-success';
                statusText = 'Success';
            } else {
                statusBadge = 'bg-danger';
                statusText = 'Error';
            }
        }
        
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card source-card h-100">
                <div class="card-body">
                    <span class="status-badge badge ${source.isActive ? 'bg-success' : 'bg-danger'}">
                        ${source.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <h5 class="card-title">${source.name}</h5>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-tag"></i> ${source.category}
                            <i class="bi bi-globe ms-2"></i> ${COUNTRIES[source.country] || source.country}
                            <i class="bi bi-translate ms-2"></i> ${LANGUAGES[source.language] || source.language}
                        </small>
                    </p>
                    <p class="card-text">
                        <a href="${source.url}" target="_blank" class="text-decoration-none">
                            <i class="bi bi-link-45deg"></i> ${source.url}
                        </a>
                    </p>
                    <div class="row mb-3">
                        <div class="col-6">
                            <small><strong>Fetch Method:</strong> ${source.fetchMethod}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Status:</strong> <span class="badge ${statusBadge}">${statusText}</span></small>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-12">
                            <small><strong>Last Fetched:</strong> ${lastFetched}</small>
                        </div>
                    </div>
                    <div class="source-actions">
                        <button class="btn btn-sm btn-primary test-source" data-id="${source._id}">
                            <i class="bi bi-play-fill"></i>
                        </button>
                        <button class="btn btn-sm btn-info edit-source" data-id="${source._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-source" data-id="${source._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        sourcesGrid.appendChild(card);
    });
}

// Function to show/hide form fields based on fetch method
function updateFetchMethodFields(fetchMethod) {
    const feedUrlContainer = document.getElementById('feedUrlContainer');
    const apiConfigContainer = document.getElementById('apiConfigContainer');
    
    // Show/hide based on fetch method
    if (fetchMethod === 'rss') {
        feedUrlContainer.style.display = 'block';
        apiConfigContainer.style.display = 'none';
    } else if (fetchMethod === 'api') {
        feedUrlContainer.style.display = 'none';
        apiConfigContainer.style.display = 'block';
    } else {
        // For scraping or other methods
        feedUrlContainer.style.display = 'none';
        apiConfigContainer.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Fetch method change
    document.getElementById('sourceFetchMethod').addEventListener('change', function(e) {
        updateFetchMethodFields(e.target.value);
    });

    // Save source
    document.getElementById('saveSourceBtn').addEventListener('click', async () => {
        if (!sourceForm.checkValidity()) {
            sourceForm.reportValidity();
            return;
        }

        const sourceData = {
            name: document.getElementById('sourceName').value,
            url: document.getElementById('sourceUrl').value,
            category: document.getElementById('sourceCategory').value,
            country: document.getElementById('sourceCountry').value,
            language: document.getElementById('sourceLanguage').value,
            fetchMethod: document.getElementById('sourceFetchMethod').value,
            isActive: document.getElementById('sourceActive').checked
        };

        // Add fetch method specific details
        const fetchMethod = document.getElementById('sourceFetchMethod').value;
        if (fetchMethod === 'rss') {
            sourceData.rssDetails = {
                feedUrl: document.getElementById('sourceFeedUrl').value
            };
        } else if (fetchMethod === 'api') {
            const apiConfigStr = document.getElementById('sourceApiConfig').value;
            try {
                sourceData.apiDetails = apiConfigStr ? JSON.parse(apiConfigStr) : {};
            } catch (e) {
                alert('Invalid JSON format in API configuration');
                return;
            }
        } else if (fetchMethod === 'scraping') {
            // If there are specific fields for scraping, add them here
            sourceData.scrapingDetails = {};
        }

        loading.classList.remove('d-none');
        try {
            const url = currentSourceId 
                ? `${API_BASE_URL}/sources/${currentSourceId}`
                : `${API_BASE_URL}/sources`;
            
            const response = await fetch(url, {
                method: currentSourceId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sourceData)
            });

            const result = await response.json();
            
            if (result.success) {
                sourceModal.hide();
                loadSources();
            } else {
                alert(result.message || 'Failed to save source');
            }
        } catch (error) {
            console.error('Error saving source:', error);
            alert('Failed to save source. Please try again.');
        } finally {
            loading.classList.add('d-none');
        }
    });

    // Edit source
    sourcesGrid.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-source');
        if (editBtn) {
            const sourceId = editBtn.dataset.id;
            const source = currentSources.find(s => s._id === sourceId);
            
            if (source) {
                currentSourceId = sourceId;
                document.getElementById('sourceModalTitle').textContent = 'Edit Source';
                document.getElementById('sourceName').value = source.name;
                document.getElementById('sourceUrl').value = source.url;
                document.getElementById('sourceCategory').value = source.category;
                document.getElementById('sourceCountry').value = source.country;
                document.getElementById('sourceLanguage').value = source.language;
                document.getElementById('sourceFetchMethod').value = source.fetchMethod;
                
                // Handle different fetch methods and their specific details
                if (source.fetchMethod === 'rss' && source.rssDetails) {
                    document.getElementById('sourceFeedUrl').value = source.rssDetails.feedUrl || '';
                } else {
                    document.getElementById('sourceFeedUrl').value = '';
                }
                
                // Handle API configuration
                if (source.fetchMethod === 'api' && source.apiDetails) {
                    document.getElementById('sourceApiConfig').value = JSON.stringify(source.apiDetails, null, 2);
                } else {
                    document.getElementById('sourceApiConfig').value = '';
                }
                
                document.getElementById('sourceActive').checked = source.isActive;
                
                // Show/hide relevant fields based on fetch method
                updateFetchMethodFields(source.fetchMethod);
                
                sourceModal.show();
            }
        }
    });

    // Delete source
    sourcesGrid.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-source');
        if (deleteBtn) {
            currentSourceId = deleteBtn.dataset.id;
            deleteModal.show();
        }
    });

    // Confirm delete
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!currentSourceId) return;

        loading.classList.remove('d-none');
        try {
            const response = await fetch(`${API_BASE_URL}/sources/${currentSourceId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (result.success) {
                deleteModal.hide();
                loadSources();
            } else {
                alert(result.message || 'Failed to delete source');
            }
        } catch (error) {
            console.error('Error deleting source:', error);
            alert('Failed to delete source. Please try again.');
        } finally {
            loading.classList.add('d-none');
        }
    });

    // Test source
    sourcesGrid.addEventListener('click', async (e) => {
        const testBtn = e.target.closest('.test-source');
        if (testBtn) {
            const sourceId = testBtn.dataset.id;
            
            loading.classList.remove('d-none');
            try {
                const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/test`, {
                    method: 'POST'
                });

                const result = await response.json();
                
                if (result.success) {
                    showTestResults(result.data);
                } else {
                    alert(result.message || 'Source test failed');
                }
            } catch (error) {
                console.error('Error testing source:', error);
                alert('Failed to test source. Please try again.');
            } finally {
                loading.classList.add('d-none');
            }
        }
    });

    // Filter sources
    document.getElementById('searchInput').addEventListener('input', filterSources);
    document.getElementById('categoryFilter').addEventListener('change', filterSources);
    document.getElementById('countryFilter').addEventListener('change', filterSources);
    document.getElementById('languageFilter').addEventListener('change', filterSources);
    document.getElementById('statusFilter').addEventListener('change', filterSources);
}

// Filter sources based on search and filter criteria
function filterSources() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const country = document.getElementById('countryFilter').value;
    const language = document.getElementById('languageFilter').value;
    const status = document.getElementById('statusFilter').value;

    const filteredSources = currentSources.filter(source => {
        const matchesSearch = !searchTerm || 
            source.name.toLowerCase().includes(searchTerm) ||
            source.url.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !category || source.category === category;
        const matchesCountry = !country || source.country === country;
        const matchesLanguage = !language || source.language === language;
        const matchesStatus = !status || 
            (status === 'active' && source.isActive) ||
            (status === 'inactive' && !source.isActive);

        return matchesSearch && matchesCategory && matchesCountry && 
               matchesLanguage && matchesStatus;
    });

    renderFilteredSources(filteredSources);
}

// Render filtered sources
function renderFilteredSources(sources) {
    sourcesGrid.innerHTML = '';
    
    if (sources.length === 0) {
        sourcesGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <h4 class="text-muted">No sources found matching your criteria</h4>
            </div>
        `;
        return;
    }

    sources.forEach(source => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card source-card h-100">
                <div class="card-body">
                    <span class="status-badge badge ${source.isActive ? 'bg-success' : 'bg-danger'}">
                        ${source.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <h5 class="card-title">${source.name}</h5>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-tag"></i> ${source.category}
                            <i class="bi bi-globe ms-2"></i> ${COUNTRIES[source.country] || source.country}
                            <i class="bi bi-translate ms-2"></i> ${LANGUAGES[source.language] || source.language}
                        </small>
                    </p>
                    <p class="card-text">
                        <a href="${source.url}" target="_blank" class="text-decoration-none">
                            <i class="bi bi-link-45deg"></i> ${source.url}
                        </a>
                    </p>
                    <div class="source-actions">
                        <button class="btn btn-sm btn-primary test-source" data-id="${source._id}">
                            <i class="bi bi-play-fill"></i>
                        </button>
                        <button class="btn btn-sm btn-info edit-source" data-id="${source._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-source" data-id="${source._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        sourcesGrid.appendChild(card);
    });
}

// Reset the source form for a new source
function resetSourceForm() {
    currentSourceId = null;
    sourceForm.reset();
    document.getElementById('sourceModalTitle').textContent = 'Add New Source';
    
    // Set default values
    document.getElementById('sourceActive').checked = true;
    
    // Show the RSS feed field by default
    updateFetchMethodFields('rss');
}

// Show test results in a modal
function showTestResults(data) {
    // Create modal if it doesn't exist
    if (!document.getElementById('testResultsModal')) {
        const modalHTML = `
        <div class="modal fade" id="testResultsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Source Test Results</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="testResultsBody">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Populate modal with results
    const resultsBody = document.getElementById('testResultsBody');
    
    let html = `
        <div class="alert alert-${data.success ? 'success' : 'danger'}">
            ${data.message}
        </div>
        
        <h6>Source Details</h6>
        <ul class="list-group mb-3">
    `;
    
    // Add source details
    for (const [key, value] of Object.entries(data.sourceDetails)) {
        html += `<li class="list-group-item"><strong>${key}:</strong> ${value}</li>`;
    }
    
    html += '</ul>';
    
    // Add sample data if available
    if (data.sampleData) {
        // Add summary info
        html += '<h6>Summary</h6>';
        html += '<ul class="list-group mb-3">';
        
        if (data.sampleData.articles) {
            html += `<li class="list-group-item"><strong>Articles Found:</strong> ${data.sampleData.articles.length}</li>`;
        } else if (data.sampleData.items) {
            html += `<li class="list-group-item"><strong>Items Found:</strong> ${data.sampleData.items.length}</li>`;
        }
        
        // Add last fetch time
        const fetchTime = new Date().toLocaleString();
        html += `<li class="list-group-item"><strong>Test Performed:</strong> ${fetchTime}</li>`;
        html += '</ul>';
        
        // Show sample data
        html += '<h6>Sample Data</h6>';
        html += '<pre class="border p-3 bg-light">' + JSON.stringify(data.sampleData, null, 2) + '</pre>';
    }
    
    resultsBody.innerHTML = html;
    
    // Show modal
    const testModal = new bootstrap.Modal(document.getElementById('testResultsModal'));
    testModal.show();
}
