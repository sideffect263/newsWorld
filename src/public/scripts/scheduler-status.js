// Format date to local string
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
}

// Format time until next scan
function formatTimeUntil(nextScan) {
    if (!nextScan) return '-';
    const now = new Date();
    const next = new Date(nextScan);
    const diff = next - now;
    
    if (diff < 0) {
        return 'Now';
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

// Format schedule for display
function formatSchedule(schedule) {
    if (!schedule) return '-';
    
    // Convert cron expression to human-readable format
    const parts = schedule.split(' ');
    if (parts.length !== 5) return schedule;
    
    const [minute, hour, day, month, weekday] = parts;
    
    if (minute === '*' && hour === '*') return 'Every minute';
    if (minute === '*/15' && hour === '*') return 'Every 15 minutes';
    if (minute === '*/30' && hour === '*') return 'Every 30 minutes';
    if (minute === '0' && hour === '*') return 'Every hour';
    
    return schedule;
}

// Update method card
function updateMethodCard(method, data) {
    const statusIndicator = document.getElementById(`${method}StatusIndicator`);
    const status = document.getElementById(`${method}Status`);
    const schedule = document.getElementById(`${method}Schedule`);
    const nextScan = document.getElementById(`${method}NextScan`);
    const sourceCount = document.getElementById(`${method}SourceCount`);
    const sourcesList = document.getElementById(`${method}Sources`);

    // Update status
    statusIndicator.className = `status-indicator ${data.isRunning ? 'status-running' : 'status-stopped'}`;
    status.textContent = data.isRunning ? 'Running' : 'Stopped';

    // Update schedule info
    schedule.textContent = formatSchedule(data.schedule);
    nextScan.textContent = formatTimeUntil(data.nextScan);
    sourceCount.textContent = data.sourceCount;

    // Update sources list
    sourcesList.innerHTML = '';
    const methodSources = data.sources.filter(s => s.method === method);
    
    methodSources.forEach(source => {
        const sourceItem = document.createElement('div');
        sourceItem.className = 'list-group-item source-item';
        
        const statusClass = source.fetchStatus.success ? 'source-status-success' : 'source-status-error';
        const nextSourceScan = calculateNextSourceScan(source.lastFetched, source.fetchFrequency);
        
        sourceItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${source.name}</h6>
                    <small class="text-muted">Last fetched: ${formatDate(source.lastFetched)}</small>
                    <br>
                    <small class="text-muted">Next scan: ${formatTimeUntil(nextSourceScan)}</small>
                </div>
                <span class="${statusClass}">
                    <i class="bi ${source.fetchStatus.success ? 'bi-check-circle' : 'bi-x-circle'}"></i>
                </span>
            </div>
            <small class="text-muted">${source.fetchStatus.message}</small>
        `;
        
        sourcesList.appendChild(sourceItem);
    });
}

// Calculate next scan time for a source based on its fetch frequency
function calculateNextSourceScan(lastFetched, fetchFrequency) {
    if (!lastFetched || !fetchFrequency) return null;
    
    const lastFetch = new Date(lastFetched);
    const frequencyMinutes = parseInt(fetchFrequency);
    
    if (isNaN(frequencyMinutes)) return null;
    
    const nextScan = new Date(lastFetch.getTime() + (frequencyMinutes * 60000));
    return nextScan;
}

// Fetch and update status data
async function fetchStatusData() {
    try {
        const response = await fetch('/status/data');
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            
            // Update overall status
            const overallStatusIndicator = document.getElementById('overallStatusIndicator');
            const overallStatus = document.getElementById('overallStatus');
            const isRunning = data.scheduler.running;
            
            overallStatusIndicator.className = `status-indicator ${isRunning ? 'status-running' : 'status-stopped'}`;
            overallStatus.textContent = isRunning ? 'Running' : 'Stopped';
            
            // Update counts
            document.getElementById('activeSourceCount').textContent = data.counts.activeSources;
            document.getElementById('totalArticleCount').textContent = data.counts.articles;
            
            // Update method cards
            const methods = data.scheduler.detailedInfo.methods;
            Object.entries(methods).forEach(([method, methodData]) => {
                updateMethodCard(method, {
                    ...methodData,
                    sources: data.scheduler.detailedInfo.sources
                });
            });
        }
    } catch (error) {
        console.error('Error fetching status data:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load header
    fetch('/components/header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header').innerHTML = html;
        });

    // Set up refresh button
    document.getElementById('refreshBtn').addEventListener('click', fetchStatusData);

    // Initial fetch
    fetchStatusData();

    // Auto-refresh every 30 seconds
    setInterval(fetchStatusData, 30000);
}); 