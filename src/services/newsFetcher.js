const axios = require("axios");
const RSSParser = require("rss-parser");
const Source = require("../models/source.model");
const Article = require("../models/article.model");
const trendAnalyzer = require("./trendAnalyzer");
const locationExtractor = require("./locationExtractor");
const sentimentAnalyzer = require("./sentimentAnalyzer");
const insightGenerator = require("./insightGenerator");

// Initialize RSS parser
const rssParser = new RSSParser();

/**
 * Fetch news from all active sources
 */
exports.fetchAllNews = async (options = {}) => {
  try {
    const { fetchMethod, forceFetch = false } = options;
    const query = { isActive: true };

    if (fetchMethod) {
      query.fetchMethod = fetchMethod;
    }

    const sources = await Source.find(query);
    console.log(`Found ${sources.length} active sources`);

    let fetchedCount = 0;
    let skippedCount = 0;
    let newArticles = [];

    for (const source of sources) {
      // Check if source is due for fetch
      if (!forceFetch && !isSourceDueForFetch(source)) {
        console.log(`Skipping ${source.name} - not due for fetch yet`);
        skippedCount++;
        continue;
      }

      try {
        const result = await exports.fetchNewsFromSource(source._id);
        if (result.success) {
          fetchedCount++;
          if (result.articlesAdded > 0) {
            // Add to new articles count for trend analysis
            newArticles.push({
              source: source.name,
              count: result.articlesAdded,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching from source ${source.name}:`, error);
      }
    }

    // Update trends with new articles if any were added
    if (newArticles.length > 0) {
      try {
        const totalNewArticles = newArticles.reduce((sum, item) => sum + item.count, 0);
        console.log(`Updating trends with ${totalNewArticles} new articles`);
        await trendAnalyzer.updateTrendsWithNewArticles(newArticles);
      } catch (error) {
        console.error("Error updating trends:", error);
      }
    }

    return {
      success: true,
      message: `Completed fetch from ${fetchedCount} sources (${skippedCount} skipped)`,
      newArticles: newArticles,
    };
  } catch (error) {
    console.error("Error in fetchAllNews:", error);
    throw error;
  }
};

/**
 * Check if a source is due for fetch
 */
const isSourceDueForFetch = (source) => {
  if (!source.lastFetchedAt) return true;

  const now = new Date();
  const lastFetch = new Date(source.lastFetchedAt);
  const minutesSinceLastFetch = (now - lastFetch) / (1000 * 60);

  return minutesSinceLastFetch >= source.fetchFrequency;
};

/**
 * Fetch news from a specific source
 */
exports.fetchNewsFromSource = async (sourceId) => {
  try {
    // Get the source
    const source = await Source.findById(sourceId);

    if (!source) {
      return { success: false, message: "Source not found" };
    }

    if (!source.isActive) {
      return { success: false, message: "Source is not active" };
    }

    console.log(`Fetching news from ${source.name} (${source.fetchMethod})`);

    let fetchResult;

    // Fetch based on method
    switch (source.fetchMethod) {
      case "api":
        fetchResult = await fetchFromAPI(source);
        break;
      case "rss":
        fetchResult = await fetchFromRSS(source);
        break;
      case "scraping":
        fetchResult = await fetchFromScraping(source);
        break;
      default:
        fetchResult = { success: false, message: "Unknown fetch method" };
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
    console.error("Error in fetchNewsFromSource:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch news from API
 */
const fetchFromAPI = async (source) => {
  try {
    if (!source.apiDetails || !source.apiDetails.type) {
      return { success: false, message: "Invalid API configuration" };
    }

    let articles = [];

    // Handle different API types
    switch (source.apiDetails.type) {
      case "newsapi":
        articles = await fetchFromNewsAPI(source);
        break;
      case "mediastack":
        articles = await fetchFromMediastack(source);
        break;
      case "custom":
        articles = await fetchFromCustomAPI(source);
        break;
      default:
        return { success: false, message: "Unsupported API type" };
    }

    // Save articles to database
    const savedCount = await saveArticles(articles, source);

    return {
      success: true,
      message: `Successfully fetched ${articles.length} articles from ${source.name}`,
      articlesAdded: savedCount,
    };
  } catch (error) {
    console.error("Error in fetchFromAPI:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch news from RSS feed
 */
const fetchFromRSS = async (source) => {
  try {
    if (!source.rssDetails || !source.rssDetails.feedUrl) {
      return { success: false, message: "Invalid RSS configuration" };
    }

    // First fetch the raw content with axios to handle encoding properly
    const response = await axios.get(source.rssDetails.feedUrl, {
      responseType: "arraybuffer",
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    // Try different encoding approaches
    let xmlContent;
    let feed;

    // Attempt 1: Try UTF-8
    try {
      xmlContent = response.data.toString("utf8");
      xmlContent = xmlContent.replace(/encoding="[^"]*"/, 'encoding="utf-8"');
      feed = await rssParser.parseString(xmlContent);
      if (feed && feed.items) return processFeed(feed, source);
    } catch (e) {
      console.log("UTF-8 parsing failed, trying UTF-16LE");
    }

    // Attempt 2: Try UTF-16LE
    try {
      xmlContent = response.data.toString("utf16le");
      xmlContent = xmlContent.replace(/encoding="[^"]*"/, 'encoding="utf-16"');
      feed = await rssParser.parseString(xmlContent);
      if (feed && feed.items) return processFeed(feed, source);
    } catch (e) {
      console.log("UTF-16LE parsing failed, trying with BOM removal");
    }

    // Attempt 3: Try removing BOM and forcing UTF-8
    try {
      // Remove BOM if present and force UTF-8
      let data = response.data;
      if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
        data = data.slice(3);
      }
      xmlContent = data.toString("utf8");
      xmlContent = xmlContent.replace(/encoding="[^"]*"/, 'encoding="utf-8"');
      feed = await rssParser.parseString(xmlContent);
      if (feed && feed.items) return processFeed(feed, source);
    } catch (e) {
      console.log("BOM removal attempt failed");
      throw new Error("Failed to parse RSS feed with any encoding method");
    }

    throw new Error("No valid items found in RSS feed");
  } catch (error) {
    console.error("Error in fetchFromRSS:", error);
    return { success: false, message: error.message };
  }
};

// Helper function to process feed and return result
const processFeed = async (feed, source) => {
  if (!feed || !feed.items || !feed.items.length) {
    return { success: false, message: "No items found in RSS feed" };
  }

  // Transform RSS items to articles
  const articles = feed.items.map((item) => {
    // Extract locations from feed metadata
    const metadataLocations = locationExtractor.extractLocationsFromFeedMetadata(item);

    // Extract locations from content
    const contentText = [item.title || "", item.contentSnippet || item.content || "", item.content || ""].join(" ");

    const contentLocations = locationExtractor.extractLocations(contentText);

    // Combine and normalize locations
    const allLocations = [...metadataLocations, ...contentLocations];
    const normalizedLocations = locationExtractor.normalizeLocations(allLocations);

    // Extract top countries using country codes
    const extractedCountries = normalizedLocations
      .filter((loc) => loc.type === "country" && loc.confidence >= 0.7 && loc.countryCode)
      .map((loc) => loc.countryCode);

    // Combine with source country if no countries found
    const countries = extractedCountries.length > 0 ? extractedCountries : [source.country];

    // Analyze sentiment
    const sentimentText = [item.title || "", item.contentSnippet || item.content || ""].join(" ");

    const sentimentResult = sentimentAnalyzer.analyzeSentiment(sentimentText);
    let sentimentAssessment = "neutral";

    if (sentimentResult.comparative >= 0.1) {
      sentimentAssessment = "positive";
    } else if (sentimentResult.comparative <= -0.1) {
      sentimentAssessment = "negative";
    }

    // Create article object
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
      countries: [...new Set(countries)], // Remove duplicates
      language: source.language,
      sentiment: sentimentResult.comparative,
      sentimentAssessment: sentimentAssessment,
      entities: normalizedLocations.map((loc) => ({
        name: loc.name,
        type: loc.type === "country" ? "location" : loc.type,
        count: loc.count,
      })),
    };
  });

  // Save articles to database
  const savedCount = await saveArticles(articles, source);

  return {
    success: true,
    message: `Successfully fetched ${articles.length} articles from RSS feed`,
    articlesAdded: savedCount,
  };
};

/**
 * Fetch news from web scraping
 * Note: In a real application, you would implement actual web scraping here
 * For this example, we'll just return a mock response
 */
const fetchFromScraping = async (source) => {
  try {
    if (!source.scrapingDetails || !source.scrapingDetails.targetUrl) {
      return { success: false, message: "Invalid scraping configuration" };
    }

    // In a real application, you would implement web scraping here
    // For now, we'll just return a mock response

    console.log(`Mock scraping from ${source.scrapingDetails.targetUrl}`);

    // Mock articles
    const articles = [
      {
        title: `Scraped Article from ${source.name} 1`,
        description: "This is a mock scraped article description",
        content: "This is the full content of the mock scraped article.",
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
        description: "This is another mock scraped article description",
        content: "This is the full content of another mock scraped article.",
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
    console.error("Error in fetchFromScraping:", error);
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
      throw new Error("News API key not found");
    }

    // Build request URL
    const params = source.apiDetails.params || {};
    const url = "https://newsapi.org/v2/top-headlines";

    const response = await axios.get(url, {
      params: {
        ...params,
        apiKey,
      },
      headers: {
        "User-Agent": "NewsWorld/1.0",
      },
    });

    if (!response.data || !response.data.articles) {
      throw new Error("Invalid response from News API");
    }

    // Transform News API articles to our format
    return response.data.articles.map((article) => {
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
    console.error("Error in fetchFromNewsAPI:", error);
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
      throw new Error("Mediastack API key not found");
    }

    // Build request URL
    const params = source.apiDetails.params || {};
    const url = "http://api.mediastack.com/v1/news";

    const response = await axios.get(url, {
      params: {
        ...params,
        access_key: apiKey,
      },
    });

    if (!response.data || !response.data.data) {
      throw new Error("Invalid response from Mediastack API");
    }

    // Transform Mediastack articles to our format
    return response.data.data.map((article) => {
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
    console.error("Error in fetchFromMediastack:", error);
    throw error;
  }
};

/**
 * Fetch from custom API
 */
const fetchFromCustomAPI = async (source) => {
  try {
    if (!source.apiDetails.endpoint) {
      throw new Error("Custom API endpoint not specified");
    }

    // Build request
    const url = source.apiDetails.endpoint;
    const params = source.apiDetails.params || {};
    const headers = {};

    if (source.apiDetails.apiKey) {
      headers["Authorization"] = `Bearer ${source.apiDetails.apiKey}`;
    }

    const response = await axios.get(url, {
      params,
      headers,
    });

    if (!response.data) {
      throw new Error("Invalid response from custom API");
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
      throw new Error("Unsupported custom API response format");
    }

    // Transform to our article format
    return articles.map((article) => {
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
    console.error("Error in fetchFromCustomAPI:", error);
    throw error;
  }
};

/**
 * Save multiple articles to database
 * @param {Array} articles - Articles to save
 * @param {Object} source - Source object
 * @returns {Promise<Number>} - Number of saved articles
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
          article.categories = article.categories
            .map((category) => {
              // If category is an object (could be NYT format or other RSS formats)
              if (typeof category === "object") {
                // Handle NYT format with _ property
                if (category._) {
                  const nytCategory = category._.toLowerCase();
                  if (nytCategory.includes("business")) return "business";
                  if (nytCategory.includes("entertainment")) return "entertainment";
                  if (nytCategory.includes("health")) return "health";
                  if (nytCategory.includes("science")) return "science";
                  if (nytCategory.includes("sports")) return "sports";
                  if (nytCategory.includes("technology")) return "technology";
                  if (nytCategory.includes("politics")) return "politics";
                  if (nytCategory.includes("world")) return "world";
                  if (nytCategory.includes("nation")) return "nation";
                  if (nytCategory.includes("lifestyle")) return "lifestyle";
                  return "general";
                }
                // Handle format with $ property (seen in some RSS feeds)
                else if (category.$) {
                  // Extract domain or other properties if available
                  if (typeof category.$ === "object") {
                    // Try to determine category from domain or other properties
                    // Default to general if no specific mapping found
                    return "general";
                  }
                  return String(category.$);
                }
                // Handle any other object format by extracting a string property or returning 'general'
                else {
                  for (const key of Object.keys(category)) {
                    if (typeof category[key] === "string") return category[key];
                  }
                  return "general";
                }
              }
              return category;
            })
            .filter((category) => category && typeof category === "string"); // Remove any undefined/null/non-string values
        }

        // Process article content to extract and geocode locations
        const processedArticle = await processArticleContent(article);

        // Create new article with processed data
        await saveArticle(processedArticle, source._id);
        savedCount++;
      } catch (error) {
        console.error(`Error saving article: ${error.message}`);
        // Continue with next article
      }
    }

    return savedCount;
  } catch (error) {
    console.error("Error in saveArticles:", error);
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
      "fetchStatus.success": fetchResult.success,
      "fetchStatus.message": fetchResult.message,
    };

    if (!fetchResult.success) {
      updateData["fetchStatus.lastErrorAt"] = new Date();
      updateData["$inc"] = { "fetchStatus.errorCount": 1 };
    } else {
      // Reset error count on success
      updateData["fetchStatus.errorCount"] = 0;
    }

    await Source.findByIdAndUpdate(sourceId, updateData);
  } catch (error) {
    console.error("Error updating source fetch status:", error);
  }
};

/**
 * Process article content after fetching
 * @param {Object} article - The article object
 * @returns {Promise<Object>} - Processed article
 */
const processArticleContent = async (article) => {
  try {
    // Skip if no article or missing content
    if (!article || (!article.title && !article.content && !article.description)) {
      return article;
    }

    // Combine text for entity extraction
    const fullText = [article.title || "", article.description || "", article.content || ""].join(" ").trim();

    // Process locations with geocoding
    const locationExtractor = require("./locationExtractor");
    const locationData = await locationExtractor.processArticleLocations(fullText, article);

    // Add location entities to article
    if (locationData.locations && locationData.locations.length > 0) {
      if (!article.entities) {
        article.entities = [];
      }

      // Validate all locations before adding them
      const validatedLocations = locationData.locations.filter((location) => {
        // Skip entities with invalid coordinates
        if (location.coordinates) {
          return (
            location.coordinates.type === "Point" &&
            location.coordinates.coordinates &&
            Array.isArray(location.coordinates.coordinates) &&
            location.coordinates.coordinates.length === 2
          );
        }
        return true; // Locations without coordinates are valid
      });

      // Add geocoded location entities
      validatedLocations.forEach((location) => {
        // Check if location already exists
        const existingIndex = article.entities.findIndex(
          (e) => e.name.toLowerCase() === location.name.toLowerCase() && e.type === location.type,
        );

        if (existingIndex >= 0) {
          // Update existing entity with coordinates if available
          if (location.coordinates) {
            article.entities[existingIndex].coordinates = location.coordinates;
          }
          if (location.geo) {
            article.entities[existingIndex].geo = location.geo;
          }
          if (location.countryCode) {
            article.entities[existingIndex].countryCode = location.countryCode;
          }
          if (location.formattedAddress) {
            article.entities[existingIndex].formattedAddress = location.formattedAddress;
          }
        } else {
          // Add new location entity
          article.entities.push(location);
        }
      });
    }

    // Add country codes from location data
    if (locationData.countries && locationData.countries.length > 0) {
      if (!article.countries) {
        article.countries = [];
      }

      // Add unique country codes
      locationData.countries.forEach((countryCode) => {
        if (!article.countries.includes(countryCode)) {
          article.countries.push(countryCode);
        }
      });
    }

    // Perform entity extraction for non-location entities if needed
    // (This would typically be in a separate function)
    // ...

    return article;
  } catch (error) {
    console.error("Error processing article content:", error);
    return article; // Return original on error
  }
};

/**
 * Normalize article categories to match allowed enum values
 * @param {Array} categories - Original categories from source
 * @returns {Array} - Normalized categories that match allowed enum values
 */
const normalizeCategories = (categories) => {
  if (!categories || !Array.isArray(categories)) {
    return ["general"];
  }

  // Allowed categories in the article schema
  const allowedCategories = [
    "general",
    "business",
    "entertainment",
    "health",
    "science",
    "sports",
    "technology",
    "politics",
    "world",
    "nation",
    "lifestyle",
    "other",
  ];

  // Category mapping for common specific categories
  const categoryMapping = {
    // Technology related
    cybersecurity: "technology",
    "cyber security": "technology",
    "cyber attack": "technology",
    security: "technology",
    software: "technology",
    ai: "technology",
    "artificial intelligence": "technology",
    tech: "technology",
    computing: "technology",
    internet: "technology",
    digital: "technology",
    programming: "technology",
    data: "technology",
    cloud: "technology",

    // Business related
    finance: "business",
    economy: "business",
    markets: "business",
    stocks: "business",
    investing: "business",
    banking: "business",
    "press release": "business",
    "product launch": "business",
    corporate: "business",
    industry: "business",
    retail: "business",
    management: "business",
    startups: "business",

    // Politics related
    government: "politics",
    election: "politics",
    democracy: "politics",
    policy: "politics",
    law: "politics",
    legislation: "politics",
    congress: "politics",
    senate: "politics",
    parliament: "politics",

    // World related
    international: "world",
    global: "world",
    europe: "world",
    asia: "world",
    africa: "world",
    "middle east": "world",
    americas: "world",
    foreign: "world",

    // Entertainment related
    movies: "entertainment",
    film: "entertainment",
    music: "entertainment",
    celebrities: "entertainment",
    arts: "entertainment",
    culture: "entertainment",
    tv: "entertainment",
    television: "entertainment",
    gaming: "entertainment",
    games: "entertainment",

    // Health related
    medical: "health",
    medicine: "health",
    covid: "health",
    pandemic: "health",
    wellness: "health",
    fitness: "health",
    disease: "health",
    healthcare: "health",

    // Science related
    physics: "science",
    chemistry: "science",
    biology: "science",
    space: "science",
    nasa: "science",
    astronomy: "science",
    research: "science",
    climate: "science",
    environment: "science",

    // Sports related
    football: "sports",
    soccer: "sports",
    basketball: "sports",
    baseball: "sports",
    tennis: "sports",
    olympics: "sports",
    racing: "sports",
    athletics: "sports",

    // Lifestyle related
    fashion: "lifestyle",
    food: "lifestyle",
    travel: "lifestyle",
    home: "lifestyle",
    design: "lifestyle",
    beauty: "lifestyle",
    family: "lifestyle",
    parenting: "lifestyle",
  };

  // Normalize categories
  const normalizedCategories = categories
    .map((category) => {
      if (!category || typeof category !== "string") return null;

      // Clean the category string
      const cleanCategory = category.trim().toLowerCase();

      // Check if it's already an allowed category
      if (allowedCategories.includes(cleanCategory)) {
        return cleanCategory;
      }

      // Check if we have a mapping for this category
      if (categoryMapping[cleanCategory]) {
        return categoryMapping[cleanCategory];
      }

      // For company or entity names (often not real categories), map to appropriate category
      if (cleanCategory.includes("security") || cleanCategory.includes("cyber") || cleanCategory.includes("tech")) {
        return "technology";
      }

      if (
        cleanCategory.includes("bank") ||
        cleanCategory.includes("financial") ||
        cleanCategory.includes("company") ||
        cleanCategory.includes("inc") ||
        cleanCategory.includes("corp") ||
        cleanCategory.includes("ltd")
      ) {
        return "business";
      }

      // Default to "other" for unknown categories
      return "other";
    })
    .filter(Boolean); // Remove null/undefined values

  // If no valid categories found, use "general"
  if (normalizedCategories.length === 0) {
    return ["general"];
  }

  // Remove duplicates
  return [...new Set(normalizedCategories)];
};

/**
 * Save an article to the database
 * @param {Object} article - The article to save
 * @param {String} sourceId - ID of the source
 * @returns {Promise<Object>} - Saved article
 */
const saveArticle = async (article, sourceId) => {
  try {
    // Validate required fields
    if (!article.title || !article.url || !article.publishedAt) {
      return null;
    }

    // Process the article content to extract entities, locations, etc.
    const processedArticle = await processArticleContent(article);

    // Check if article already exists by URL
    const existingArticle = await Article.findOne({ url: processedArticle.url });

    if (existingArticle) {
      // Update with new information if needed
      if (processedArticle.content && !existingArticle.content) {
        existingArticle.content = processedArticle.content;
        existingArticle.entities = processedArticle.entities || existingArticle.entities;
        existingArticle.countries = processedArticle.countries || existingArticle.countries;

        // Save updates
        await existingArticle.save();
      }
      return existingArticle;
    }

    // If no image URL and sentiment is available, try to get a sentiment-based image
    if (!processedArticle.imageUrl && processedArticle.sentimentAssessment) {
      try {
        // Get keywords from entities and categories for better image matching
        let keywords = [];

        // Extract keywords from entities (prefer people and organizations)
        if (processedArticle.entities && processedArticle.entities.length > 0) {
          // First add people and organizations
          const priorityEntities = processedArticle.entities
            .filter((e) => ["person", "organization"].includes(e.type))
            .map((e) => e.name);

          // Then add other entities
          const otherEntities = processedArticle.entities
            .filter((e) => !["person", "organization"].includes(e.type))
            .map((e) => e.name);

          keywords = [...priorityEntities, ...otherEntities];
        }

        // Add categories as keywords if we don't have enough
        if (keywords.length < 2 && processedArticle.categories && processedArticle.categories.length > 0) {
          keywords = [...keywords, ...processedArticle.categories];
        }

        // If we still don't have keywords, extract some from the title
        if (keywords.length === 0 && processedArticle.title) {
          const titleWords = processedArticle.title
            .split(" ")
            .filter((word) => word.length > 3) // Only words longer than 3 chars
            .filter((word) => !["this", "that", "with", "from", "have", "what"].includes(word.toLowerCase()));

          keywords = titleWords.slice(0, 3); // Take up to 3 words from title
        }

        // Take up to 3 keywords
        const keywordsParam = keywords.slice(0, 3).join(",");

        // Get sentiment-based image
        const axios = require("axios");
        const port = process.env.PORT || 5000;
        const sentimentImageUrl = `http://localhost:${port}/api/proxy/sentiment-image?sentiment=${
          processedArticle.sentimentAssessment
        }&keywords=${encodeURIComponent(keywordsParam)}`;

        const imageResponse = await axios.get(sentimentImageUrl);

        if (imageResponse.data.success && imageResponse.data.data) {
          // Add the image URL to the article - use the already proxied URL
          processedArticle.imageUrl = imageResponse.data.data.largeImageUrl || imageResponse.data.data.imageUrl;
          // Store that this is a sentiment-based image
          processedArticle.imageSource = "sentiment";
          processedArticle.imageTags = imageResponse.data.data.tags;
        }
      } catch (error) {
        console.error("Error getting sentiment-based image for article:", error.message);
        // Continue without image if there's an error
      }
    }

    // Normalize categories to match allowed enum values
    const normalizedCategories = normalizeCategories(processedArticle.categories);

    // Validate and clean entity coordinates before saving to prevent MongoDB errors
    if (processedArticle.entities && processedArticle.entities.length > 0) {
      processedArticle.entities = processedArticle.entities.map((entity) => {
        // Check for invalid coordinates and remove them
        if (entity.coordinates) {
          if (
            entity.coordinates.type !== "Point" ||
            !entity.coordinates.coordinates ||
            !Array.isArray(entity.coordinates.coordinates) ||
            entity.coordinates.coordinates.length !== 2
          ) {
            delete entity.coordinates;
          }
        }
        return entity;
      });
    }

    // Create new article
    const newArticle = new Article({
      title: processedArticle.title,
      description: processedArticle.description || "",
      content: processedArticle.content || "",
      url: processedArticle.url,
      imageUrl: processedArticle.imageUrl || processedArticle.urlToImage || "",
      imageSource: processedArticle.imageSource || "original",
      imageTags: processedArticle.imageTags || "",
      publishedAt: new Date(processedArticle.publishedAt),
      source: {
        id: processedArticle.source?.id || sourceId,
        name: processedArticle.source?.name || "Unknown",
        url: processedArticle.source?.url || "",
      },
      author: processedArticle.author || "",
      categories: normalizedCategories,
      countries: processedArticle.countries || [],
      language: processedArticle.language || "en",
      entities: processedArticle.entities || [],
      isBreakingNews: processedArticle.isBreakingNews || false,
    });

    // One final check before saving
    if (newArticle.entities && newArticle.entities.length > 0) {
      newArticle.entities = newArticle.entities.filter((entity) => {
        if (entity.coordinates) {
          return (
            entity.coordinates.type === "Point" &&
            entity.coordinates.coordinates &&
            Array.isArray(entity.coordinates.coordinates) &&
            entity.coordinates.coordinates.length === 2
          );
        }
        return true;
      });
    }

    // Save to database
    await newArticle.save();

    // Generate insights for the new article (if it has sufficient content)
    try {
      if (newArticle.content || newArticle.description) {
        const insights = await insightGenerator.generateArticleInsights(newArticle);

        if (insights && insights.length > 0) {
          newArticle.insights = insights;
          await newArticle.save();
          console.log(`Generated ${insights.length} insights for article: ${newArticle.title}`);
        }
      }
    } catch (error) {
      console.error("Error generating insights for article:", error.message);
      // Continue without insights if there's an error
    }

    return newArticle;
  } catch (error) {
    console.error("Error saving article:", error);
    return null;
  }
};
