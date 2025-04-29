const Article = require("../models/article.model");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");

// @desc    Get all articles with pagination
// @route   GET /api/news
// @access  Public
exports.getArticles = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Build query
    const query = {};

    // Remove user-specific filtering since authentication is removed
    // All articles are public now

    // Filter by category if provided
    if (req.query.category) {
      query.categories = req.query.category;
    }

    // Filter by source if provided
    if (req.query.source) {
      query["source.name"] = req.query.source;
    }

    // Filter by country if provided
    if (req.query.country) {
      query.countries = req.query.country;
    }

    // Filter by language if provided
    if (req.query.language) {
      query.language = req.query.language;
    }

    // Filter by sentiment if provided
    if (req.query.sentiment) {
      query.sentimentAssessment = req.query.sentiment;
    }

    // Search if provided (basic text search)
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { content: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Filter by sentiment range if provided
    if (req.query.minSentiment || req.query.maxSentiment) {
      query.sentiment = {};

      if (req.query.minSentiment) {
        query.sentiment.$gte = parseFloat(req.query.minSentiment);
      }

      if (req.query.maxSentiment) {
        query.sentiment.$lte = parseFloat(req.query.maxSentiment);
      }
    }

    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.publishedAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    } else if (req.query.startDate) {
      query.publishedAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.publishedAt = { $lte: new Date(req.query.endDate) };
    }

    // Get total count after applying filters for accurate pagination
    const total = await Article.countDocuments(query);

    // Execute query with pagination
    const articles = await Article.find(query).sort({ publishedAt: -1 }).skip(startIndex).limit(limit);

    res.status(200).json({
      success: true,
      count: articles.length,
      total: total,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single article
// @route   GET /api/news/:id
// @access  Public
exports.getArticleById = async (req, res, next) => {
  try {
    // Check if the ID is a valid MongoDB ObjectId or a slug
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);

    // Find article by ID or slug
    let article;

    if (isObjectId) {
      article = await Article.findById(req.params.id);
    } else {
      article = await Article.findOne({ slug: req.params.id });
    }

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // Automatically increment view count when article is fetched
    article.viewCount = (article.viewCount || 0) + 1;

    // Get related articles based on categories and entities
    const categories = article.categories || [];
    const entityNames = article.entities?.map((e) => e.name) || [];

    // Get articles with matching categories or entities, excluding current article
    const relatedArticles = await Article.find({
      _id: { $ne: article._id },
      $or: [{ categories: { $in: categories } }, { "entities.name": { $in: entityNames } }],
    })
      .sort({ publishedAt: -1 })
      .limit(5);

    // If article has no image, generate one based on sentiment and keywords
    // Only do this if the article doesn't already have a sentiment-based image
    let sentimentImage = null;
    let shouldUpdateArticle = false;

    if (
      (!article.imageUrl && article.sentimentAssessment) ||
      (article.imageUrl && article.imageSource !== "sentiment" && article.sentimentAssessment)
    ) {
      try {
        const axios = require("axios");

        // Get keywords from entities (prefer people and organizations) and categories
        let keywords = [];

        // Add entity names as keywords (prioritize people and organizations)
        if (article.entities && article.entities.length > 0) {
          // First add people and organizations
          const priorityEntities = article.entities
            .filter((e) => ["person", "organization"].includes(e.type))
            .map((e) => e.name);

          // Then add other entities
          const otherEntities = article.entities
            .filter((e) => !["person", "organization"].includes(e.type))
            .map((e) => e.name);

          keywords = [...priorityEntities, ...otherEntities];
        }

        // Add categories as keywords if we don't have enough
        if (keywords.length < 2 && categories.length > 0) {
          keywords = [...keywords, ...categories];
        }

        // If we still don't have keywords, extract some from the title
        if (keywords.length === 0 && article.title) {
          const titleWords = article.title
            .split(" ")
            .filter((word) => word.length > 3) // Only words longer than 3 chars
            .filter((word) => !["this", "that", "with", "from", "have", "what"].includes(word.toLowerCase()));

          keywords = titleWords.slice(0, 3); // Take up to 3 words from title
        }

        // Take up to 3 keywords
        const keywordsParam = keywords.slice(0, 3).join(",");

        // Get sentiment-based image
        const localUrl = `http://localhost:${process.env.PORT || 5000}/api/proxy/sentiment-image?sentiment=${
          article.sentimentAssessment
        }&keywords=${encodeURIComponent(keywordsParam)}`;
        const imageResponse = await axios.get(localUrl);

        if (imageResponse.data.success && imageResponse.data.data) {
          sentimentImage = imageResponse.data.data;

          // Save the sentiment image to the article if it doesn't have an image
          if (!article.imageUrl) {
            article.imageUrl = sentimentImage.largeImageUrl || sentimentImage.imageUrl;
            article.imageSource = "sentiment";
            article.imageTags = sentimentImage.tags;
            shouldUpdateArticle = true;
          }
        }
      } catch (error) {
        console.error("Error getting sentiment-based image:", error.message);
        // Continue without sentiment image if there's an error
      }
    }

    // Save the article if it was updated with an image
    if (shouldUpdateArticle) {
      await article.save();
    } else {
      // Just save the view count increment if no other updates
      await article.save();
    }

    res.status(200).json({
      success: true,
      data: article,
      relatedArticles,
      sentimentImage,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get latest articles
// @route   GET /api/news/latest
// @access  Public
exports.getLatestArticles = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const articles = await Article.find().sort({ publishedAt: -1 }).limit(limit);

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get top articles by view count
// @route   GET /api/news/top
// @access  Public
exports.getTopArticles = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const articles = await Article.find().sort({ viewCount: -1, publishedAt: -1 }).limit(limit);

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get articles by category
// @route   GET /api/news/category/:category
// @access  Public
exports.getArticlesByCategory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const articles = await Article.find({ categories: req.params.category })
      .sort({ publishedAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get articles by source
// @route   GET /api/news/source/:sourceId
// @access  Public
exports.getArticlesBySource = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const articles = await Article.find({ "source.id": req.params.sourceId })
      .sort({ publishedAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get articles by country
// @route   GET /api/news/country/:countryCode
// @access  Public
exports.getArticlesByCountry = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const articles = await Article.find({ countries: req.params.countryCode })
      .sort({ publishedAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search articles
// @route   GET /api/news/search
// @access  Public
exports.searchArticles = async (req, res, next) => {
  try {
    // Accept both 'q' and 'search' parameters for better compatibility
    const searchQuery = req.query.q || req.query.search;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: "Please provide a search query",
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Create search query
    const searchFilter = {
      $or: [
        { title: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // Get total count for pagination
    const total = await Article.countDocuments(searchFilter);

    // Basic text search (in a real app, you might use Elasticsearch or MongoDB Atlas Search)
    const articles = await Article.find(searchFilter).sort({ publishedAt: -1 }).skip(startIndex).limit(limit);

    res.status(200).json({
      success: true,
      count: articles.length,
      total: total,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Increment article view count
// @route   PUT /api/news/:id/view
// @access  Public
exports.incrementViewCount = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }, { new: true });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // User tracking removed as authentication has been removed

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get related articles
// @route   GET /api/news/related
// @access  Public
exports.getRelatedArticles = async (req, res, next) => {
  try {
    const { categories, keywords, exclude, limit = 5 } = req.query;

    if (!categories && !keywords) {
      return res.status(400).json({
        success: false,
        message: "Please provide categories or keywords to find related articles",
      });
    }

    const query = {};

    // Add categories filter if provided
    if (categories) {
      const categoryList = Array.isArray(categories) ? categories : [categories];
      query.categories = { $in: categoryList };
    }

    // Add keyword search if provided
    if (keywords) {
      const keywordList = Array.isArray(keywords) ? keywords : [keywords];

      // Search in title, description, and entities
      const keywordQueries = keywordList.map((keyword) => ({
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { "entities.name": { $regex: keyword, $options: "i" } },
        ],
      }));

      // Add keyword queries to main query
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: keywordQueries }];
        delete query.$or;
      } else {
        query.$or = keywordQueries;
      }
    }

    // Exclude specific article if provided
    if (exclude) {
      query._id = { $ne: exclude };
    }

    // Get related articles
    const articles = await Article.find(query).sort({ publishedAt: -1 }).limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// Define the controller functions

exports.getAllNews = (req, res) => {
  res.status(200).json({ success: true, data: "Get all news" });
};

exports.getNewsById = (req, res) => {
  res.status(200).json({ success: true, data: `Get news by ID ${req.params.id}` });
};

exports.createNews = (req, res) => {
  res.status(201).json({ success: true, data: "Create news" });
};

exports.updateNews = (req, res) => {
  res.status(200).json({ success: true, data: `Update news by ID ${req.params.id}` });
};

exports.deleteNews = (req, res) => {
  res.status(200).json({ success: true, data: `Delete news by ID ${req.params.id}` });
};
