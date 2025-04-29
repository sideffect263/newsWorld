import axios from 'axios';
import { getFallbackStory, getAllFallbackStories } from './fallbackStories';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Cache configuration
const CACHE_DURATION = {
  DEFAULT: 5 * 60 * 1000, // 5 minutes
  TRENDING: 3 * 60 * 1000, // 3 minutes
  NEWS: 2 * 60 * 1000,    // 2 minutes
  SENTIMENT: 10 * 60 * 1000, // 10 minutes
  STORIES: 10 * 60 * 1000    // 10 minutes
};

// In-memory cache store
const apiCache = {
  cache: {},
  
  // Generate a cache key from endpoint and params
  generateKey(endpoint, params = {}) {
    return `${endpoint}:${JSON.stringify(params)}`;
  },
  
  // Set an item in the cache
  setItem(key, data, duration = CACHE_DURATION.DEFAULT) {
    const item = {
      data,
      expiry: Date.now() + duration
    };
    this.cache[key] = item;
    return item;
  },
  
  // Get an item from the cache
  getItem(key) {
    const item = this.cache[key];
    if (!item) return null;
    
    // Check if the item has expired
    if (Date.now() > item.expiry) {
      delete this.cache[key];
      return null;
    }
    
    return item.data;
  },
  
  // Clear the entire cache or specific keys
  clearCache(key = null) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  }
};

// Standard error response structure
const createErrorResponse = (message, originalError = null) => ({
  success: false,
  error: {
    message,
    originalError: originalError ? {
      message: originalError.message,
      status: originalError.response?.status,
      statusText: originalError.response?.statusText,
    } : null
  },
  data: null
});

// Standard success response structure
const createSuccessResponse = (data) => {
  // If data already has a success property, return it as is
  if (data && typeof data === 'object' && 'success' in data) {
    return {
      success: data.success,
      error: null,
      data
    };
  }
  
  return {
    success: true,
    error: null,
    data
  };
};

/**
 * Normalize response data from the API
 * This helps handle different response structures
 */
const normalizeResponse = (response, defaultValue = []) => {
  if (!response || !response.data) {
    return defaultValue;
  }
  
  // The API has inconsistent response formats, handle all possibilities
  
  // Case 1: { data: { data: [...] } }
  if (response.data.data) {
    return response.data.data;
  }
  
  // Case 2: { data: { articles: [...] } }
  if (response.data.articles) {
    return response.data.articles;
  }
  
  // Case 3: { data: { keywords: [...] } }
  if (response.data.keywords) {
    return response.data.keywords;
  }
  
  // Case 4: { data: [...] }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  // Default case
  return defaultValue;
};

/**
 * Make an API request with caching
 */
const cachedApiRequest = async (endpoint, method = 'get', params = {}, duration = CACHE_DURATION.DEFAULT, forceRefresh = false) => {
  try {
    const cacheKey = apiCache.generateKey(endpoint, params);
    
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cachedData = apiCache.getItem(cacheKey);
      if (cachedData) {
        console.log(`Using cached data for ${endpoint}`, params);
        return cachedData;
      }
    }
    
    // Make the actual API request
    console.log(`Fetching ${endpoint} with params:`, params);
    const response = await axios[method](`${API_URL}${endpoint}`, method === 'get' ? { params } : params);
    
    // Create a success response 
    const result = createSuccessResponse(response.data);
    
    // Cache the result
    apiCache.setItem(cacheKey, result, duration);
    
    return result;
  } catch (error) {
    console.error(`Error in API request to ${endpoint}:`, error);
    return createErrorResponse(`Failed request to ${endpoint}`, error);
  }
};

/**
 * Fetch news articles with optional filters
 */
export const fetchNews = async (params = {}) => {
  const response = await cachedApiRequest('/news', 'get', params, CACHE_DURATION.NEWS);
  
  if (response.success) {
    // Process the data for consistency
    let articles = [];
    let totalArticles = 0;
    let totalPages = 1;
    
    // Extract articles based on different possible structures
    if (response.data.data) {
      articles = response.data.data;
    } else if (response.data.articles) {
      articles = response.data.articles;
    } else if (Array.isArray(response.data)) {
      articles = response.data;
    }
    
    // Get pagination information
    totalArticles = response.data.totalArticles || response.data.total || articles.length;
    totalPages = response.data.totalPages || Math.ceil(totalArticles / (params.limit || 12));
    
    return createSuccessResponse({
      articles,
      totalArticles,
      totalPages,
      currentPage: parseInt(params.page) || 1
    });
  }
  
  return response;
};

// Sample demo articles for development/testing purposes
const demoArticles = [
  {
    _id: 'demo-article-1',
    title: 'Sample News Article: Global Climate Summit Begins Today',
    description: 'World leaders gather to discuss climate change policies and carbon reduction targets.',
    content: '<p>The 30th Global Climate Summit begins today in Geneva, with representatives from over 150 countries expected to attend. The main agenda includes setting more ambitious carbon reduction targets and discussing financial aid for developing nations to transition to cleaner energy sources.</p><p>The UN Secretary-General emphasized the urgency of the situation, stating that "we are running out of time to prevent catastrophic climate change."</p>',
    publishedAt: new Date().toISOString(),
    source: { name: 'Demo News Network', id: 'dnn' },
    author: 'John Doe',
    url: 'https://example.com/news/climate-summit',
    category: 'Environment',
    categories: ['Environment', 'Politics', 'Global'],
    keywords: ['climate change', 'global warming', 'carbon emissions', 'summit'],
    sentimentScore: 0.1,
    sentimentAssessment: 'neutral',
    viewCount: 1248
  },
  {
    _id: 'demo-article-2',
    title: 'Tech Company Announces Revolutionary AI Assistant',
    description: 'Silicon Valley startup unveils advanced artificial intelligence system that can understand complex tasks and perform them autonomously.',
    content: '<p>TechFuture Inc. has announced what it calls a "breakthrough" in artificial intelligence with its new AI assistant called "Cognos". Unlike existing AI systems, Cognos can understand complex multi-step tasks and execute them with minimal human intervention.</p><p>"This represents the next generation of AI assistants," said Emma Chen, CEO of TechFuture. "Cognos can understand context, remember previous interactions, and continuously learn from its experiences."</p>',
    publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    source: { name: 'Tech Insider', id: 'techinsider' },
    author: 'Jane Smith',
    url: 'https://example.com/news/ai-assistant',
    category: 'Technology',
    categories: ['Technology', 'Business', 'Innovation'],
    keywords: ['artificial intelligence', 'AI', 'machine learning', 'technology'],
    sentimentScore: 0.8,
    sentimentAssessment: 'positive',
    viewCount: 3527
  },
  {
    _id: 'demo-article-3',
    title: 'Economic Downturn Fears Rise as Markets Show Volatility',
    description: 'Global markets experiencing increased volatility as fears of recession grow among investors and economists.',
    content: '<p>Stock markets around the world showed significant volatility today as investors reacted to a series of concerning economic indicators. The Dow Jones Industrial Average fell by over 500 points, while European and Asian markets also experienced substantial declines.</p><p>Economists are divided on whether this represents a temporary correction or the beginning of a more sustained economic downturn',
    publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    source: { name: 'Financial Post', id: 'financialpost' },
    author: 'Michael Brown',
    url: 'https://example.com/news/economic-downturn',
    category: 'Business',
    categories: ['Business', 'Economy', 'Markets'],
    keywords: ['economy', 'recession', 'stock market', 'financial crisis'],
    sentimentScore: -0.6,
    sentimentAssessment: 'negative',
    viewCount: 2891
  }
];

/**
 * Fetch a single article by ID
 */
export const fetchArticle = async (id) => {
  // Handle demo article IDs for testing
  if (id.startsWith('demo-')) {
    const demoArticle = demoArticles.find(article => article._id === id);
    if (demoArticle) {
      console.log('Returning demo article:', demoArticle.title);
      return createSuccessResponse({ article: demoArticle });
    }
  }
  
  console.log(`API - Fetching article with ID: ${id}`);
  
  // Check if article is in cache first
  const cacheKey = apiCache.generateKey(`/news/${id}`, {});
  const cachedData = apiCache.getItem(cacheKey);
  
  if (cachedData) {
    console.log(`Using cached article data for ID: ${id}`);
    return cachedData;
  }
  
  try {
    // Use longer cache duration for article details since they rarely change
    const response = await axios.get(`${API_URL}/news/${id}`);
    console.log(`Article API raw response status: ${response.status}`);
    console.log(`Response data:`, response.data);
    
    // Handle different possible response structures
    let article = null;
    
    if (response.data && response.data.article) {
      // Structure: { article: {...} }
      article = response.data.article;
    } else if (response.data && response.data.data) {
      // Structure: { data: {...} } or { data: { article: {...} } }
      article = response.data.data.article || response.data.data;
    } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      // Structure: The object itself is the article (has properties like title, content)
      if (response.data.title) {
        article = response.data;
      }
    }
    
    if (!article) {
      console.error('Article not found or invalid data structure in API response');
      return createErrorResponse('Article not found');
    }
    
    console.log(`Successfully found article: ${article.title}`);
    const result = createSuccessResponse({ article });
    
    // Cache the result for future use
    apiCache.setItem(cacheKey, result, CACHE_DURATION.DEFAULT * 2);
    
    return result;
  } catch (error) {
    console.error(`Error fetching article ${id}:`, error);
    return createErrorResponse(`Failed to fetch article with ID ${id}`, error);
  }
};

/**
 * Fetch stories with optional filters
 */
export const fetchStories = async (params = {}) => {
  try {
    const response = await cachedApiRequest('/stories', 'get', params, CACHE_DURATION.STORIES);
    
    // If API call succeeded, return the result
    if (response.success && response.data && 
        (Array.isArray(response.data.stories) || Array.isArray(response.data.data))) {
      return response;
    }
    
    // If API call failed, use fallback stories
    console.log('Using fallback stories list');
    const fallbackStories = getAllFallbackStories();
    return createSuccessResponse({ stories: fallbackStories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    
    // Use fallback stories when an exception occurs
    console.log('Using fallback stories list after error');
    const fallbackStories = getAllFallbackStories();
    return createSuccessResponse({ stories: fallbackStories });
  }
};

/**
 * Fetch a single story by ID
 */
export const fetchStory = async (id) => {
  try {
    // Use longer cache duration for story details since they rarely change
    const response = await cachedApiRequest(`/stories/${id}`, 'get', {}, CACHE_DURATION.STORIES);
    
    // If API call succeeded, return the result
    if (response.success && response.data && response.data.story) {
      return response;
    }
    
    // If API call failed, try to use fallback story
    const fallbackStory = getFallbackStory(id);
    if (fallbackStory) {
      console.log(`Using fallback story for ID: ${id}`);
      return createSuccessResponse({ story: fallbackStory });
    }
    
    // If no fallback story found, return the original error response
    return response;
  } catch (error) {
    console.error(`Error fetching story ${id}:`, error);
    
    // Try to use fallback story when an exception occurs
    const fallbackStory = getFallbackStory(id);
    if (fallbackStory) {
      console.log(`Using fallback story (after error) for ID: ${id}`);
      return createSuccessResponse({ story: fallbackStory });
    }
    
    return createErrorResponse(`Failed to fetch story with ID ${id}`, error);
  }
};

/**
 * Fetch trending topics
 */
export const fetchTrends = async (params = {}) => {
  return cachedApiRequest('/trends', 'get', params, CACHE_DURATION.TRENDING);
};

/**
 * Fetch sentiment analysis data
 */
export const fetchSentiment = async (params = {}) => {
  return cachedApiRequest('/sentiment', 'get', params, CACHE_DURATION.SENTIMENT);
};

/**
 * Fetch available news sources
 */
export const fetchSources = async (params = {}) => {
  // Sources don't change often, use a longer cache duration
  return cachedApiRequest('/sources', 'get', params, CACHE_DURATION.DEFAULT * 3);
};

/**
 * Fetch trending keywords for header
 */
export const fetchTrendingKeywords = async () => {
  // This is frequently called, so we need caching to prevent rate limiting
  const response = await cachedApiRequest('/trends/keywords', 'get', {}, CACHE_DURATION.TRENDING);
  
  if (response.success) {
    let keywords = [];
    
    if (response.data.keywords) {
      keywords = response.data.keywords;
    } else if (response.data.data) {
      keywords = response.data.data;
    } else if (Array.isArray(response.data)) {
      keywords = response.data;
    }
    
    // Process keywords for consistent structure
    if (keywords.length > 0) {
      if (typeof keywords[0] === 'string') {
        // Convert simple strings to objects with word and count
        keywords = keywords.map(word => ({
          word: word,
          count: 1
        }));
      } else if (keywords[0].keyword && !keywords[0].word) {
        // Convert keyword property to word property for consistency
        keywords = keywords.map(item => ({
          word: item.keyword,
          count: item.count || 1
        }));
      }
    }
    
    // If still no keywords, use fallback
    if (!keywords || keywords.length === 0) {
      keywords = [
        { word: 'technology', count: 15 },
        { word: 'politics', count: 12 },
        { word: 'health', count: 10 },
        { word: 'business', count: 8 },
        { word: 'science', count: 7 }
      ];
    }
    
    return createSuccessResponse({ keywords });
  }
  
  // Return fallback data on error
  return createSuccessResponse({ 
    keywords: [
      { word: 'technology', count: 15 },
      { word: 'politics', count: 12 },
      { word: 'health', count: 10 },
      { word: 'business', count: 8 },
      { word: 'science', count: 7 }
    ] 
  });
};

/**
 * Fetch server status
 */
export const fetchStatus = async () => {
  // Don't cache status data as it changes frequently
  try {
    const response = await axios.get(`/status`);
    return createSuccessResponse(response.data);
  } catch (error) {
    console.error('Error fetching server status:', error);
    return createErrorResponse('Failed to fetch server status', error);
  }
};

/**
 * Fetch scheduler status
 */
export const fetchSchedulerStatus = async () => {
  // Don't cache scheduler status as it changes frequently
  try {
    const response = await axios.get(`/status/scheduler`);
    return createSuccessResponse(response.data);
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    return createErrorResponse('Failed to fetch scheduler status', error);
  }
};

// Export cache utilities for components that need them
export const cacheUtils = {
  clearCache: (key) => apiCache.clearCache(key),
  refreshNewsCache: () => {
    // Clear any cached news data
    Object.keys(apiCache.cache).forEach(key => {
      if (key.startsWith('/news')) {
        apiCache.clearCache(key);
      }
    });
  },
  refreshTrendsCache: () => {
    // Clear trending data
    Object.keys(apiCache.cache).forEach(key => {
      if (key.startsWith('/trends')) {
        apiCache.clearCache(key);
      }
    });
  }
};

/**
 * Example usage in a component:
 * 
 * async function loadData() {
 *   const result = await fetchNews();
 *   
 *   if (result.success) {
 *     // Happy path - use the data
 *     setArticles(result.data.articles);
 *   } else {
 *     // Error path - show error message
 *     setError(result.error.message);
 *     // Optionally set default/empty state
 *     setArticles([]);
 *   }
 * }
 */