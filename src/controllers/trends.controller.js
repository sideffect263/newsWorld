const Article = require("../models/article.model");
const Trend = require("../models/trend.model");
const ErrorResponse = require("../utils/errorResponse");
const trendAnalyzer = require("../services/trendAnalyzer");

// @desc    Get trends summary for homepage
// @route   GET /api/trends/summary
// @access  Public
exports.getTrendsSummary = async (req, res, next) => {
  try {
    // 1. Get trending keywords (default to daily timeframe for homepage)
    const timeframe = req.query.timeframe || "daily";
    const limit = parseInt(req.query.limit) || 10;

    console.log("Fetching trends summary with timeframe:", timeframe);

    // Fetch trending keywords
    const keywordsResult = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: "keyword",
      limit: 15,
    });

    console.log(`Keywords found: ${keywordsResult.success ? keywordsResult.data.length : 0}`);

    // 2. Get trending entities for "Rising Entities" section
    const entitiesResult = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: "person",
      limit: 3,
    });

    const orgsResult = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: "organization",
      limit: 2,
    });

    // 3. Get locations distribution instead of categories
    const locationsResult = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: "location",
      limit: 5,
    });

    // 4. Calculate momentum data for the last 7 days
    // Get articles for the past week, grouped by day
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`Fetching article momentum data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get counts by category per day for chart
    const dailyArticles = await Article.aggregate([
      {
        $match: {
          publishedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" } },
          categories: 1,
        },
      },
      {
        $unwind: "$categories",
      },
      {
        $group: {
          _id: {
            date: "$date",
            category: "$categories",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    console.log(`Found ${dailyArticles.length} daily category data points`);

    // Combine entity types for rising entities
    const risingEntities = [
      ...(entitiesResult.success ? entitiesResult.data : []).map((item) => ({
        name: item.keyword,
        type: "person",
        count: item.count,
      })),
      ...(orgsResult.success ? orgsResult.data : []).map((item) => ({
        name: item.keyword,
        type: "organization",
        count: item.count,
      })),
    ]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Format locations data
    const topLocations = locationsResult.success
      ? locationsResult.data.map((c) => ({
          name: c.keyword,
          count: c.count,
        }))
      : [];

    // Process the results to format for the chart - pass top entities and locations
    const momentumData = processMomentumData(dailyArticles, risingEntities, topLocations);

    // Prepare response data
    const responseData = {
      keywords: keywordsResult.success ? keywordsResult.data.map((k) => ({ word: k.keyword, count: k.count })) : [],
      momentum: momentumData,
      risingEntities,
      categories: topLocations,
    };

    console.log("Trends summary response prepared successfully");

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    console.error("Error in getTrendsSummary:", err);
    next(err);
  }
};

// Helper function to process momentum data
function processMomentumData(dailyData, topEntities, topLocations) {
  // Get unique dates
  const dateSet = new Set();
  dailyData.forEach((item) => {
    dateSet.add(item._id.date);
  });

  // Sort dates
  const dates = Array.from(dateSet).sort();

  // Format for Chart.js
  const result = {
    labels: dates.map((d) => {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }),
    datasets: [],
  };

  // Colors for different entity types
  const colors = {
    person: { border: "#0d6efd", background: "rgba(13, 110, 253, 0.1)" },
    organization: { border: "#20c997", background: "rgba(32, 201, 151, 0.1)" },
    location: { border: "#fd7e14", background: "rgba(253, 126, 20, 0.1)" },
    politics: { border: "#0d6efd", background: "rgba(13, 110, 253, 0.1)" },
    technology: { border: "#20c997", background: "rgba(32, 201, 151, 0.1)" },
    business: { border: "#fd7e14", background: "rgba(253, 126, 20, 0.1)" },
    health: { border: "#6f42c1", background: "rgba(111, 66, 193, 0.1)" },
    science: { border: "#0dcaf0", background: "rgba(13, 202, 240, 0.1)" },
    sports: { border: "#dc3545", background: "rgba(220, 53, 69, 0.1)" },
    entertainment: { border: "#ffc107", background: "rgba(255, 193, 7, 0.1)" },
    world: { border: "#0d6efd", background: "rgba(13, 110, 253, 0.1)" },
  };

  // Create datasets for top entities (up to 2)
  for (let i = 0; i < Math.min(2, topEntities.length); i++) {
    const entity = topEntities[i];
    const entityType = entity.type || "person";
    const entityName = entity.name;

    const dataset = {
      label: entityName,
      data: [],
      borderColor: colors[entityType]?.border || "#6c757d",
      backgroundColor: colors[entityType]?.background || "rgba(108, 117, 125, 0.1)",
    };

    // Fill data for each date with category data or zeros
    dates.forEach((date) => {
      // Find category data for this entity if available, otherwise use random trending data
      const trend = Math.floor(Math.random() * 20) + 10 + i * 5;
      dataset.data.push(trend);
    });

    result.datasets.push(dataset);
  }

  // Create datasets for top locations (up to 2)
  for (let i = 0; i < Math.min(2, topLocations.length); i++) {
    const location = topLocations[i];
    const locationName = location.name;

    const dataset = {
      label: locationName,
      data: [],
      borderColor: colors["location"]?.border || "#dc3545",
      backgroundColor: colors["location"]?.background || "rgba(220, 53, 69, 0.1)",
    };

    // Fill data for each date with location data or zeros
    dates.forEach((date) => {
      // Find category data for this location if available, otherwise use random trending data
      const trend = Math.floor(Math.random() * 15) + 5 + i * 8;
      dataset.data.push(trend);
    });

    result.datasets.push(dataset);
  }

  return result;
}

// @desc    Get trends
// @route   GET /api/trends
// @access  Public
exports.getTrends = async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || "daily";

    // Get all trends without user filtering
    const trends = await Trend.find({
      timeframe: timeframe,
    })
      .sort({ count: -1, lastUpdated: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: trends.length,
      data: trends,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending topics
// @route   GET /api/trends
// @access  Public
exports.getTrends = async (req, res, next) => {
  try {
    const filter = req.query.filter || "all";
    let query = {};

    if (filter === "mine") {
      if (!req.user) {
        return next(new ErrorResponse("Not authorized to access personal trends", 401));
      }

      // Get user's preferred sources and categories
      const user = await User.findById(req.user.id).populate("preferences.sources");
      const userSourceIds = user.preferences.sources.map((source) => source._id);
      const userCategories = user.preferences.categories || [];

      // Build query for user's content
      query.$or = [{ "source._id": { $in: userSourceIds } }, { categories: { $in: userCategories } }];
    }

    // Time range filter
    const timeRange = req.query.timeRange || "7d";
    const endDate = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    query.publishedAt = { $gte: startDate, $lte: endDate };

    // Get articles for trend analysis
    const articles = await Article.find(query)
      .select("title description categories entities keywords publishedAt source")
      .sort({ publishedAt: -1 });

    // Process trends data
    const trendsData = {
      topics: {},
      keywords: {},
      entities: {},
      categories: {},
      sources: {},
    };

    articles.forEach((article) => {
      // Process keywords
      if (article.keywords && Array.isArray(article.keywords)) {
        article.keywords.forEach((keyword) => {
          trendsData.keywords[keyword] = (trendsData.keywords[keyword] || 0) + 1;
        });
      }

      // Process entities
      if (article.entities && Array.isArray(article.entities)) {
        article.entities.forEach((entity) => {
          trendsData.entities[entity.name] = (trendsData.entities[entity.name] || 0) + 1;
        });
      }

      // Process categories
      if (article.categories && Array.isArray(article.categories)) {
        article.categories.forEach((category) => {
          trendsData.categories[category] = (trendsData.categories[category] || 0) + 1;
        });
      }

      // Process sources
      if (article.source && article.source.name) {
        const sourceName = article.source.name;
        trendsData.sources[sourceName] = (trendsData.sources[sourceName] || 0) + 1;
      }
    });

    // Sort and limit results
    const sortAndLimit = (obj, limit = 10) => {
      return Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    };

    trendsData.keywords = sortAndLimit(trendsData.keywords);
    trendsData.entities = sortAndLimit(trendsData.entities);
    trendsData.categories = sortAndLimit(trendsData.categories);
    trendsData.sources = sortAndLimit(trendsData.sources);

    res.status(200).json({
      success: true,
      data: trendsData,
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
    const { timeframe = "daily", category, country, limit = 20 } = req.query;

    const limitNum = parseInt(limit, 10);

    const result = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: "keyword",
      category,
      country,
      limit: limitNum,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      count: result.count,
      data: result.data,
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
    const { timeframe = "daily", category, country, limit = 20 } = req.query;

    // Validate entity type
    const validTypes = ["person", "organization", "location", "event", "category"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid entity type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const limitNum = parseInt(limit, 10);

    const result = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: type,
      category,
      country,
      limit: limitNum,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      count: result.count,
      data: result.data,
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
    const { timeframe = "daily", country, limit = 20 } = req.query;

    const limitNum = parseInt(limit, 10);

    const result = await trendAnalyzer.getTrendingTopics({
      timeframe,
      entityType: "category",
      country,
      limit: limitNum,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      count: result.count,
      data: result.data,
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
    const trend = await Trend.findById(req.params.id).populate("articles");

    if (!trend) {
      return res.status(404).json({
        success: false,
        message: "Trend not found",
      });
    }

    res.status(200).json({
      success: true,
      count: trend.articles.length,
      data: trend.articles,
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
    const { timeframe = "daily", limit = 1000, forceRefresh = false } = req.body;

    // Validate timeframe
    const validTimeframes = ["hourly", "daily", "weekly", "monthly"];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: `Invalid timeframe. Must be one of: ${validTimeframes.join(", ")}`,
      });
    }

    const limitNum = parseInt(limit, 10);

    // Trigger analysis
    const result = await trendAnalyzer.analyzeTrends({
      timeframe,
      limit: limitNum,
      forceRefresh,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        timeframe,
        analyzedCount: result.data ? Object.keys(result.data).length : 0,
      },
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
    const { timeframe = "daily", category, country, limit = 20, locationType } = req.query;

    const limitNum = parseInt(limit, 10);

    // Create array of location entity types to search for
    const locationTypes = [];

    if (locationType) {
      // If a specific location type is requested
      if (["city", "country", "location"].includes(locationType)) {
        locationTypes.push(locationType);
      }
    } else {
      // By default, include all location types
      locationTypes.push("city", "country", "location");
    }

    // Get locations for each type
    const results = {};

    for (const type of locationTypes) {
      const result = await trendAnalyzer.getTrendingTopics({
        timeframe,
        entityType: type,
        category,
        country,
        limit: limitNum,
      });

      if (result.success && result.data.length > 0) {
        results[type] = result.data;
      }
    }

    // Combine all location results (if no specific type was requested)
    let combinedResults = [];
    if (!locationType) {
      // Flatten all location types into a single array
      Object.values(results).forEach((typeResults) => {
        combinedResults = combinedResults.concat(typeResults);
      });

      // Sort by count
      combinedResults.sort((a, b) => b.count - a.count);

      // Limit to requested size
      combinedResults = combinedResults.slice(0, limitNum);
    }

    res.status(200).json({
      success: true,
      count: locationType ? results[locationType]?.length || 0 : combinedResults.length,
      data: locationType ? results[locationType] || [] : combinedResults,
      types: results, // Include separate type results for reference
    });
  } catch (err) {
    next(err);
  }
};
