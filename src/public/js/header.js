// Handle sources toggle
let showingAllSources = true;
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleSourcesBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            showingAllSources = !showingAllSources;
            const icon = document.getElementById('toggleSourcesIcon');
            const text = document.getElementById('toggleSourcesText');
            
            if (showingAllSources) {
                icon.classList.remove('bi-toggle-on');
                icon.classList.add('bi-toggle-off');
                text.textContent = 'All Sources';
            } else {
                icon.classList.remove('bi-toggle-off');
                icon.classList.add('bi-toggle-on');
                text.textContent = 'My Sources';
            }
            
            // Update the current page based on the toggle state
            updatePageContent(showingAllSources);
        });
    }
});

// Function to update page content based on toggle state
function updatePageContent(showAll) {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.set('filter', showAll ? 'all' : 'mine');
    
    // Update URL without reloading the page
    const newUrl = `${path}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // Trigger page-specific content update
    const event = new CustomEvent('sourceFilterChanged', {
        detail: { showAll }
    });
    document.dispatchEvent(event);
} 