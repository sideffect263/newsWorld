// Load header
fetch('/components/header.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('header').innerHTML = html;
    });

// Load latest news preview
async function loadLatestNews() {
    try {
        const response = await fetch('/api/news/latest?limit=3');
        const result = await response.json();
        
        if (result.success) {
            const newsContainer = document.getElementById('latestNewsPreview');
            newsContainer.innerHTML = result.data.map(article => `
                <div class="col-md-4">
                    <div class="card news-preview">
                        <img src="${article.imageUrl}" 
                             class="card-img-top" alt="${article.title}">
                        <div class="category-badge">${article.categories[0]}</div>
                        <div class="card-body">
                            <h5 class="card-title">${article.title}</h5>
                            <p class="card-text">${article.description || ''}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${new Date(article.publishedAt).toLocaleDateString()}</small>
                                <a href="/news/${article._id}" class="btn btn-sm btn-outline-primary">Read More</a>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading latest news:', error);
    }
}

// Load latest news when page loads
document.addEventListener('DOMContentLoaded', loadLatestNews); 