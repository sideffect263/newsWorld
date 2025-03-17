const Trend = require('../models/trend.model');
const trendAnalyzer = require('../services/trendAnalyzer');

// @desc    Get trending topics
// @route   GET /api/trends
// @access  Public
exports.getTrends = async (req, res, next) => {
  try {
    const { 
      timeframe = 'daily',
      entityType,
      category,
      country,
      limit = 20
    } = req.query;
    
    const limitNum = parseInt(limit, 10);
    
    const result = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType,
      category,
      country,
      limit: limitNum
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      count: result.count,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending keywords
// @route   GET /api/trends/keywords
// @access  Public
exports.getTrendingKeywords = async (req, res, next) => {
  try {
    const { 
      timeframe = 'daily',
      category,
      country,
      limit = 20
    } = req.query;
    
    const limitNum = parseInt(limit, 10);
    
    const result = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: 'keyword',
      category,
      country,
      limit: limitNum
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      count: result.count,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending entities (people, organizations, locations)
// @route   GET /api/trends/entities/:type
// @access  Public
exports.getTrendingEntities = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { 
      timeframe = 'daily',
      category,
      country,
      limit = 20
    } = req.query;
    
    // Validate entity type
    const validTypes = ['person', 'organization', 'location', 'event', 'category'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid entity type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    const limitNum = parseInt(limit, 10);
    
    const result = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: type,
      category,
      country,
      limit: limitNum
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      count: result.count,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending categories
// @route   GET /api/trends/categories
// @access  Public
exports.getTrendingCategories = async (req, res, next) => {
  try {
    const { 
      timeframe = 'daily',
      country,
      limit = 20
    } = req.query;
    
    const limitNum = parseInt(limit, 10);
    
    const result = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: 'category',
      country,
      limit: limitNum
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      count: result.count,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get articles related to a trend
// @route   GET /api/trends/:id/articles
// @access  Public
exports.getTrendArticles = async (req, res, next) => {
  try {
    const trend = await Trend.findById(req.params.id)
      .populate('articles');
    
    if (!trend) {
      return res.status(404).json({
        success: false,
        message: 'Trend not found'
      });
    }
    
    res.status(200).json({
      success: true,
      count: trend.articles.length,
      data: trend.articles
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Manually trigger trend analysis
// @route   POST /api/trends/analyze
// @access  Private (admin only)
exports.triggerTrendAnalysis = async (req, res, next) => {
  try {
    const { 
      timeframe = 'daily',
      limit = 1000,
      forceRefresh = false
    } = req.body;
    
    // Validate timeframe
    const validTimeframes = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
      });
    }
    
    const limitNum = parseInt(limit, 10);
    
    // Trigger analysis
    const result = await trendAnalyzer.analyzeTrends({
      timeframe,
      limit: limitNum,
      forceRefresh
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        timeframe,
        analyzedCount: result.data ? Object.keys(result.data).length : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending locations
// @route   GET /api/trends/locations
// @access  Public
exports.getTrendingLocations = async (req, res, next) => {
  try {
    const { 
      timeframe = 'daily',
      category,
      country,
      limit = 20,
      locationType
    } = req.query;
    
    const limitNum = parseInt(limit, 10);
    
    // Create array of location entity types to search for
    const locationTypes = [];
    
    if (locationType) {
      // If a specific location type is requested
      if (['city', 'country', 'location'].includes(locationType)) {
        locationTypes.push(locationType);
      }
    } else {
      // By default, include all location types
      locationTypes.push('city', 'country', 'location');
    }
    
    // Get locations for each type
    const results = {};
    
    for (const type of locationTypes) {
      const result = await trendAnalyzer.getTrendingTopics({
        timeframe,
        entityType: type,
        category,
        country,
        limit: limitNum
      });
      
      if (result.success && result.data.length > 0) {
        results[type] = result.data;
      }
    }
    
    // Combine all location results (if no specific type was requested)
    let combinedResults = [];
    if (!locationType) {
      // Flatten all location types into a single array
      Object.values(results).forEach(typeResults => {
        combinedResults = combinedResults.concat(typeResults);
      });
      
      // Sort by count
      combinedResults.sort((a, b) => b.count - a.count);
      
      // Limit to requested size
      combinedResults = combinedResults.slice(0, limitNum);
    }
    
    res.status(200).json({
      success: true,
      count: locationType ? (results[locationType]?.length || 0) : combinedResults.length,
      data: locationType ? results[locationType] || [] : combinedResults,
      types: results // Include separate type results for reference
    });
  } catch (err) {
    next(err);
  }
}; 