const Article = require('../models/article.model');
const Trend = require('../models/trend.model');
const natural = require('natural');
const { removeStopwords } = require('stopword');
const TfIdf = natural.TfIdf;
const Tokenizer = new natural.WordTokenizer();
const compromise = require('compromise');

// Configure stemmer
const stemmer = natural.PorterStemmer;

/**
 * Analyze articles and generate trends
 * @param {Object} options - Configuration options
 * @param {String} options.timeframe - Timeframe for analysis ('hourly', 'daily', 'weekly', 'monthly')
 * @param {Number} options.limit - Maximum number of articles to analyze
 * @param {Boolean} options.forceRefresh - Whether to force a refresh of all trends
 */
exports.analyzeTrends = async (options = {}) => {
  try {
    const { 
      timeframe = 'daily', 
      limit = 1000, 
      forceRefresh = false 
    } = options;
    
    console.log(`Starting trend analysis for ${timeframe} timeframe`);
    
    // Get time range based on timeframe
    const timeRange = getTimeRange(timeframe);
    
    // Get recent articles
    const query = { publishedAt: { $gte: timeRange.start, $lte: timeRange.end } };
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit);
    
    console.log(`Analyzing ${articles.length} articles for trends`);
    
    if (articles.length === 0) {
      return { success: false, message: 'No articles found for analysis' };
    }
    
    // Reset trends for this timeframe if forceRefresh is true
    if (forceRefresh) {
      await Trend.deleteMany({ timeframe });
    }
    
    // Analyze keyword frequencies
    const keywordTrends = await analyzeKeywordTrends(articles, timeframe);
    
    // Analyze entities (people, organizations, locations)
    const entityTrends = await analyzeEntityTrends(articles, timeframe);
    
    // Analyze categories
    const categoryTrends = await analyzeCategoryTrends(articles, timeframe);
    
    return {
      success: true,
      message: `Successfully analyzed trends for ${timeframe} timeframe`,
      data: {
        keywords: keywordTrends,
        entities: entityTrends,
        categories: categoryTrends
      }
    };
  } catch (error) {
    console.error('Error in analyzeTrends:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get time range based on timeframe
 * @param {String} timeframe - The timeframe ('hourly', 'daily', 'weekly', 'monthly')
 * @returns {Object} Time range with start and end dates
 */
const getTimeRange = (timeframe) => {
  const now = new Date();
  let start = new Date();
  
  switch (timeframe) {
    case 'hourly':
      start.setHours(now.getHours() - 1);
      break;
    case 'daily':
      start.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      start.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(now.getMonth() - 1);
      break;
    default:
      start.setDate(now.getDate() - 1); // Default to daily
  }
  
  return { start, end: now };
};

/**
 * Analyze keyword trends from articles
 * @param {Array} articles - List of articles to analyze
 * @param {String} timeframe - Timeframe for analysis
 * @returns {Array} Trending keywords
 */
const analyzeKeywordTrends = async (articles, timeframe) => {
  try {
    // Create TF-IDF instance
    const tfidf = new TfIdf();
    
    // Process each article
    articles.forEach(article => {
      const text = [
        article.title || '', 
        article.description || ''
      ].join(' ');
      
      if (text.trim()) {
        tfidf.addDocument(text);
      }
    });
    
    // Extract keywords with scores
    const keywordScores = {};
    const processedArticles = [];
    
    articles.forEach((article, docIndex) => {
      if (!article.title && !article.description) return;
      
      // Get text and tokenize
      const text = [article.title || '', article.description || ''].join(' ');
      let tokens = Tokenizer.tokenize(text.toLowerCase());
      
      // Remove stopwords
      tokens = removeStopwords(tokens);
      
      // Apply stemming and filter short words
      tokens = tokens
        .filter(token => token.length > 2)
        .map(token => natural.PorterStemmer.stem(token));
      
      // Get TF-IDF scores for this document's terms
      tfidf.listTerms(docIndex).forEach(item => {
        const { term, tfidf: score } = item;
        
        if (term.length <= 2) return; // Skip very short terms
        
        if (!keywordScores[term]) {
          keywordScores[term] = {
            score: 0,
            count: 0,
            articles: [],
            categories: {},
            sources: {},
            countries: {},
            sentiment: {
              positive: 0,
              neutral: 0,
              negative: 0,
              avgScore: 0,
              totalScore: 0
            }
          };
        }
        
        keywordScores[term].score += score;
        keywordScores[term].count += 1;
        
        // Track article ID to avoid duplicates
        if (!keywordScores[term].articles.includes(article._id.toString())) {
          keywordScores[term].articles.push(article._id.toString());
          
          // Track sentiment if available
          if (article.sentimentAssessment) {
            keywordScores[term].sentiment[article.sentimentAssessment] += 1;
          }
          
          if (typeof article.sentiment === 'number') {
            keywordScores[term].sentiment.totalScore += article.sentiment;
          }
        }
        
        // Track categories
        if (article.categories && article.categories.length) {
          article.categories.forEach(category => {
            keywordScores[term].categories[category] = 
              (keywordScores[term].categories[category] || 0) + 1;
          });
        }
        
        // Track source
        const sourceName = article.source?.name;
        if (sourceName) {
          keywordScores[term].sources[sourceName] = 
            (keywordScores[term].sources[sourceName] || 0) + 1;
        }
        
        // Track countries
        if (article.countries && article.countries.length) {
          article.countries.forEach(country => {
            keywordScores[term].countries[country] = 
              (keywordScores[term].countries[country] || 0) + 1;
          });
        }
      });
      
      processedArticles.push(article._id);
    });
    
    // Calculate average sentiment for each keyword
    Object.values(keywordScores).forEach(keyword => {
      const articleCount = keyword.articles.length;
      if (articleCount > 0) {
        keyword.sentiment.avgScore = keyword.sentiment.totalScore / articleCount;
      }
    });
    
    // Convert to array and sort by score
    const keywords = Object.keys(keywordScores)
      .map(keyword => ({
        keyword,
        ...keywordScores[keyword]
      }))
      .filter(item => item.count > 1) // At least mentioned in 2 articles
      .sort((a, b) => b.score - a.score || b.count - a.count)
      .slice(0, 100); // Top 100 keywords
    
    // Save or update keywords in the database
    await saveKeywordTrends(keywords, timeframe);
    
    return keywords;
  } catch (error) {
    console.error('Error in analyzeKeywordTrends:', error);
    throw error;
  }
};

/**
 * Save keyword trends to the database
 * @param {Array} keywords - List of keywords with scores
 * @param {String} timeframe - Timeframe for trends
 */
const saveKeywordTrends = async (keywords, timeframe) => {
  try {
    // Bulk operations for better performance
    const operations = keywords.map(keywordData => {
      const { 
        keyword, 
        score, 
        count,
        articles,
        categories,
        sources,
        countries,
        sentiment
      } = keywordData;
      
      // Format data for database
      const categoriesArray = Object.keys(categories || {});
      
      const sourcesArray = Object.keys(sources || {}).map(name => ({
        name,
        count: sources[name]
      }));
      
      const countriesArray = Object.keys(countries || {}).map(code => ({
        code,
        count: countries[code]
      }));
      
      // Create or update operation
      return {
        updateOne: {
          filter: { keyword, timeframe, entityType: 'keyword' },
          update: {
            $set: {
              score,
              count,
              categories: categoriesArray,
              sources: sourcesArray,
              countries: countriesArray,
              lastSeenAt: new Date(),
              sentiment: {
                positive: sentiment?.positive || 0,
                neutral: sentiment?.neutral || 0,
                negative: sentiment?.negative || 0,
                avgScore: sentiment?.avgScore || 0
              }
            },
            $setOnInsert: {
              firstSeenAt: new Date(),
              entityType: 'keyword'
            },
            $addToSet: {
              articles: { $each: articles.map(id => id.toString()) }
            }
          },
          upsert: true
        }
      };
    });
    
    if (operations.length > 0) {
      await Trend.bulkWrite(operations);
    }
  } catch (error) {
    console.error('Error in saveKeywordTrends:', error);
    throw error;
  }
};

/**
 * Analyze entity trends from articles using NLP
 * @param {Array} articles - List of articles to analyze
 * @param {String} timeframe - Timeframe for analysis
 * @returns {Object} Trending entities by type
 */
const analyzeEntityTrends = async (articles, timeframe) => {
  try {
    const entityCounts = {
      person: {},
      organization: {},
      location: {},
      city: {},     // New specific type for cities
      country: {},  // New specific type for countries
      event: {}
    };
    
    articles.forEach(article => {
      // First, process pre-extracted entities if available
      if (article.entities && Array.isArray(article.entities) && article.entities.length > 0) {
        article.entities.forEach(entity => {
          // Map location subtypes (city, country) to the appropriate category
          let entityType = entity.type;
          
          // Select the appropriate entity map based on entity type
          let targetMap;
          if (entityType === 'city') {
            targetMap = entityCounts.city;
          } else if (entityType === 'country') {
            targetMap = entityCounts.country;
          } else if (entityType === 'location') {
            targetMap = entityCounts.location;
          } else if (entityType === 'person') {
            targetMap = entityCounts.person;
          } else if (entityType === 'organization') {
            targetMap = entityCounts.organization;
          } else if (entityType === 'event') {
            targetMap = entityCounts.event;
          } else {
            // Skip unknown entity types
            return;
          }
          
          // Process the entity
          if (targetMap) {
            processEntity(
              entity.name,
              entityType,
              targetMap,
              article,
              entity.count || 1
            );
          }
        });
      }
      
      // Then process text for additional entities that might have been missed
      const text = [
        article.title || '', 
        article.description || '',
        article.content || ''
      ].join(' ').substring(0, 10000); // Limit text length for performance
      
      if (!text.trim()) return;
      
      // Use compromise for NER (Named Entity Recognition)
      const doc = compromise(text);
      
      // Find people
      doc.people().forEach(person => {
        const name = person.text().trim();
        if (name && name.length > 1) {
          processEntity(
            name, 
            'person', 
            entityCounts.person, 
            article
          );
        }
      });
      
      // Find organizations
      doc.organizations().forEach(org => {
        const name = org.text().trim();
        if (name && name.length > 1) {
          processEntity(
            name, 
            'organization', 
            entityCounts.organization, 
            article
          );
        }
      });
      
      // Find places (if not already handled by pre-extracted entities)
      if (!article.entities || article.entities.length === 0) {
        doc.places().forEach(place => {
          const name = place.text().trim();
          if (name && name.length > 1) {
            processEntity(
              name, 
              'location', 
              entityCounts.location, 
              article
            );
          }
        });
      }
    });
    
    // Process and save each entity type
    const result = {};
    
    for (const [entityType, entities] of Object.entries(entityCounts)) {
      const entityList = Object.keys(entities)
        .map(name => ({
          keyword: name,
          entityType,
          ...entities[name]
        }))
        .filter(e => e.count > 1) // At least 2 mentions
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Top 50 entities of each type
      
      // Save entities to database
      await saveEntityTrends(entityList, entityType, timeframe);
      
      result[entityType] = entityList;
    }
    
    return result;
  } catch (error) {
    console.error('Error in analyzeEntityTrends:', error);
    throw error;
  }
};

/**
 * Process an entity and update its counts
 */
const processEntity = (name, type, entityMap, article, count = 1) => {
  if (!name || name.length <= 1) return;
  
  // Normalize entity name
  const normalizedName = name.trim();
  
  if (!entityMap[normalizedName]) {
    entityMap[normalizedName] = {
      count: 0,
      articles: [],
      categories: {},
      sources: {},
      countries: {},
      sentiment: {
        positive: 0,
        neutral: 0,
        negative: 0,
        totalScore: 0
      }
    };
  }
  
  entityMap[normalizedName].count += count;
  
  // Track article ID to avoid duplicates
  if (!entityMap[normalizedName].articles.includes(article._id.toString())) {
    entityMap[normalizedName].articles.push(article._id.toString());
    
    // Track sentiment if available
    if (article.sentimentAssessment) {
      entityMap[normalizedName].sentiment[article.sentimentAssessment] += 1;
    }
    
    if (typeof article.sentiment === 'number') {
      entityMap[normalizedName].sentiment.totalScore += article.sentiment;
    }
  }
  
  // Track categories
  if (article.categories && article.categories.length) {
    article.categories.forEach(category => {
      entityMap[normalizedName].categories[category] = 
        (entityMap[normalizedName].categories[category] || 0) + 1;
    });
  }
  
  // Track source
  const sourceName = article.source?.name;
  if (sourceName) {
    entityMap[normalizedName].sources[sourceName] = 
      (entityMap[normalizedName].sources[sourceName] || 0) + 1;
  }
  
  // Track countries
  if (article.countries && article.countries.length) {
    article.countries.forEach(country => {
      entityMap[normalizedName].countries[country] = 
        (entityMap[normalizedName].countries[country] || 0) + 1;
    });
  }
};

/**
 * Save entity trends to database
 */
const saveEntityTrends = async (entities, entityType, timeframe) => {
  try {
    // Bulk operations for better performance
    const operations = entities.map(entityData => {
      const { 
        keyword, 
        count,
        articles,
        categories,
        sources,
        countries,
        sentiment
      } = entityData;
      
      // Calculate average sentiment if possible
      let avgSentiment = 0;
      if (sentiment && articles.length > 0) {
        avgSentiment = sentiment.totalScore / articles.length;
      }
      
      // Format data for database
      const categoriesArray = Object.keys(categories || {});
      
      const sourcesArray = Object.keys(sources || {}).map(name => ({
        name,
        count: sources[name]
      }));
      
      const countriesArray = Object.keys(countries || {}).map(code => ({
        code,
        count: countries[code]
      }));
      
      return {
        updateOne: {
          filter: { keyword, timeframe, entityType },
          update: {
            $set: {
              count,
              categories: categoriesArray,
              sources: sourcesArray,
              countries: countriesArray,
              lastSeenAt: new Date(),
              sentiment: {
                positive: sentiment?.positive || 0,
                neutral: sentiment?.neutral || 0,
                negative: sentiment?.negative || 0,
                avgScore: avgSentiment
              }
            },
            $setOnInsert: {
              firstSeenAt: new Date()
            },
            $addToSet: {
              articles: { $each: articles.map(id => id.toString()) }
            }
          },
          upsert: true
        }
      };
    });
    
    if (operations.length > 0) {
      await Trend.bulkWrite(operations);
    }
  } catch (error) {
    console.error('Error in saveEntityTrends:', error);
    throw error;
  }
};

/**
 * Analyze category trends from articles
 * @param {Array} articles - List of articles to analyze
 * @param {String} timeframe - Timeframe for analysis
 * @returns {Array} Trending categories
 */
const analyzeCategoryTrends = async (articles, timeframe) => {
  try {
    const categoryCounts = {};
    
    articles.forEach(article => {
      if (!article.categories || article.categories.length === 0) return;
      
      article.categories.forEach(category => {
        if (!categoryCounts[category]) {
          categoryCounts[category] = {
            count: 0,
            articles: [],
            sources: {},
            countries: {}
          };
        }
        
        categoryCounts[category].count += 1;
        
        // Track article ID to avoid duplicates
        if (!categoryCounts[category].articles.includes(article._id.toString())) {
          categoryCounts[category].articles.push(article._id.toString());
        }
        
        // Track source
        const sourceName = article.source?.name;
        if (sourceName) {
          categoryCounts[category].sources[sourceName] = 
            (categoryCounts[category].sources[sourceName] || 0) + 1;
        }
        
        // Track countries
        if (article.countries && article.countries.length) {
          article.countries.forEach(country => {
            categoryCounts[category].countries[country] = 
              (categoryCounts[category].countries[country] || 0) + 1;
          });
        }
      });
    });
    
    // Convert to array and sort by count
    const categories = Object.keys(categoryCounts)
      .map(category => ({
        keyword: category,
        entityType: 'category',
        ...categoryCounts[category]
      }))
      .sort((a, b) => b.count - a.count);
    
    // Save categories to database
    await saveEntityTrends(categories, 'category', timeframe);
    
    return categories;
  } catch (error) {
    console.error('Error in analyzeCategoryTrends:', error);
    throw error;
  }
};

/**
 * Get trending topics
 * @param {Object} options - Query options
 * @returns {Object} Trending topics
 */
exports.getTrendingTopics = async (options = {}) => {
  try {
    const { 
      timeframe = 'daily',
      entityType,
      category,
      country,
      limit = 20
    } = options;
    
    const query = { timeframe };
    
    if (entityType) {
      query.entityType = entityType;
    }
    
    if (category) {
      query.categories = category;
    }
    
    if (country) {
      query['countries.code'] = country;
    }
    
    const trends = await Trend.find(query)
      .sort({ count: -1 })
      .limit(limit);
    
    return {
      success: true,
      count: trends.length,
      data: trends
    };
  } catch (error) {
    console.error('Error in getTrendingTopics:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update trends after new articles are fetched
 * @param {Array} newArticles - Newly fetched articles
 */
exports.updateTrendsWithNewArticles = async (newArticles) => {
  if (!newArticles || newArticles.length === 0) {
    return { success: false, message: 'No new articles to analyze' };
  }
  
  try {
    // Analyze hourly trends with new articles
    const hourlyResult = await exports.analyzeTrends({ 
      timeframe: 'hourly', 
      limit: 500
    });
    
    // Update daily trends
    const dailyResult = await exports.analyzeTrends({ 
      timeframe: 'daily',
      limit: 1000
    });
    
    return {
      success: true,
      message: `Updated trends with ${newArticles.length} new articles`,
      hourly: hourlyResult.success,
      daily: dailyResult.success
    };
  } catch (error) {
    console.error('Error updating trends with new articles:', error);
    return { success: false, message: error.message };
  }
}; 