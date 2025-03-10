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
    // Initialize Bootstrap modals
    sourceModal = new bootstrap.Modal(document.getElementById('sourceModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Initialize filters and load sources
    initializeFilters();
    loadSources();
    setupEventListeners();

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
    
    currentSources.forEach(source => {
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

// Setup event listeners
function setupEventListeners() {
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
            feedUrl: document.getElementById('sourceFeedUrl').value,
            apiConfig: document.getElementById('sourceApiConfig').value,
            isActive: document.getElementById('sourceActive').checked
        };

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
                document.getElementById('sourceFeedUrl').value = source.feedUrl || '';
                document.getElementById('sourceApiConfig').value = source.apiConfig ? JSON.stringify(source.apiConfig, null, 2) : '';
                document.getElementById('sourceActive').checked = source.isActive;
                
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
                    alert('Source test successful!');
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
