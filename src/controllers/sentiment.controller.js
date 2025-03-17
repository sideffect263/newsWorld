const sentimentAnalyzer = require('../services/sentimentAnalyzer');
const Article = require('../models/article.model');

// @desc    Get sentiment analysis for articles
// @route   GET /api/sentiment
// @access  Public
exports.getSentimentAnalysis = async (req, res, next) => {
  try {
    const { 
      startDate,
      endDate,
      category,
      source,
      country,
      timeframe = 'daily'
    } = req.query;
    
    // Convert dates if provided
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;
    
    // Analyze sentiment trends
    const result = await sentimentAnalyzer.analyzeSentimentTrends({
      startDate: startDateObj,
      endDate: endDateObj,
      category,
      source,
      country
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get sentiment statistics
// @route   GET /api/sentiment/stats
// @access  Public
exports.getSentimentStats = async (req, res, next) => {
  try {
    const { 
      startDate,
      endDate,
      category,
      source,
      country
    } = req.query;
    
    // Convert dates if provided
    const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDateObj = endDate ? new Date(endDate) : new Date();
    
    // Build query
    const query = {
      publishedAt: { $gte: startDateObj, $lte: endDateObj }
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
    
    // Get sentiment stats
    const articles = await Article.find(query).select('sentiment sentimentAssessment publishedAt');
    
    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No articles found for sentiment analysis'
      });
    }
    
    // Calculate overall stats
    const assessmentCount = {
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    let totalSentiment = 0;
    
    articles.forEach(article => {
      if (article.sentimentAssessment) {
        assessmentCount[article.sentimentAssessment] += 1;
      }
      
      if (typeof article.sentiment === 'number') {
        totalSentiment += article.sentiment;
      }
    });
    
    // Group by day
    const dateGroups = {};
    
    articles.forEach(article => {
      const date = new Date(article.publishedAt);
      const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      if (!dateGroups[dateString]) {
        dateGroups[dateString] = {
          date: dateString,
          count: 0,
          totalSentiment: 0,
          assessmentCount: {
            positive: 0,
            neutral: 0,
            negative: 0
          }
        };
      }
      
      const group = dateGroups[dateString];
      
      group.count += 1;
      
      if (article.sentimentAssessment) {
        group.assessmentCount[article.sentimentAssessment] += 1;
      }
      
      if (typeof article.sentiment === 'number') {
        group.totalSentiment += article.sentiment;
      }
    });
    
    // Calculate averages for each day
    const timeSeries = Object.values(dateGroups)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(group => ({
        date: group.date,
        count: group.count,
        averageSentiment: group.count > 0 ? group.totalSentiment / group.count : 0,
        distribution: {
          positive: group.count > 0 ? (group.assessmentCount.positive / group.count) * 100 : 0,
          neutral: group.count > 0 ? (group.assessmentCount.neutral / group.count) * 100 : 0,
          negative: group.count > 0 ? (group.assessmentCount.negative / group.count) * 100 : 0
        }
      }));
    
    res.status(200).json({
      success: true,
      data: {
        total: articles.length,
        averageSentiment: articles.length > 0 ? totalSentiment / articles.length : 0,
        distribution: {
          positive: articles.length > 0 ? (assessmentCount.positive / articles.length) * 100 : 0,
          neutral: articles.length > 0 ? (assessmentCount.neutral / articles.length) * 100 : 0,
          negative: articles.length > 0 ? (assessmentCount.negative / articles.length) * 100 : 0
        },
        assessmentCount,
        timeSeries
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update sentiment for articles
// @route   POST /api/sentiment/update
// @access  Private (admin only)
exports.updateSentiment = async (req, res, next) => {
  try {
    const { 
      startDate,
      endDate,
      limit = 1000
    } = req.body;
    
    // Convert dates if provided
    const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDateObj = endDate ? new Date(endDate) : new Date();
    
    // Get articles to update
    const articles = await Article.find({
      publishedAt: { $gte: startDateObj, $lte: endDateObj },
      $or: [
        { sentiment: { $exists: false } },
        { sentimentAssessment: { $exists: false } }
      ]
    }).limit(limit);
    
    if (articles.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No articles found needing sentiment updates'
      });
    }
    
    // Update sentiment
    const result = await sentimentAnalyzer.updateSentimentForNewArticles(articles);
    
    res.status(200).json({
      success: true,
      message: `Updated sentiment for ${result.count} articles`,
      data: { count: result.count }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get sentiment comparison by category
// @route   GET /api/sentiment/categories
// @access  Public
exports.getSentimentByCategory = async (req, res, next) => {
  try {
    const { 
      startDate,
      endDate,
      country
    } = req.query;
    
    // Convert dates if provided
    const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDateObj = endDate ? new Date(endDate) : new Date();
    
    // Base query
    const query = {
      publishedAt: { $gte: startDateObj, $lte: endDateObj },
      sentiment: { $exists: true }
    };
    
    if (country) {
      query.countries = country;
    }
    
    // Get all articles with categories
    const articles = await Article.find(query).select('categories sentiment sentimentAssessment');
    
    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No articles found for sentiment analysis'
      });
    }
    
    // Group by category
    const categoryStats = {};
    
    articles.forEach(article => {
      if (!article.categories || article.categories.length === 0) return;
      
      article.categories.forEach(category => {
        if (!categoryStats[category]) {
          categoryStats[category] = {
            count: 0,
            totalSentiment: 0,
            assessmentCount: {
              positive: 0,
              neutral: 0,
              negative: 0
            }
          };
        }
        
        const stats = categoryStats[category];
        
        stats.count += 1;
        
        if (typeof article.sentiment === 'number') {
          stats.totalSentiment += article.sentiment;
        }
        
        if (article.sentimentAssessment) {
          stats.assessmentCount[article.sentimentAssessment] += 1;
        }
      });
    });
    
    // Calculate averages for each category
    const categorySentiment = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        averageSentiment: stats.count > 0 ? stats.totalSentiment / stats.count : 0,
        distribution: {
          positive: stats.count > 0 ? (stats.assessmentCount.positive / stats.count) * 100 : 0,
          neutral: stats.count > 0 ? (stats.assessmentCount.neutral / stats.count) * 100 : 0,
          negative: stats.count > 0 ? (stats.assessmentCount.negative / stats.count) * 100 : 0
        }
      }))
      .sort((a, b) => b.count - a.count);
    
    res.status(200).json({
      success: true,
      data: categorySentiment
    });
  } catch (err) {
    next(err);
  }
}; 