const axios = require('axios');
const RSSParser = require('rss-parser');
const Source = require('../models/source.model');
const Article = require('../models/article.model');

// Initialize RSS parser
const rssParser = new RSSParser();

/**
 * Fetch news from all active sources
 */
exports.fetchAllNews = async () => {
  try {
    console.log('Starting news fetch from all sources...');
    
    // Get all active sources
    const sources = await Source.find({ isActive: true });
    
    if (!sources.length) {
      console.log('No active sources found');
      return { success: false, message: 'No active sources found' };
    }
    
    console.log(`Found ${sources.length} active sources`);
    
    // Process each source
    const results = [];
    
    for (const source of sources) {
      try {
        // Check if it's time to fetch from this source
        const shouldFetch = !source.lastFetchedAt || 
          (Date.now() - new Date(source.lastFetchedAt).getTime()) / (1000 * 60) >= source.fetchFrequency;
        
        if (!shouldFetch) {
          console.log(`Skipping ${source.name} - not due for fetch yet`);
          continue;
        }
        
        console.log(`Fetching news from ${source.name} (${source.fetchMethod})`);
        
        let fetchResult;
        
        // Fetch based on method
        switch (source.fetchMethod) {
          case 'api':
            fetchResult = await fetchFromAPI(source);
            break;
          case 'rss':
            fetchResult = await fetchFromRSS(source);
            break;
          case 'scraping':
            fetchResult = await fetchFromScraping(source);
            break;
          default:
            fetchResult = { success: false, message: 'Unknown fetch method' };
        }
        
        // Update source with fetch status
        await updateSourceFetchStatus(source._id, fetchResult);
        
        results.push({
          source: source.name,
          result: fetchResult,
        });
        
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error.message);
        
        // Update source with error status
        await updateSourceFetchStatus(source._id, {
          success: false,
          message: error.message,
        });
        
        results.push({
          source: source.name,
          result: { success: false, message: error.message },
        });
      }
    }
    
    return {
      success: true,
      message: `Completed fetch from ${results.length} sources`,
      results,
    };
    
  } catch (error) {
    console.error('Error in fetchAllNews:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch news from a specific source
 */
exports.fetchNewsFromSource = async (sourceId) => {
  try {
    // Get the source
    const source = await Source.findById(sourceId);
    
    if (!source) {
      return { success: false, message: 'Source not found' };
    }
    
    if (!source.isActive) {
      return { success: false, message: 'Source is not active' };
    }
    
    console.log(`Fetching news from ${source.name} (${source.fetchMethod})`);
    
    let fetchResult;
    
    // Fetch based on method
    switch (source.fetchMethod) {
      case 'api':
        fetchResult = await fetchFromAPI(source);
        break;
      case 'rss':
        fetchResult = await fetchFromRSS(source);
        break;
      case 'scraping':
        fetchResult = await fetchFromScraping(source);
        break;
      default:
        fetchResult = { success: false, message: 'Unknown fetch method' };
    }
    
    // Update source with fetch status
    await updateSourceFetchStatus(source._id, fetchResult);
    
    return {
      success: fetchResult.success,
      message: fetchResult.message,
      source: source.name,
      articlesAdded: fetchResult.articlesAdded || 0,
    };
    
  } catch (error) {
    console.error('Error in fetchNewsFromSource:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch news from API
 */
const fetchFromAPI = async (source) => {
  try {
    if (!source.apiDetails || !source.apiDetails.type) {
      return { success: false, message: 'Invalid API configuration' };
    }
    
    let articles = [];
    
    // Handle different API types
    switch (source.apiDetails.type) {
      case 'newsapi':
        articles = await fetchFromNewsAPI(source);
        break;
      case 'mediastack':
        articles = await fetchFromMediastack(source);
        break;
      case 'custom':
        articles = await fetchFromCustomAPI(source);
        break;
      default:
        return { success: false, message: 'Unsupported API type' };
    }
    
    // Save articles to database
    const savedCount = await saveArticles(articles, source);
    
    return {
      success: true,
      message: `Successfully fetched ${articles.length} articles from ${source.name}`,
      articlesAdded: savedCount,
    };
    
  } catch (error) {
    console.error('Error in fetchFromAPI:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch news from RSS feed
 */
const fetchFromRSS = async (source) => {
  try {
    if (!source.rssDetails || !source.rssDetails.feedUrl) {
      return { success: false, message: 'Invalid RSS configuration' };
    }
    
    // Fetch RSS feed
    const feed = await rssParser.parseURL(source.rssDetails.feedUrl);
    
    if (!feed || !feed.items || !feed.items.length) {
      return { success: false, message: 'No items found in RSS feed' };
    }
    
    // Transform RSS items to articles
    const articles = feed.items.map(item => {
      return {
        title: item.title,
        description: item.contentSnippet || item.content,
        content: item.content,
        url: item.link,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        author: item.creator || item.author,
        source: {
          id: source._id.toString(),
          name: source.name,
          url: source.url,
        },
        categories: item.categories || [source.category],
        countries: [source.country],
        language: source.language,
      };
    });
    
    // Save articles to database
    const savedCount = await saveArticles(articles, source);
    
    return {
      success: true,
      message: `Successfully fetched ${articles.length} articles from RSS feed`,
      articlesAdded: savedCount,
    };
    
  } catch (error) {
    console.error('Error in fetchFromRSS:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch news from web scraping
 * Note: In a real application, you would implement actual web scraping here
 * For this example, we'll just return a mock response
 */
const fetchFromScraping = async (source) => {
  try {
    if (!source.scrapingDetails || !source.scrapingDetails.targetUrl) {
      return { success: false, message: 'Invalid scraping configuration' };
    }
    
    // In a real application, you would implement web scraping here
    // For now, we'll just return a mock response
    
    console.log(`Mock scraping from ${source.scrapingDetails.targetUrl}`);
    
    // Mock articles
    const articles = [
      {
        title: `Scraped Article from ${source.name} 1`,
        description: 'This is a mock scraped article description',
        content: 'This is the full content of the mock scraped article.',
        url: `${source.scrapingDetails.targetUrl}/article1`,
        publishedAt: new Date(),
        source: {
          id: source._id.toString(),
          name: source.name,
          url: source.url,
        },
        categories: [source.category],
        countries: [source.country],
        language: source.language,
      },
      {
        title: `Scraped Article from ${source.name} 2`,
        description: 'This is another mock scraped article description',
        content: 'This is the full content of another mock scraped article.',
        url: `${source.scrapingDetails.targetUrl}/article2`,
        publishedAt: new Date(),
        source: {
          id: source._id.toString(),
          name: source.name,
          url: source.url,
        },
        categories: [source.category],
        countries: [source.country],
        language: source.language,
      },
    ];
    
    // Save articles to database
    const savedCount = await saveArticles(articles, source);
    
    return {
      success: true,
      message: `Successfully scraped ${articles.length} articles`,
      articlesAdded: savedCount,
    };
    
  } catch (error) {
    console.error('Error in fetchFromScraping:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch from News API
 */
const fetchFromNewsAPI = async (source) => {
  try {
    const apiKey = source.apiDetails.apiKey || process.env.NEWS_API_KEY;
    
    if (!apiKey) {
      throw new Error('News API key not found');
    }
    
    // Build request URL
    const params = source.apiDetails.params || {};
    const url = 'https://newsapi.org/v2/top-headlines';
    
    const response = await axios.get(url, {
      params: {
        ...params,
        apiKey,
      },
      headers: {
        'User-Agent': 'NewsWorld/1.0',
      },
    });
    
    if (!response.data || !response.data.articles) {
      throw new Error('Invalid response from News API');
    }
    
    // Transform News API articles to our format
    return response.data.articles.map(article => {
      return {
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        imageUrl: article.urlToImage,
        publishedAt: new Date(article.publishedAt),
        author: article.author,
        source: {
          id: source._id.toString(),
          name: article.source?.name || source.name,
          url: source.url,
        },
        categories: [source.category],
        countries: [source.country],
        language: source.language,
      };
    });
    
  } catch (error) {
    console.error('Error in fetchFromNewsAPI:', error);
    throw error;
  }
};

/**
 * Fetch from Mediastack API
 */
const fetchFromMediastack = async (source) => {
  try {
    const apiKey = source.apiDetails.apiKey || process.env.MEDIASTACK_API_KEY;
    
    if (!apiKey) {
      throw new Error('Mediastack API key not found');
    }
    
    // Build request URL
    const params = source.apiDetails.params || {};
    const url = 'http://api.mediastack.com/v1/news';
    
    const response = await axios.get(url, {
      params: {
        ...params,
        access_key: apiKey,
      },
    });
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from Mediastack API');
    }
    
    // Transform Mediastack articles to our format
    return response.data.data.map(article => {
      return {
        title: article.title,
        description: article.description,
        content: article.description, // Mediastack doesn't provide full content
        url: article.url,
        imageUrl: article.image,
        publishedAt: new Date(article.published_at),
        author: article.author,
        source: {
          id: source._id.toString(),
          name: article.source || source.name,
          url: source.url,
        },
        categories: [article.category || source.category],
        countries: [source.country],
        language: article.language || source.language,
      };
    });
    
  } catch (error) {
    console.error('Error in fetchFromMediastack:', error);
    throw error;
  }
};

/**
 * Fetch from custom API
 */
const fetchFromCustomAPI = async (source) => {
  try {
    if (!source.apiDetails.endpoint) {
      throw new Error('Custom API endpoint not specified');
    }
    
    // Build request
    const url = source.apiDetails.endpoint;
    const params = source.apiDetails.params || {};
    const headers = {};
    
    if (source.apiDetails.apiKey) {
      headers['Authorization'] = `Bearer ${source.apiDetails.apiKey}`;
    }
    
    const response = await axios.get(url, {
      params,
      headers,
    });
    
    if (!response.data) {
      throw new Error('Invalid response from custom API');
    }
    
    // For custom APIs, we need to transform the data based on the specific API
    // This is a simplified example
    const articles = [];
    
    if (Array.isArray(response.data)) {
      // If response is an array of articles
      articles.push(...response.data);
    } else if (response.data.articles) {
      // If response has an articles property
      articles.push(...response.data.articles);
    } else if (response.data.items) {
      // If response has an items property
      articles.push(...response.data.items);
    } else {
      throw new Error('Unsupported custom API response format');
    }
    
    // Transform to our article format
    return articles.map(article => {
      return {
        title: article.title,
        description: article.description || article.summary,
        content: article.content || article.body,
        url: article.url || article.link,
        imageUrl: article.imageUrl || article.image,
        publishedAt: new Date(article.publishedAt || article.date || Date.now()),
        author: article.author,
        source: {
          id: source._id.toString(),
          name: source.name,
          url: source.url,
        },
        categories: article.categories || [source.category],
        countries: [source.country],
        language: source.language,
      };
    });
    
  } catch (error) {
    console.error('Error in fetchFromCustomAPI:', error);
    throw error;
  }
};

/**
 * Save articles to database
 */
const saveArticles = async (articles, source) => {
  try {
    let savedCount = 0;
    
    for (const article of articles) {
      try {
        // Check if article already exists by URL
        const existingArticle = await Article.findOne({ url: article.url });
        
        if (existingArticle) {
          // Skip existing articles
          continue;
        }

        // Transform NYT categories if they exist
        if (article.categories && Array.isArray(article.categories)) {
          article.categories = article.categories.map(category => {
            // If category is an object with _ property (NYT format)
            if (typeof category === 'object' && category._) {
              // Map NYT categories to our supported categories
              const nytCategory = category._.toLowerCase();
              if (nytCategory.includes('business')) return 'business';
              if (nytCategory.includes('entertainment')) return 'entertainment';
              if (nytCategory.includes('health')) return 'health';
              if (nytCategory.includes('science')) return 'science';
              if (nytCategory.includes('sports')) return 'sports';
              if (nytCategory.includes('technology')) return 'technology';
              if (nytCategory.includes('politics')) return 'politics';
              if (nytCategory.includes('world')) return 'world';
              if (nytCategory.includes('nation')) return 'nation';
              if (nytCategory.includes('lifestyle')) return 'lifestyle';
              return 'general';
            }
            return category;
          }).filter(category => category); // Remove any undefined/null values
        }
        
        // Create new article
        await Article.create(article);
        savedCount++;
        
      } catch (error) {
        console.error(`Error saving article: ${error.message}`);
        // Continue with next article
      }
    }
    
    return savedCount;
    
  } catch (error) {
    console.error('Error in saveArticles:', error);
    throw error;
  }
};

/**
 * Update source fetch status
 */
const updateSourceFetchStatus = async (sourceId, fetchResult) => {
  try {
    const updateData = {
      lastFetchedAt: new Date(),
      'fetchStatus.success': fetchResult.success,
      'fetchStatus.message': fetchResult.message,
    };
    
    if (!fetchResult.success) {
      updateData['fetchStatus.lastErrorAt'] = new Date();
      updateData['$inc'] = { 'fetchStatus.errorCount': 1 };
    } else {
      // Reset error count on success
      updateData['fetchStatus.errorCount'] = 0;
    }
    
    await Source.findByIdAndUpdate(sourceId, updateData);
    
  } catch (error) {
    console.error('Error updating source fetch status:', error);
  }
};