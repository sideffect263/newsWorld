const Sentiment = require('sentiment');
const Article = require('../models/article.model');

// Initialize sentiment analyzer
const sentiment = new Sentiment();

/**
 * Analyze sentiment of a text
 * @param {String} text - Text to analyze
 * @returns {Object} Sentiment analysis result with score and comparative
 */
exports.analyzeSentiment = (text) => {
  if (!text || typeof text !== 'string') {
    return { score: 0, comparative: 0 };
  }
  
  try {
    const result = sentiment.analyze(text);
    return {
      score: result.score,
      comparative: result.comparative
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return { score: 0, comparative: 0 };
  }
};

/**
 * Analyze sentiment of an article
 * @param {Object} article - Article object
 * @returns {Object} Sentiment analysis result with score and assessment
 */
exports.analyzeArticleSentiment = (article) => {
  try {
    // Combine title and description for sentiment analysis
    const text = [
      article.title || '',
      article.description || ''
    ].join(' ');
    
    const result = exports.analyzeSentiment(text);
    
    // Categorize sentiment
    let assessment = 'neutral';
    
    if (result.comparative >= 0.1) {
      assessment = 'positive';
    } else if (result.comparative <= -0.1) {
      assessment = 'negative';
    }
    
    return {
      score: result.score,
      comparative: result.comparative,
      assessment
    };
  } catch (error) {
    console.error('Error analyzing article sentiment:', error);
    return { score: 0, comparative: 0, assessment: 'neutral' };
  }
};

/**
 * Analyze sentiment of all articles in a time range
 * @param {Object} options - Options with timeRange
 * @returns {Object} Sentiment analysis results and stats
 */
exports.analyzeSentimentTrends = async (options = {}) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      endDate = new Date(),
      category,
      source,
      country,
      updateArticles = false
    } = options;
    
    // Build query
    const query = {
      publishedAt: { $gte: startDate, $lte: endDate }
    };
    
    if (category) {
      query.categories = category;
    }
    
    if (source) {
      query['source.name'] = source;
    }
    
    if (country) {
      query.countries = country;
    }
    
    // Get articles
    const articles = await Article.find(query);
    
    console.log(`Analyzing sentiment for ${articles.length} articles`);
    
    if (articles.length === 0) {
      return { 
        success: false, 
        message: 'No articles found for sentiment analysis' 
      };
    }
    
    // Analyze sentiment for each article
    const sentiments = [];
    const updateOperations = [];
    
    for (const article of articles) {
      const sentiment = exports.analyzeArticleSentiment(article);
      
      // Add to results
      sentiments.push({
        article: {
          id: article._id,
          title: article.title,
          publishedAt: article.publishedAt
        },
        sentiment
      });
      
      // Update article in database if requested
      if (updateArticles) {
        updateOperations.push({
          updateOne: {
            filter: { _id: article._id },
            update: { 
              $set: { 
                sentiment: sentiment.comparative,
                sentimentAssessment: sentiment.assessment
              }
            }
          }
        });
      }
    }
    
    // Apply updates if needed
    if (updateArticles && updateOperations.length > 0) {
      await Article.bulkWrite(updateOperations);
      console.log(`Updated sentiment for ${updateOperations.length} articles`);
    }
    
    // Calculate sentiment statistics
    const stats = calculateSentimentStats(sentiments);
    
    // Calculate sentiment over time
    const timeSeriesData = calculateSentimentTimeSeries(sentiments);
    
    return {
      success: true,
      message: `Successfully analyzed sentiment for ${articles.length} articles`,
      data: {
        sentiments,
        stats,
        timeSeries: timeSeriesData
      }
    };
  } catch (error) {
    console.error('Error in analyzeSentimentTrends:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Calculate sentiment statistics
 * @param {Array} sentiments - Array of sentiment analysis results
 * @returns {Object} Sentiment statistics
 */
const calculateSentimentStats = (sentiments) => {
  // Count by assessment
  const assessmentCount = {
    positive: 0,
    neutral: 0,
    negative: 0
  };
  
  // Calculate average sentiment
  let totalScore = 0;
  let totalComparative = 0;
  
  sentiments.forEach(item => {
    const { assessment, score, comparative } = item.sentiment;
    
    assessmentCount[assessment] += 1;
    totalScore += score;
    totalComparative += comparative;
  });
  
  const count = sentiments.length;
  
  return {
    count,
    assessmentCount,
    distribution: {
      positive: count > 0 ? (assessmentCount.positive / count) * 100 : 0,
      neutral: count > 0 ? (assessmentCount.neutral / count) * 100 : 0,
      negative: count > 0 ? (assessmentCount.negative / count) * 100 : 0
    },
    averageScore: count > 0 ? totalScore / count : 0,
    averageComparative: count > 0 ? totalComparative / count : 0
  };
};

/**
 * Calculate sentiment time series data
 * @param {Array} sentiments - Array of sentiment analysis results
 * @returns {Object} Time series data
 */
const calculateSentimentTimeSeries = (sentiments) => {
  // Group by date
  const dateGroups = {};
  
  sentiments.forEach(item => {
    const date = new Date(item.article.publishedAt);
    const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    if (!dateGroups[dateString]) {
      dateGroups[dateString] = {
        count: 0,
        totalScore: 0,
        totalComparative: 0,
        assessmentCount: {
          positive: 0,
          neutral: 0,
          negative: 0
        }
      };
    }
    
    const group = dateGroups[dateString];
    const { assessment, score, comparative } = item.sentiment;
    
    group.count += 1;
    group.totalScore += score;
    group.totalComparative += comparative;
    group.assessmentCount[assessment] += 1;
  });
  
  // Calculate daily averages and convert to array
  const timeSeriesData = Object.keys(dateGroups)
    .sort() // Sort by date
    .map(date => {
      const group = dateGroups[date];
      
      return {
        date,
        count: group.count,
        averageScore: group.totalScore / group.count,
        averageComparative: group.totalComparative / group.count,
        assessmentCount: group.assessmentCount,
        distribution: {
          positive: (group.assessmentCount.positive / group.count) * 100,
          neutral: (group.assessmentCount.neutral / group.count) * 100,
          negative: (group.assessmentCount.negative / group.count) * 100
        }
      };
    });
  
  return timeSeriesData;
};

/**
 * Update sentiment for new articles
 * @param {Array} articles - Array of new articles
 * @returns {Object} Result of sentiment update operation
 */
exports.updateSentimentForNewArticles = async (articles) => {
  try {
    const updateOperations = [];
    
    for (const article of articles) {
      // Skip if article doesn't have necessary data
      if (!article.title && !article.description) {
        continue;
      }
      
      const sentiment = exports.analyzeArticleSentiment(article);
      
      updateOperations.push({
        updateOne: {
          filter: { _id: article._id },
          update: { 
            $set: { 
              sentiment: sentiment.comparative,
              sentimentAssessment: sentiment.assessment
            }
          }
        }
      });
    }
    
    if (updateOperations.length > 0) {
      await Article.bulkWrite(updateOperations);
      console.log(`Updated sentiment for ${updateOperations.length} new articles`);
      
      return {
        success: true,
        message: `Updated sentiment for ${updateOperations.length} articles`,
        count: updateOperations.length
      };
    }
    
    return {
      success: true,
      message: 'No articles to update',
      count: 0
    };
  } catch (error) {
    console.error('Error updating sentiment for new articles:', error);
    return { success: false, message: error.message };
  }
}; 