// Load header
fetch('/components/header.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('header').innerHTML = html;
        
        // After header is loaded, set up the refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                fetchStatusData();
                fetchArticlesByDay();
            });
        }
    });

// DOM Elements
let refreshBtn = null;
let triggerFetchBtn = null;
let loading = null;

// Chart instance
let articlesChart = null;

// Format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${remainingSeconds}s`;
    
    return result;
}

// Format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Update UI with status data
function updateUI(data) {
    // Server Status
    document.getElementById('platform').textContent = data.system.platform;
    document.getElementById('nodeVersion').textContent = data.system.nodeVersion;
    document.getElementById('uptime').textContent = formatUptime(data.system.uptime);
    document.getElementById('cpuCores').textContent = data.system.cpus;
    
    // Set server status indicator
    const serverStatusIndicator = document.getElementById('serverStatusIndicator');
    serverStatusIndicator.className = 'status-indicator status-good';
    
    // Database Status
    document.getElementById('dbConnection').textContent = data.database.connected ? 'Connected' : 'Disconnected';
    document.getElementById('dbHost').textContent = data.database.host || '-';
    document.getElementById('dbName').textContent = data.database.name || '-';
    
    // Set database status indicator
    const dbStatusIndicator = document.getElementById('dbStatusIndicator');
    dbStatusIndicator.className = `status-indicator ${data.database.connected ? 'status-good' : 'status-error'}`;
    
    // System Resources
    const memoryUsage = Math.round((data.system.memoryUsage.rss / data.system.totalMemory) * 100);
    const memoryUsageBar = document.getElementById('memoryUsageBar');
    memoryUsageBar.style.width = `${memoryUsage}%`;
    memoryUsageBar.textContent = `${memoryUsage}% (${formatBytes(data.system.memoryUsage.rss)})`;
    memoryUsageBar.setAttribute('aria-valuenow', memoryUsage);
    
    // CPU Load
    const cpuLoad = Math.round(data.system.loadAvg[0] * 100 / data.system.cpus);
    const cpuLoadBar = document.getElementById('cpuLoadBar');
    cpuLoadBar.style.width = `${cpuLoad}%`;
    cpuLoadBar.textContent = `${cpuLoad}%`;
    cpuLoadBar.setAttribute('aria-valuenow', cpuLoad);
    
    // Set color based on load
    if (cpuLoad < 50) {
        cpuLoadBar.className = 'progress-bar bg-success';
    } else if (cpuLoad < 80) {
        cpuLoadBar.className = 'progress-bar bg-warning';
    } else {
        cpuLoadBar.className = 'progress-bar bg-danger';
    }
    
    // Scheduler Status
    document.getElementById('schedulerStatus').textContent = data.scheduler.running ? 'Running' : 'Stopped';
    document.getElementById('schedulerSchedule').textContent = data.scheduler.schedule || '-';
    
    // Content Statistics
    document.getElementById('articleCount').textContent = data.counts.articles.toLocaleString();
    document.getElementById('sourceCount').textContent = data.counts.sources.toLocaleString();
    document.getElementById('activeSourceCount').textContent = data.counts.activeSources.toLocaleString();
    document.getElementById('userCount').textContent = data.counts.users.toLocaleString();
    
    // Latest Articles
    const latestArticlesList = document.getElementById('latestArticlesList');
    latestArticlesList.innerHTML = '';
    
    if (data.latestArticles.length === 0) {
        latestArticlesList.innerHTML = '<li class="list-group-item text-center">No articles found</li>';
    } else {
        data.latestArticles.forEach(article => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            
            const publishDate = new Date(article.publishedAt);
            
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${article.title}</h6>
                        <small class="text-muted">${article.source.name}</small>
                    </div>
                    <small class="text-nowrap">${publishDate.toLocaleDateString()}</small>
                </div>
            `;
            
            latestArticlesList.appendChild(li);
        });
    }
    
    // Top Articles
    const topArticlesList = document.getElementById('topArticlesList');
    topArticlesList.innerHTML = '';
    
    if (data.topArticles.length === 0) {
        topArticlesList.innerHTML = '<li class="list-group-item text-center">No articles found</li>';
    } else {
        data.topArticles.forEach(article => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            
            const publishDate = new Date(article.publishedAt);
            
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${article.title}</h6>
                        <small class="text-muted">${article.source.name}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">${article.viewCount} views</span>
                </div>
            `;
            
            topArticlesList.appendChild(li);
        });
    }
    
    // Last Updated
    document.getElementById('lastUpdated').textContent = new Date(data.timestamp).toLocaleString();
}

// Fetch articles by day data and update chart
async function fetchArticlesByDay() {
    try {
        const response = await fetch('/status/articles');
        const result = await response.json();
        
        if (result.success) {
            updateArticlesChart(result.data.byDay);
        }
    } catch (error) {
        console.error('Error fetching articles data:', error);
    }
}

// Update articles chart
function updateArticlesChart(data) {
    const ctx = document.getElementById('articlesChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (articlesChart) {
        articlesChart.destroy();
    }
    
    // Prepare data for chart
    const labels = data.map(item => item.date);
    const counts = data.map(item => item.count);
    
    // Create new chart
    articlesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Articles Published',
                data: counts,
                backgroundColor: 'rgba(13, 110, 253, 0.2)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Fetch status data
async function fetchStatusData() {
    loading.classList.remove('d-none');
    
    try {
        const response = await fetch('/status/data');
        const result = await response.json();
        
        if (result.success) {
            updateUI(result.data);
        }
    } catch (error) {
        console.error('Error fetching status data:', error);
        alert('Failed to fetch status data. Please try again later.');
    } finally {
        loading.classList.add('d-none');
    }
}

// Trigger manual fetch (admin only)
async function triggerManualFetch() {
    if (!confirm('Are you sure you want to trigger a manual fetch? This may take some time.')) {
        return;
    }
    
    loading.classList.remove('d-none');
    
    try {
        const response = await fetch('/status/fetch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Manual fetch completed successfully!');
            fetchStatusData();
        } else {
            alert('Failed to trigger manual fetch: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error triggering manual fetch:', error);
        alert('Failed to trigger manual fetch. Please try again later.');
    } finally {
        loading.classList.add('d-none');
    }
}

// Check if user is admin
async function checkAdminStatus() {
    try {
        // This would typically check a JWT token or session
        // For now, we'll just hide the admin controls
        document.getElementById('adminControls').classList.add('d-none');
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    refreshBtn = document.getElementById('refreshBtn');
    triggerFetchBtn = document.getElementById('triggerFetchBtn');
    loading = document.getElementById('loading');
    
    // Fetch initial data
    fetchStatusData();
    fetchArticlesByDay();
    checkAdminStatus();
    
    // Set up event listeners only if elements exist
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchStatusData();
            fetchArticlesByDay();
        });
    }
    
    if (triggerFetchBtn) {
        triggerFetchBtn.addEventListener('click', triggerManualFetch);
    }
    
    // Set up auto-refresh (every 30 seconds)
    setInterval(fetchStatusData, 30000);
});
