// Initialize the search interface when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if search modal already exists to avoid duplicates
    if (!document.getElementById('search-modal')) {
        addSearchModalButton();
    }
    
    // Add keyboard shortcuts
    setupKeyboardShortcuts();
});

// API utilities
async function fetchAPI(endpoint, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${endpoint}${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok (${response.status})`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API error (${endpoint}):`, error);
        throw error;
    }
}

// UI helper functions
function showMessage(type, message) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = `<div class="${type}-message">${message}</div>`;
    return resultsContainer;
}

function addSearchModalButton() {
    const controlsRight = document.querySelector('.at-controls-right');
    if (!controlsRight) return;
    
    // Check if button already exists
    if (controlsRight.querySelector('.open-search-modal-button')) return;
    
    const searchButton = document.createElement('button');
    searchButton.className = 'open-search-modal-button';
    searchButton.innerHTML = '<i class="fas fa-search"></i> Find Tabs';
    searchButton.onclick = openSearchModal;
    
    controlsRight.insertBefore(searchButton, controlsRight.firstChild);
}

// Modal control functions
function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('search-input').focus();
    
    // Load recent searches
    displayRecentSearches();
    
    // Setup auto search
    setupAutoSearch();
    
    // Load recent tabs
    displayRecentTabs();
    
    // Load popular tabs if tab is active and empty
    const popularTab = document.querySelector('.modal-tab-button:nth-child(2)');
    const isPopularTabActive = popularTab && popularTab.classList.contains('active');
    const popularTabsContainer = document.getElementById('popular-tabs');
    
    if (isPopularTabActive && popularTabsContainer && popularTabsContainer.children.length === 0) {
        loadPopularTabs();
    }
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) modal.style.display = 'none';
}

// Tab navigation functions
function showSearchTab() {
    document.querySelector('.modal-tab-button:first-child').classList.add('active');
    document.querySelector('.modal-tab-button:nth-child(2)').classList.remove('active');
    document.getElementById('search-results').style.display = 'block';
    document.getElementById('popular-tabs-container').style.display = 'none';
}

function showPopularTab() {
    document.querySelector('.modal-tab-button:first-child').classList.remove('active');
    document.querySelector('.modal-tab-button:nth-child(2)').classList.add('active');
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('popular-tabs-container').style.display = 'block';
    loadPopularTabs();
}

// Search functionality
function getSearchParams() {
    return {
        query: document.getElementById('search-input').value,
        genre: document.getElementById('genre-filter')?.value || '',
        difficulty: document.getElementById('difficulty-filter')?.value || '',
        sort: document.getElementById('sort-by')?.value || 'popular'
    };
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function enhancedSearch(page = 1) {
    const { query, genre, difficulty, sort } = getSearchParams();
    
    // Add to recent searches if not empty
    if (query && query.trim() !== '') {
        addToRecentSearches(query);
    }
    
    // Initialize search cache if needed
    if (!window.searchCache) {
        window.searchCache = {};
    }
    
    showMessage('loading', 'Searching...');
    showSearchTab();
    
    try {
        // Check cache first
        const cacheKey = `${query}-${genre}-${difficulty}-${sort}-${page}`;
        if (window.searchCache[cacheKey]) {
            displaySearchResults(window.searchCache[cacheKey]);
            return;
        }
        
        // Determine endpoint based on query
        const endpoint = query ? '/api/tabs/search' : '/api/tabs';
        const params = { page };
        
        if (query) params.query = query;
        if (genre) params.genre = genre;
        if (difficulty) params.difficulty = difficulty;
        if (sort) params.sort = sort;
        
        const data = await fetchAPI(endpoint, params);
        
        // Cache results for 5 minutes
        window.searchCache[cacheKey] = data;
        setTimeout(() => {
            delete window.searchCache[cacheKey];
        }, 5 * 60 * 1000);
        
        displaySearchResults(data);
        
        // If no results, suggest alternatives
        const hasResults = (data.tabs && data.tabs.length > 0) || 
                          (Array.isArray(data) && data.length > 0);
                          
        if (!hasResults && query && query.length > 0) {
            suggestAlternativeSearches(query);
        }
    } catch (error) {
        showMessage('error', `
            <p>Error searching for tabs: ${error.message}</p>
            <p>Please ensure the server is running and try again.</p>
            <button class="tab-load-button" onclick="testServerConnection()">Test Server Connection</button>
        `);
    }
}

function searchTabs(page = 1) {
    enhancedSearch(page);
}

async function suggestAlternativeSearches(originalQuery) {
    if (!originalQuery || originalQuery.length < 3) return;
    
    const resultsContainer = document.getElementById('search-results');
    const noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'no-results';
    
    // Create variations of the original query
    const variations = [];
    
    // Remove special characters
    const cleanQuery = originalQuery.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    if (cleanQuery !== originalQuery) variations.push(cleanQuery);
    
    // Try first word only
    const words = originalQuery.split(/\s+/);
    if (words.length > 1) {
        variations.push(words[0]);
        
        // Try last word only
        if (words.length > 2) variations.push(words[words.length - 1]);
    }
    
    // Remove spaces
    const noSpaces = originalQuery.replace(/\s+/g, '');
    if (noSpaces !== originalQuery) variations.push(noSpaces);
    
    // Replace spaces with underscores
    const withUnderscores = originalQuery.replace(/\s+/g, '_');
    if (withUnderscores !== originalQuery) variations.push(withUnderscores);
    
    // Check each variation for results
    const suggestedSearches = [];
    for (const variation of variations) {
        try {
            const data = await fetchAPI('/api/tabs/search', { query: variation });
            const hasResults = (data.tabs && data.tabs.length > 0) || 
                              (Array.isArray(data) && data.length > 0);
                              
            if (hasResults) {
                suggestedSearches.push(variation);
            }
        } catch (error) {
            console.error('Error checking search variation:', error);
        }
    }
    
    // Show suggestions or tips
    noResultsDiv.innerHTML = `
        <p>No results found for "${originalQuery}".</p>
        ${suggestedSearches.length > 0 ? `
            <p>Did you mean:</p>
            <div class="search-suggestions">
                ${suggestedSearches.map(suggestion => `
                    <button class="suggestion-button" onclick="document.getElementById('search-input').value = '${suggestion}'; enhancedSearch();">
                        ${suggestion}
                    </button>
                `).join('')}
            </div>
        ` : `
            <p>Try:</p>
            <ul class="search-tips">
                <li>Using simpler terms</li>
                <li>Checking for typos</li>
                <li>Searching by artist or title separately</li>
                <li>Using fewer keywords</li>
            </ul>
        `}
    `;
    
    resultsContainer.appendChild(noResultsDiv);
}

// Display functions
function displaySearchResults(data) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    
    // Handle different data formats
    const tabs = data.tabs || data;
    
    if (!tabs || tabs.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No tabs found. Try a different search.</div>';
        return;
    }
    
    // Create results header
    const resultHeader = document.createElement('h3');
    resultHeader.className = 'results-header';
    resultHeader.textContent = `Found ${tabs.length} tabs`;
    resultsContainer.appendChild(resultHeader);
    
    // Create tab grid
    const tabGrid = document.createElement('div');
    tabGrid.className = 'tab-grid';
    
    // Add tab cards to grid
    tabs.forEach(tab => {
        const tabCard = createTabCard(tab);
        tabGrid.appendChild(tabCard);
    });
    
    resultsContainer.appendChild(tabGrid);
    
    // Add pagination if available
    if (data.pagination) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        
        // Show pagination info
        paginationContainer.innerHTML = `
            <div class="pagination-info">
                Showing ${tabs.length} of ${data.pagination.total} tabs
                (Page ${data.pagination.page} of ${data.pagination.pages})
            </div>
        `;
        
        // Add pagination controls
        if (data.pagination.pages > 1) {
            const paginationControls = document.createElement('div');
            paginationControls.className = 'pagination-controls';
            
            // Previous page button
            if (data.pagination.page > 1) {
                const prevButton = document.createElement('button');
                prevButton.className = 'pagination-button';
                prevButton.innerHTML = '&laquo; Previous';
                prevButton.onclick = () => searchTabs(data.pagination.page - 1);
                paginationControls.appendChild(prevButton);
            }
            
            // Next page button
            if (data.pagination.page < data.pagination.pages) {
                const nextButton = document.createElement('button');
                nextButton.className = 'pagination-button';
                nextButton.innerHTML = 'Next &raquo;';
                nextButton.onclick = () => searchTabs(data.pagination.page + 1);
                paginationControls.appendChild(nextButton);
            }
            
            paginationContainer.appendChild(paginationControls);
        }
        
        resultsContainer.appendChild(paginationContainer);
    }
}

// Tab card creation
function createTabCard(tab) {
    if (!tab) return document.createElement('div');
    
    const tabCard = document.createElement('div');
    tabCard.className = 'tab-card';
    tabCard.setAttribute('data-id', tab.id || '');
    
    // Determine instrument icon
    let instrumentIcon = 'fas fa-guitar';
    if (tab.tags) {
        if (tab.tags.includes('bass')) {
            instrumentIcon = 'fas fa-guitar fa-flip-horizontal';
        } else if (tab.tags.includes('drums')) {
            instrumentIcon = 'fas fa-drum';
        }
    }
    
    // Get difficulty info
    const difficultyMap = {
        'Beginner': { class: 'difficulty-beginner', icon: 'baby' },
        'Intermediate': { class: 'difficulty-intermediate', icon: 'user' },
        'Advanced': { class: 'difficulty-advanced', icon: 'user-graduate' },
        'Expert': { class: 'difficulty-expert', icon: 'crown' }
    };
    
    const difficultyInfo = tab.difficulty ? (difficultyMap[tab.difficulty] || {}) : {};
    const difficultyClass = difficultyInfo.class || '';
    const difficultyIcon = difficultyInfo.icon || 'user';
    
    // Ensure file URL is properly formatted
    let safeFileUrl = tab.fileUrl || '';
    if (!safeFileUrl.startsWith('http') && !safeFileUrl.startsWith('/')) {
        safeFileUrl = '/' + safeFileUrl;
    }
    safeFileUrl = safeFileUrl.replace(/'/g, "\\'");
    
    const fileFormat = tab.fileFormat ? tab.fileFormat.toUpperCase() : 'GP';
    
    // Create card HTML
    tabCard.innerHTML = `
        <div class="tab-card-header">
            <div class="tab-instrument">
                <i class="${instrumentIcon}"></i>
            </div>
            <div class="tab-title">${tab.title || 'Untitled'}</div>
        </div>
        <div class="tab-card-body">
            <div class="tab-artist">${tab.artist || 'Unknown Artist'}</div>
            ${tab.album ? `<div class="tab-album"><i class="fas fa-compact-disc"></i> ${tab.album}</div>` : ''}
            ${tab.genre ? `<div class="tab-genre"><i class="fas fa-music"></i> ${tab.genre}</div>` : ''}
            ${tab.difficulty ? `<div class="tab-difficulty ${difficultyClass}">
                <i class="fas fa-${difficultyIcon}"></i> ${tab.difficulty}
            </div>` : ''}
            <div class="tab-info-row">
                <div class="tab-views"><i class="fas fa-eye"></i> ${(tab.views || 0).toLocaleString()}</div>
                <div class="tab-format"><i class="fas fa-file-alt"></i> ${fileFormat}</div>
            </div>
        </div>
        <div class="tab-card-footer">
            <a href="/?file=${encodeURIComponent(safeFileUrl)}" class="tab-load-button" onclick="closeSearchModal()">
                <i class="fas fa-play"></i> Load Tab
            </a>
        </div>
    `;
    
    // Add click handler for the card
    tabCard.addEventListener('click', function(e) {
        if (e.target.tagName !== 'A' && !e.target.closest('a')) {
            closeSearchModal();
            window.location.href = `/?file=${encodeURIComponent(safeFileUrl)}`;
        }
    });
    
    return tabCard;
}

// Popular tabs loading
async function loadPopularTabs() {
    const popularTabsContainer = document.getElementById('popular-tabs');
    if (!popularTabsContainer) return;
    
    popularTabsContainer.innerHTML = '<div class="loading-indicator">Loading popular tabs...</div>';
    
    try {
        const data = await fetchAPI('/api/tabs/popular');
        popularTabsContainer.innerHTML = '';
        
        // Extract tabs from response
        let tabsArray = [];
        if (Array.isArray(data)) {
            tabsArray = data;
        } else if (data && typeof data === 'object') {
            if (Array.isArray(data.tabs)) {
                tabsArray = data.tabs;
            } else {
                tabsArray = Object.values(data).filter(item => item && typeof item === 'object');
            }
        }
        
        if (!tabsArray || tabsArray.length === 0) {
            popularTabsContainer.innerHTML = '<div class="no-results">No popular tabs found.</div>';
            return;
        }
        
        // Create tab cards
        tabsArray.forEach(tab => {
            if (tab && typeof tab === 'object') {
                popularTabsContainer.appendChild(createTabCard(tab));
            }
        });
    } catch (error) {
        console.error('Popular tabs error:', error);
        popularTabsContainer.innerHTML = `<div class="error-message">Error loading popular tabs: ${error.message}</div>`;
    }
}

// Recent tabs functionality
let recentTabs = [];
const MAX_RECENT_TABS = 5;

function addToRecentTabs(tab) {
    // Skip if invalid tab
    if (!tab || !tab.id) return;
    
    // Remove existing entry if present
    recentTabs = recentTabs.filter(t => t.id !== tab.id);
    
    // Add to beginning of array
    recentTabs.unshift(tab);
    
    // Limit to max tabs
    if (recentTabs.length > MAX_RECENT_TABS) {
        recentTabs.pop();
    }
    
    // Store in localStorage
    try {
        localStorage.setItem('recentTabs', JSON.stringify(recentTabs));
    } catch (error) {
        console.error('Error saving recent tabs:', error);
    }
}

function loadRecentTabs() {
    try {
        const saved = localStorage.getItem('recentTabs');
        if (saved) {
            recentTabs = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading recent tabs:', error);
        recentTabs = [];
    }
}

function displayRecentTabs() {
    loadRecentTabs();
    
    if (recentTabs.length === 0) return;
    
    // Check if section already exists
    if (document.querySelector('.recent-tabs-section')) {
        document.querySelector('.recent-tabs-section').remove();
    }
    
    const recentTabsSection = document.createElement('div');
    recentTabsSection.className = 'recent-tabs-section';
    recentTabsSection.innerHTML = '<h3>Recently Viewed</h3>';
    
    const recentTabsList = document.createElement('div');
    recentTabsList.className = 'recent-tabs-list';
    
    recentTabs.forEach(tab => {
        const recentTabItem = document.createElement('div');
        recentTabItem.className = 'recent-tab-item';
        
        const safeFileUrl = tab.fileUrl || '';
        
        recentTabItem.innerHTML = `
            <div class="recent-tab-icon">
                <i class="fas fa-guitar"></i>
            </div>
            <div class="recent-tab-info">
                <div class="recent-tab-title">${tab.title || 'Untitled'}</div>
                <div class="recent-tab-artist">${tab.artist || 'Unknown Artist'}</div>
            </div>
            <a href="/?file=${encodeURIComponent(safeFileUrl)}" class="recent-tab-load">
                <i class="fas fa-play"></i>
            </a>
        `;
        
        recentTabItem.addEventListener('click', function(e) {
            if (e.target.tagName !== 'A' && !e.target.closest('a')) {
                closeSearchModal();
                window.location.href = `/?file=${encodeURIComponent(safeFileUrl)}`;
            }
        });
        
        recentTabsList.appendChild(recentTabItem);
    });
    
    recentTabsSection.appendChild(recentTabsList);
    
    // Insert at top of modal
    const tabsContainer = document.querySelector('.modal-tabs-container');
    if (tabsContainer) {
        tabsContainer.parentNode.insertBefore(recentTabsSection, tabsContainer);
    }
}

// Recent searches functionality
let recentSearches = [];
const MAX_RECENT_SEARCHES = 5;

function addToRecentSearches(query) {
    if (!query || query.trim() === '') return;
    
    const trimmedQuery = query.trim();
    
    // Remove existing entry if present
    recentSearches = recentSearches.filter(q => q !== trimmedQuery);
    
    // Add to beginning of array
    recentSearches.unshift(trimmedQuery);
    
    // Limit to max searches
    if (recentSearches.length > MAX_RECENT_SEARCHES) {
        recentSearches.pop();
    }
    
    // Store in localStorage
    try {
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    } catch (error) {
        console.error('Error saving recent searches:', error);
    }
}

function loadRecentSearches() {
    try {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            recentSearches = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading recent searches:', error);
        recentSearches = [];
    }
}

function displayRecentSearches() {
    loadRecentSearches();
    
    if (recentSearches.length === 0) return;
    
    // Check if section already exists
    if (document.querySelector('.recent-searches-section')) {
        document.querySelector('.recent-searches-section').remove();
    }
    
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    
    const recentSearchesSection = document.createElement('div');
    recentSearchesSection.className = 'recent-searches-section';
    
    recentSearchesSection.innerHTML = `
        <div class="recent-searches-header">
            <h4>Recent Searches</h4>
            <button class="clear-searches-button" onclick="clearRecentSearches()">Clear</button>
        </div>
        <div class="recent-searches-list">
            ${recentSearches.map(search => `
                <button class="recent-search-item" onclick="document.getElementById('search-input').value = '${search}'; enhancedSearch();">
                    <i class="fas fa-history"></i>
                    <span>${search}</span>
                </button>
            `).join('')}
        </div>
    `;
    
    searchContainer.insertAdjacentElement('afterend', recentSearchesSection);
}

function clearRecentSearches() {
    recentSearches = [];
    localStorage.removeItem('recentSearches');
    const recentSearchesSection = document.querySelector('.recent-searches-section');
    if (recentSearchesSection) {
        recentSearchesSection.remove();
    }
}

function setupAutoSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    // Remove existing listeners to avoid duplicates
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    // Add debounced search on input
    const debouncedSearch = debounce(() => {
        if (newSearchInput.value.trim().length > 1) {
            enhancedSearch();
        }
    }, 500);
    
    newSearchInput.addEventListener('input', debouncedSearch);
    
    // Handle form submission
    const searchForm = newSearchInput.closest('form');
    if (searchForm) {
        searchForm.onsubmit = function(e) {
            e.preventDefault();
            enhancedSearch();
        };
    }
}

// Server connection test
async function testServerConnection() {
    showMessage('loading', 'Testing connection to server...');
    
    try {
        const data = await fetchAPI('/api/test');
        showMessage('success', `
            <h3>Server Connection Successful</h3>
            <p>Server is running correctly.</p>
            <p>Metadata count: ${data.metadataCount}</p>
            <pre>${JSON.stringify(data.sampleMetadata, null, 2)}</pre>
            <button class="tab-load-button" onclick="searchTabs()">Try Search Again</button>
        `);
    } catch (error) {
        showMessage('error', `
            <h3>Server Connection Failed</h3>
            <p>Could not connect to the server: ${error.message}</p>
            <p>Please check that the server is running at the correct port.</p>
        `);
    }
}

// Toast notifications
function showToast(type, message, duration = 3000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.loading-toast, .error-toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `${type}-toast`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Tab loading with toast feedback
function loadTab(fileUrl) {
    try {
        showToast('loading', '<i class="fas fa-spinner fa-spin"></i> Loading tab...');
        closeSearchModal();
        window.location.href = `/?file=${encodeURIComponent(fileUrl)}`;
    } catch (error) {
        showToast('error', `<i class="fas fa-exclamation-circle"></i> Error loading tab: ${error.message}`);
        console.error('Error loading tab:', error);
    }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Escape to close modal
        if (e.key === 'Escape') {
            closeSearchModal();
        }
        
        // Ctrl/Cmd+F to open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            openSearchModal();
        }
    });
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('search-modal');
    if (event.target === modal) {
        closeSearchModal();
    }
});

window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.searchTabs = searchTabs;
window.enhancedSearch = enhancedSearch;
window.testServerConnection = testServerConnection;
window.loadPopularTabs = loadPopularTabs;
window.showSearchTab = showSearchTab;
window.showPopularTab = showPopularTab;
window.clearRecentSearches = clearRecentSearches;
window.loadTab = loadTab;