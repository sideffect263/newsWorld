const Article = require('../models/article.model');
const User = require('../models/user.model');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all articles with pagination
// @route   GET /api/news
// @access  Public
exports.getArticles = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Article.countDocuments();

    // Build query
    const query = {};

    // Filter by category if provided
    if (req.query.category) {
      query.categories = req.query.category;
    }

    // Filter by source if provided
    if (req.query.source) {
      query['source.name'] = req.query.source;
    }

    // Filter by country if provided
    if (req.query.country) {
      query.countries = req.query.country;
    }

    // Filter by language if provided
    if (req.query.language) {
      query.language = req.query.language;
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

    // Execute query
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: articles.length,
      pagination,
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
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    res.status(200).json({
      success: true,
      data: article,
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
    
    const articles = await Article.find()
      .sort({ publishedAt: -1 })
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

// @desc    Get top articles by view count
// @route   GET /api/news/top
// @access  Public
exports.getTopArticles = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    
    const articles = await Article.find()
      .sort({ viewCount: -1, publishedAt: -1 })
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
    
    const articles = await Article.find({ 'source.id': req.params.sourceId })
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
    if (!req.query.q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    // Basic text search (in a real app, you might use Elasticsearch or MongoDB Atlas Search)
    const articles = await Article.find({
      $or: [
        { title: { $regex: req.query.q, $options: 'i' } },
        { description: { $regex: req.query.q, $options: 'i' } },
        { content: { $regex: req.query.q, $options: 'i' } },
      ],
    })
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

// @desc    Increment article view count
// @route   PUT /api/news/:id/view
// @access  Public
exports.incrementViewCount = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // If user is logged in, add to read history
    if (req.user) {
      await User.findByIdAndUpdate(
        req.user.id,
        {
          $push: {
            readHistory: {
              article: req.params.id,
              readAt: Date.now(),
            },
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Save article for user
// @route   POST /api/news/save/:id
// @access  Private
exports.saveArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Check if article is already saved
    const user = await User.findById(req.user.id);
    
    if (user.savedArticles.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Article already saved',
      });
    }

    // Add article to saved articles
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { savedArticles: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Article saved',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove saved article for user
// @route   DELETE /api/news/save/:id
// @access  Private
exports.unsaveArticle = async (req, res, next) => {
  try {
    // Check if article exists
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Remove article from saved articles
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { savedArticles: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Article removed from saved',
    });
  } catch (err) {
    next(err);
  }
};

// Define the controller functions

exports.getAllNews = (req, res) => {
  res.status(200).json({ success: true, data: 'Get all news' });
};

exports.getNewsById = (req, res) => {
  res.status(200).json({ success: true, data: `Get news by ID ${req.params.id}` });
};

exports.createNews = (req, res) => {
  res.status(201).json({ success: true, data: 'Create news' });
};

exports.updateNews = (req, res) => {
  res.status(200).json({ success: true, data: `Update news by ID ${req.params.id}` });
};

exports.deleteNews = (req, res) => {
  res.status(200).json({ success: true, data: `Delete news by ID ${req.params.id}` });
};