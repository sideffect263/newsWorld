const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const Article = require('../models/article.model');
const Source = require('../models/source.model');
const User = require('../models/user.model');
const scheduler = require('../services/scheduler');
const newsFetcher = require('../services/newsFetcher');

// @desc    Serve the status page HTML
// @route   GET /status
// @access  Public
exports.getStatusPage = (req, res) => {
  res.sendFile(path.join(__dirname, '../public/status.html'));
};

// @desc    Serve the scheduler status page HTML
// @route   GET /status/scheduler
// @access  Public
exports.getSchedulerStatusPage = (req, res) => {
  res.sendFile(path.join(__dirname, '../public/scheduler-status.html'));
};

// @desc    Get server status data
// @route   GET /status/data
// @access  Public
exports.getStatusData = async (req, res, next) => {
  try {
    // Get system info
    const systemInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      loadAvg: os.loadavg(),
    };

    // Get database status
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };

    // Get detailed scheduler status
    const schedulerStatus = {
      running: scheduler.isSchedulerRunning(),
      schedules: scheduler.getCurrentSchedules(),
      detailedInfo: await scheduler.getDetailedScheduleInfo()
    };

    // Get counts
    const articleCount = await Article.countDocuments();
    const sourceCount = await Source.countDocuments();
    const activeSourceCount = await Source.countDocuments({ isActive: true });
    const userCount = await User.countDocuments();

    // Get latest articles
    const latestArticles = await Article.find()
      .sort({ publishedAt: -1 })
      .limit(5)
      .select('title source.name publishedAt viewCount');

    // Get top articles
    const topArticles = await Article.find()
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title source.name publishedAt viewCount');

    res.status(200).json({
      success: true,
      data: {
        system: systemInfo,
        database: dbStatus,
        scheduler: schedulerStatus,
        counts: {
          articles: articleCount,
          sources: sourceCount,
          activeSources: activeSourceCount,
          users: userCount,
        },
        latestArticles,
        topArticles,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get sources status
// @route   GET /status/sources
// @access  Public
exports.getSourcesStatus = async (req, res, next) => {
  try {
    const sources = await Source.find()
      .select('name url category country language isActive fetchMethod fetchFrequency lastFetchedAt fetchStatus')
      .sort({ name: 1 });

    // Get article counts per source
    const sourceCounts = await Article.aggregate([
      {
        $group: {
          _id: '$source.name',
          count: { $sum: 1 },
          latestArticle: { $max: '$publishedAt' },
        },
      },
    ]);

    // Create a map of source name to article count
    const sourceCountMap = {};
    sourceCounts.forEach((item) => {
      sourceCountMap[item._id] = {
        count: item.count,
        latestArticle: item.latestArticle,
      };
    });

    // Add article counts to sources
    const sourcesWithCounts = sources.map((source) => {
      const sourceData = source.toObject();
      const countData = sourceCountMap[source.name] || { count: 0, latestArticle: null };
      
      return {
        ...sourceData,
        articleCount: countData.count,
        latestArticle: countData.latestArticle,
      };
    });

    res.status(200).json({
      success: true,
      count: sources.length,
      data: sourcesWithCounts,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get article statistics
// @route   GET /status/articles
// @access  Public
exports.getArticlesStats = async (req, res, next) => {
  try {
    // Articles by category
    const categoryCounts = await Article.aggregate([
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Articles by country
    const countryCounts = await Article.aggregate([
      { $unwind: '$countries' },
      {
        $group: {
          _id: '$countries',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Articles by source
    const sourceCounts = await Article.aggregate([
      {
        $group: {
          _id: '$source.name',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Articles by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCounts = await Article.aggregate([
      {
        $match: {
          publishedAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$publishedAt' },
            month: { $month: '$publishedAt' },
            day: { $dayOfMonth: '$publishedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Format daily counts for chart
    const formattedDailyCounts = dailyCounts.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      return {
        date: date.toISOString().split('T')[0],
        count: item.count,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        byCategory: categoryCounts,
        byCountry: countryCounts,
        bySource: sourceCounts,
        byDay: formattedDailyCounts,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Trigger manual fetch
// @route   POST /status/fetch
// @access  Private (Admin)
exports.triggerManualFetch = async (req, res, next) => {
  try {
    const sourceId = req.body.sourceId; // Optional: fetch from specific source
    
    let result;
    if (sourceId) {
      result = await newsFetcher.fetchNewsFromSource(sourceId);
    } else {
      result = await scheduler.runManualFetch();
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update scheduler settings
// @route   PUT /status/schedule
// @access  Private (Admin)
exports.updateSchedule = async (req, res, next) => {
  try {
    const { schedule } = req.body;
    
    if (!schedule) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a schedule',
      });
    }

    const result = scheduler.updateSchedule(schedule);
    
    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule format',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        schedule,
        running: scheduler.isSchedulerRunning(),
      },
    });
  } catch (err) {
    next(err);
  }
};