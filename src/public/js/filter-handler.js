// Listen for filter changes
document.addEventListener('sourceFilterChanged', async function(e) {
    const showAll = e.detail.showAll;
    const path = window.location.pathname;
    
    // Update content based on current page
    switch(true) {
        case path.includes('/news'):
            await updateNews(showAll);
            break;
        case path.includes('/sources'):
            await updateSources(showAll);
            break;
        case path.includes('/sentiment'):
            await updateSentiment(showAll);
            break;
        case path.includes('/trends'):
            await updateTrends(showAll);
            break;
    }
});

// Update news content
async function updateNews(showAll) {
    try {
        const response = await fetch(`/api/news?filter=${showAll ? 'all' : 'mine'}`);
        const data = await response.json();
        
        if (data.success) {
            // Update the news grid
            const newsGrid = document.getElementById('news-grid');
            if (newsGrid) {
                newsGrid.innerHTML = data.data.map(article => createNewsCard(article)).join('');
            }
            
            // Update pagination if it exists
            updatePagination(data.total);
        }
    } catch (error) {
        console.error('Error updating news:', error);
    }
}

// Update sources content
async function updateSources(showAll) {
    try {
        const response = await fetch(`/api/sources?filter=${showAll ? 'all' : 'mine'}`);
        const data = await response.json();
        
        if (data.success) {
            // Update the sources grid
            const sourcesGrid = document.getElementById('sources-grid');
            if (sourcesGrid) {
                sourcesGrid.innerHTML = data.data.map(source => createSourceCard(source)).join('');
            }
        }
    } catch (error) {
        console.error('Error updating sources:', error);
    }
}

// Update sentiment content
async function updateSentiment(showAll) {
    try {
        const response = await fetch(`/api/sentiment?filter=${showAll ? 'all' : 'mine'}`);
        const data = await response.json();
        
        if (data.success) {
            // Update sentiment charts and data
            updateSentimentCharts(data.data);
        }
    } catch (error) {
        console.error('Error updating sentiment:', error);
    }
}

// Update trends content
async function updateTrends(showAll) {
    try {
        const response = await fetch(`/api/trends?filter=${showAll ? 'all' : 'mine'}`);
        const data = await response.json();
        
        if (data.success) {
            // Update trends visualizations
            updateTrendsVisualizations(data.data);
        }
    } catch (error) {
        console.error('Error updating trends:', error);
    }
}

// Helper function to create news card HTML
function createNewsCard(article) {
    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${article.title}</h5>
                    <p class="card-text">${article.description || ''}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${new Date(article.publishedAt).toLocaleDateString()}</small>
                        <a href="/article/${article._id}" class="btn btn-primary btn-sm">Read More</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to create source card HTML
function createSourceCard(source) {
    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${source.name}</h5>
                    <p class="card-text">${source.description || ''}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-primary">${source.category}</span>
                        <button class="btn btn-outline-primary btn-sm" onclick="toggleSourceSubscription('${source._id}')">
                            ${source.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to update pagination
function updatePagination(total) {
    const paginationElement = document.querySelector('.pagination');
    if (paginationElement) {
        // Implementation depends on your pagination structure
        // This is just a placeholder
        const pageCount = Math.ceil(total / 20); // Assuming 20 items per page
        // Update pagination UI
    }
}

// Helper function to update sentiment charts
function updateSentimentCharts(data) {
    // Implementation depends on your charting library
    // Update each chart with new data
    if (window.sentimentTimeline) {
        window.sentimentTimeline.data = data.timeline;
        window.sentimentTimeline.update();
    }
    
    if (window.categoryChart) {
        window.categoryChart.data = data.categoryAverages;
        window.categoryChart.update();
    }
    
    if (window.sourceChart) {
        window.sourceChart.data = data.sourceAverages;
        window.sourceChart.update();
    }
}

// Helper function to update trends visualizations
function updateTrendsVisualizations(data) {
    // Implementation depends on your visualization library
    // Update each visualization with new data
    if (window.keywordCloud) {
        window.keywordCloud.data = data.keywords;
        window.keywordCloud.update();
    }
    
    if (window.entityChart) {
        window.entityChart.data = data.entities;
        window.entityChart.update();
    }
    
    if (window.categoryTrends) {
        window.categoryTrends.data = data.categories;
        window.categoryTrends.update();
    }
} 