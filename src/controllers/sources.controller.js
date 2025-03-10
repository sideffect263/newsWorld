const Source = require('../models/source.model');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all sources
// @route   GET /api/sources
// @access  Public
exports.getSources = async (req, res, next) => {
  try {
    // Build query
    const query = {};

    // Filter by active status if provided
    if (req.query.active) {
      query.isActive = req.query.active === 'true';
    }

    // Filter by fetch method if provided
    if (req.query.fetchMethod) {
      query.fetchMethod = req.query.fetchMethod;
    }

    // Execute query
    const sources = await Source.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: sources.length,
      data: sources,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single source
// @route   GET /api/sources/:id
// @access  Public
exports.getSourceById = async (req, res, next) => {
  try {
    const source = await Source.findById(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found',
      });
    }

    res.status(200).json({
      success: true,
      data: source,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get sources by category
// @route   GET /api/sources/category/:category
// @access  Public
exports.getSourcesByCategory = async (req, res, next) => {
  try {
    const sources = await Source.find({
      category: req.params.category,
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: sources.length,
      data: sources,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get sources by country
// @route   GET /api/sources/country/:countryCode
// @access  Public
exports.getSourcesByCountry = async (req, res, next) => {
  try {
    const sources = await Source.find({
      country: req.params.countryCode,
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: sources.length,
      data: sources,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get sources by language
// @route   GET /api/sources/language/:languageCode
// @access  Public
exports.getSourcesByLanguage = async (req, res, next) => {
  try {
    const sources = await Source.find({
      language: req.params.languageCode,
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: sources.length,
      data: sources,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new source
// @route   POST /api/sources
// @access  Private (Admin)
exports.createSource = async (req, res, next) => {
  try {
    // Check if source with the same name already exists
    const existingSource = await Source.findOne({ name: req.body.name });
    
    if (existingSource) {
      return res.status(400).json({
        success: false,
        message: 'Source with this name already exists',
      });
    }

    // Validate required fields based on fetch method
    if (req.body.fetchMethod === 'api' && !req.body.apiDetails) {
      return res.status(400).json({
        success: false,
        message: 'API details are required for API fetch method',
      });
    }

    if (req.body.fetchMethod === 'rss' && !req.body.feedUrl) {
      return res.status(400).json({
        success: false,
        message: 'RSS feed URL is required for RSS fetch method',
      });
    }

    if (req.body.fetchMethod === 'scraping' && !req.body.scrapingDetails?.targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Target URL is required for scraping fetch method',
      });
    }

    // Map feedUrl to rssDetails.feedUrl
    if (req.body.fetchMethod === 'rss') {
      req.body.rssDetails = { feedUrl: req.body.feedUrl };
    }

    // Create source
    const source = await Source.create(req.body);

    res.status(201).json({
      success: true,
      data: source,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update source
// @route   PUT /api/sources/:id
// @access  Private (Admin)
exports.updateSource = async (req, res, next) => {
  try {
    let source = await Source.findById(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found',
      });
    }

    // Check if name is being updated and if it already exists
    if (req.body.name && req.body.name !== source.name) {
      const existingSource = await Source.findOne({ name: req.body.name });
      
      if (existingSource) {
        return res.status(400).json({
          success: false,
          message: 'Source with this name already exists',
        });
      }
    }

    // Validate required fields based on fetch method
    if (req.body.fetchMethod === 'rss' && !req.body.feedUrl) {
      return res.status(400).json({
        success: false,
        message: 'RSS feed URL is required for RSS fetch method',
      });
    }

    // Map feedUrl to rssDetails.feedUrl
    if (req.body.fetchMethod === 'rss') {
      req.body.rssDetails = { feedUrl: req.body.feedUrl };
    }

    // Update source
    source = await Source.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: source,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete source
// @route   DELETE /api/sources/:id
// @access  Private (Admin)
exports.deleteSource = async (req, res, next) => {
  try {
    const source = await Source.findById(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found',
      });
    }

    await source.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Test source fetch
// @route   POST /api/sources/:id/test
// @access  Private (Admin)
exports.testSourceFetch = async (req, res, next) => {
  try {
    const source = await Source.findById(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found',
      });
    }

    // In a real application, you would implement the actual fetching logic here
    // For now, we'll just return a mock response
    
    let testResult = {
      success: true,
      message: 'Test fetch successful',
      fetchMethod: source.fetchMethod,
      sampleData: null,
    };

    // Mock different responses based on fetch method
    if (source.fetchMethod === 'api') {
      testResult.sampleData = {
        articles: [
          {
            title: 'Test Article 1',
            description: 'This is a test article',
            url: 'https://example.com/article1',
          },
          {
            title: 'Test Article 2',
            description: 'This is another test article',
            url: 'https://example.com/article2',
          },
        ],
      };
    } else if (source.fetchMethod === 'rss') {
      testResult.sampleData = {
        items: [
          {
            title: 'RSS Test Article 1',
            content: 'This is a test RSS article',
            link: 'https://example.com/rss1',
          },
          {
            title: 'RSS Test Article 2',
            content: 'This is another test RSS article',
            link: 'https://example.com/rss2',
          },
        ],
      };
    } else if (source.fetchMethod === 'scraping') {
      testResult.sampleData = {
        articles: [
          {
            title: 'Scraped Test Article 1',
            content: 'This is a test scraped article',
            url: 'https://example.com/scraped1',
          },
          {
            title: 'Scraped Test Article 2',
            content: 'This is another test scraped article',
            url: 'https://example.com/scraped2',
          },
        ],
      };
    }

    res.status(200).json({
      success: true,
      data: testResult,
    });
  } catch (err) {
    next(err);
  }
};