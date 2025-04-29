const cron = require("node-cron");
const newsFetcher = require("./newsFetcher");
const Source = require("../models/source.model");
const Article = require("../models/article.model");
const trendAnalyzer = require("./trendAnalyzer");
const sentimentAnalyzer = require("./sentimentAnalyzer");
const axios = require("axios");
const cronParser = require("cron-parser");

// Initialize scheduled tasks and next scan times
const tasks = {
  rss: null,
  api: null,
  scraping: null,
  stories: null, // Add stories task
};

const nextScanTimes = {
  rss: null,
  api: null,
  scraping: null,
  stories: null, // Add stories next scan time
};

// Default schedules for different source types
const defaultSchedules = {
  rss: "*/15 * * * *", // Every 15 minutes
  api: "*/30 * * * *", // Every 30 minutes
  scraping: "0 * * * *", // Every hour
  stories: "0 */3 * * *", // Every 3 hours (changed from 6)
};

/**
 * Calculate next scan time based on cron schedule
 */
const calculateNextScanTime = (cronExpression) => {
  try {
    const interval = cronParser.parseExpression(cronExpression);
    const nextDate = interval.next().toDate();

    // Validate the calculated date
    if (isNaN(nextDate.getTime())) {
      console.warn(`Invalid next scan date calculated from cron expression: ${cronExpression}`);
      // Fallback to 3 hours from now
      return new Date(Date.now() + 3 * 60 * 60 * 1000);
    }

    return nextDate;
  } catch (error) {
    console.error(`Error calculating next scan time from cron expression: ${cronExpression}`, error);
    // Fallback to 3 hours from now
    return new Date(Date.now() + 3 * 60 * 60 * 1000);
  }
};

/**
 * Get detailed scheduling information
 */
exports.getDetailedScheduleInfo = async () => {
  const sources = await Source.find({ isActive: true });

  const scheduleInfo = {
    methods: {},
    sources: [],
  };

  // Group sources by fetch method
  const sourceGroups = {
    rss: sources.filter((s) => s.fetchMethod === "rss"),
    api: sources.filter((s) => s.fetchMethod === "api"),
    scraping: sources.filter((s) => s.fetchMethod === "scraping"),
  };

  // Get info for each method
  for (const [method, sources] of Object.entries(sourceGroups)) {
    const schedule = defaultSchedules[method];
    const nextScan = calculateNextScanTime(schedule);

    scheduleInfo.methods[method] = {
      schedule,
      nextScan: nextScan ? nextScan.toISOString() : null,
      isRunning: !!tasks[method],
      sourceCount: sources.length,
    };

    // Add individual source info
    sources.forEach((source) => {
      scheduleInfo.sources.push({
        id: source._id,
        name: source.name,
        method: method,
        schedule: schedule,
        nextScan: nextScan ? nextScan.toISOString() : null,
        lastFetched: source.lastFetchedAt ? source.lastFetchedAt.toISOString() : null,
        fetchStatus: source.fetchStatus,
        fetchFrequency: source.fetchFrequency,
      });
    });
  }

  return scheduleInfo;
};

/**
 * Initialize and start all schedulers
 */
exports.startNewsScheduler = () => {
  // Schedule news fetching jobs
  scheduleNewsFetching();

  // Schedule trend analysis jobs
  scheduleTrendAnalysis();

  // Schedule sentiment analysis jobs
  scheduleSentimentAnalysis();

  // Schedule story generation jobs
  scheduleStoryGeneration();

  console.log("News scheduler started");
};

/**
 * Schedule news fetching jobs
 */
const scheduleNewsFetching = async () => {
  try {
    // Get all active sources
    const sources = await Source.find({ isActive: true });

    // Group sources by fetch method
    const sourceGroups = {
      rss: sources.filter((s) => s.fetchMethod === "rss"),
      api: sources.filter((s) => s.fetchMethod === "api"),
      scraping: sources.filter((s) => s.fetchMethod === "scraping"),
    };

    // Start schedulers for each group
    for (const [method, sources] of Object.entries(sourceGroups)) {
      if (sources.length > 0) {
        await startMethodScheduler(method, sources);
      }
    }

    console.log("All news schedulers started successfully");
    return true;
  } catch (error) {
    console.error("Error starting news schedulers:", error);
    return false;
  }
};

/**
 * Start scheduler for a specific fetch method
 */
const startMethodScheduler = async (method, sources) => {
  try {
    // Stop existing task if any
    if (tasks[method]) {
      tasks[method].stop();
      tasks[method] = null;
    }

    const schedule = defaultSchedules[method];
    console.log(`Starting ${method} scheduler with schedule: ${schedule}`);

    // Calculate and store next scan time
    nextScanTimes[method] = calculateNextScanTime(schedule);

    // Create the fetch function
    const fetchFunction = async () => {
      console.log(`Running ${method} fetch at ${new Date().toISOString()}`);
      try {
        // Force fetch regardless of frequency for initial run
        const result = await newsFetcher.fetchAllNews({
          fetchMethod: method,
          forceFetch: true, // Add this option to newsFetcher
        });
        console.log(`${method} fetch result: ${result.message}`);
        // Update next scan time after successful fetch
        nextScanTimes[method] = calculateNextScanTime(schedule);
        console.log(`Next scan for ${method} scheduled at: ${nextScanTimes[method].toISOString()}`);
      } catch (error) {
        console.error(`Error during ${method} fetch:`, error);
      }
    };

    // Schedule the task
    tasks[method] = cron.schedule(schedule, fetchFunction);

    // Run initial fetch
    await fetchFunction();
    console.log(`Initial ${method} fetch completed`);
  } catch (error) {
    console.error(`Error starting ${method} scheduler:`, error);
    throw error;
  }
};

/**
 * Stop the news fetching scheduler
 */
exports.stopNewsScheduler = () => {
  let stopped = false;

  for (const [method, task] of Object.entries(tasks)) {
    if (task) {
      task.stop();
      tasks[method] = null;
      stopped = true;
    }
  }

  if (stopped) {
    console.log("All news schedulers stopped");
  }

  return stopped;
};

/**
 * Check if the scheduler is running
 */
exports.isSchedulerRunning = () => {
  return Object.values(tasks).some((task) => task !== null);
};

/**
 * Get the current schedules
 */
exports.getCurrentSchedules = () => {
  return {
    rss: tasks.rss ? defaultSchedules.rss : null,
    api: tasks.api ? defaultSchedules.api : null,
    scraping: tasks.scraping ? defaultSchedules.scraping : null,
    stories: tasks.stories ? defaultSchedules.stories : null,
  };
};

/**
 * Update schedule for a specific method
 */
exports.updateSchedule = async (method, schedule) => {
  if (!cron.validate(schedule)) {
    console.error(`Invalid cron schedule: ${schedule}`);
    return false;
  }

  try {
    defaultSchedules[method] = schedule;
    const sources = await Source.find({ isActive: true, fetchMethod: method });

    if (sources.length > 0) {
      await startMethodScheduler(method, sources);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error updating schedule for ${method}:`, error);
    return false;
  }
};

/**
 * Run a manual fetch
 */
exports.runManualFetch = async (method = null) => {
  console.log(`Running manual news fetch at ${new Date().toISOString()}`);

  try {
    return await newsFetcher.fetchAllNews(method ? { fetchMethod: method } : null);
  } catch (error) {
    console.error("Error in manual news fetch:", error);
    throw error;
  }
};

/**
 * Schedule trend analysis jobs
 */
const scheduleTrendAnalysis = () => {
  try {
    // Hourly trends - every hour
    cron.schedule("0 * * * *", async () => {
      console.log("Running hourly trend analysis...");
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: "hourly",
          limit: 500,
        });
        console.log(`Hourly trend analysis completed: ${result.success ? "Success" : "Failed"}`);
      } catch (error) {
        console.error("Error in hourly trend analysis job:", error);
      }
    });

    // Daily trends - every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      console.log("Running daily trend analysis...");
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: "daily",
          limit: 1000,
        });
        console.log(`Daily trend analysis completed: ${result.success ? "Success" : "Failed"}`);
      } catch (error) {
        console.error("Error in daily trend analysis job:", error);
      }
    });

    // Weekly trends - once per day
    cron.schedule("0 0 * * *", async () => {
      console.log("Running weekly trend analysis...");
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: "weekly",
          limit: 5000,
        });
        console.log(`Weekly trend analysis completed: ${result.success ? "Success" : "Failed"}`);
      } catch (error) {
        console.error("Error in weekly trend analysis job:", error);
      }
    });

    // Monthly trends - once per week
    cron.schedule("0 0 * * 0", async () => {
      console.log("Running monthly trend analysis...");
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: "monthly",
          limit: 10000,
        });
        console.log(`Monthly trend analysis completed: ${result.success ? "Success" : "Failed"}`);
      } catch (error) {
        console.error("Error in monthly trend analysis job:", error);
      }
    });

    console.log("Trend analysis scheduler started");
  } catch (error) {
    console.error("Error setting up trend analysis scheduler:", error);
  }
};

/**
 * Schedule sentiment analysis jobs
 */
const scheduleSentimentAnalysis = () => {
  try {
    // Update sentiment for missing articles - every 3 hours
    cron.schedule("0 */3 * * *", async () => {
      console.log("Running sentiment analysis update...");
      try {
        // Find articles from the past week that don't have sentiment analysis
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const articles = await Article.find({
          publishedAt: { $gte: lastWeek },
          $or: [{ sentiment: { $exists: false } }, { sentimentAssessment: { $exists: false } }],
        }).limit(500);

        if (articles.length === 0) {
          console.log("No articles found needing sentiment updates");
          return;
        }

        const result = await sentimentAnalyzer.updateSentimentForNewArticles(articles);
        console.log(`Sentiment analysis update completed: ${result.count} articles updated`);
      } catch (error) {
        console.error("Error in sentiment analysis update job:", error);
      }
    });

    // Daily sentiment trends - once per day
    cron.schedule("0 1 * * *", async () => {
      console.log("Running daily sentiment trend analysis...");
      try {
        // Get start and end dates (past 3 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 3);

        const result = await sentimentAnalyzer.analyzeSentimentTrends({
          startDate,
          endDate,
          updateArticles: true,
        });

        console.log(`Daily sentiment trend analysis completed: ${result.success ? "Success" : "Failed"}`);
      } catch (error) {
        console.error("Error in daily sentiment trend analysis job:", error);
      }
    });

    console.log("Sentiment analysis scheduler started");
  } catch (error) {
    console.error("Error setting up sentiment analysis scheduler:", error);
  }
};

/**
 * Schedule story generation
 */
const scheduleStoryGeneration = () => {
  try {
    // Stop existing task if any
    if (tasks.stories) {
      tasks.stories.stop();
      tasks.stories = null;
    }

    const schedule = defaultSchedules.stories;
    console.log(`Starting story generation scheduler with schedule: ${schedule}`);

    // Calculate and store next scan time
    nextScanTimes.stories = calculateNextScanTime(schedule);

    // Create the story generation function
    const generateStoriesFunction = async () => {
      console.log(`Running story generation at ${new Date().toISOString()}`);
      try {
        // Use internal API call to trigger story generation
        const result = await triggerStoryGeneration();

        if (result.success) {
          console.log(`Story generation result: ${result.message}`);
        } else {
          console.error(`Story generation failed: ${result.message}`);
        }

        // Update next scan time after generation (successful or not)
        try {
          nextScanTimes.stories = calculateNextScanTime(schedule);

          // Only try to format the date if it's valid
          if (nextScanTimes.stories instanceof Date && !isNaN(nextScanTimes.stories.getTime())) {
            console.log(`Next story generation scheduled at: ${nextScanTimes.stories.toISOString()}`);
          } else {
            console.warn(`Invalid next scan time calculated: ${nextScanTimes.stories}`);
            // Reset to a safe value
            nextScanTimes.stories = new Date(Date.now() + 3 * 60 * 60 * 1000);
            console.log(`Reset next story generation to: ${nextScanTimes.stories.toISOString()}`);
          }
        } catch (timeError) {
          console.error("Error handling next scan time:", timeError);
          nextScanTimes.stories = new Date(Date.now() + 3 * 60 * 60 * 1000);
          console.log(`Reset next story generation to: ${nextScanTimes.stories.toISOString()}`);
        }
      } catch (error) {
        console.error("Error during story generation:", error);
        // Set next scan time even after error
        nextScanTimes.stories = new Date(Date.now() + 3 * 60 * 60 * 1000);
      }
    };

    // Schedule the task
    tasks.stories = cron.schedule(schedule, generateStoriesFunction);

    // Run initial story generation after a delay to ensure articles are fetched
    setTimeout(async () => {
      await generateStoriesFunction();
      console.log("Initial story generation completed");
    }, 5 * 60 * 1000); // 5 minutes delay

    console.log("Story generation scheduler started successfully");
    return true;
  } catch (error) {
    console.error("Error starting story generation scheduler:", error);
    return false;
  }
};

/**
 * Trigger story generation through API
 */
const triggerStoryGeneration = async () => {
  try {
    // First, find potentially related articles that might be good for stories
    await findRelatedArticles();

    try {
      // Instead of making an API call to ourselves (which can cause ECONNREFUSED),
      // directly import and call the controller function
      const storyController = require("../controllers/story.controller");
      const result = await storyController.generateStoriesDirectly();

      return {
        success: true,
        message: "Story generation completed successfully",
        data: result,
      };
    } catch (controllerError) {
      console.error("Error in story controller:", controllerError);

      // Fallback to API call approach if direct call fails
      console.log("Falling back to API method for story generation");
      const serverUrl = process.env.SERVER_URL || "http://localhost:5000";
      const response = await axios.post(
        `${serverUrl}/api/stories/generate`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // Add timeout to prevent hanging requests
        },
      );

      return {
        success: true,
        message: "Story generation triggered successfully via API",
        data: response.data,
      };
    }
  } catch (error) {
    console.error("Error triggering story generation:", error);
    return {
      success: false,
      message: "Failed to trigger story generation",
      error: error.message,
    };
  }
};

/**
 * Find related articles that could be used in stories
 * This helps prepare the data for story generation by grouping related content
 */
async function findRelatedArticles() {
  try {
    const Article = require("../models/article.model");

    // Get recent articles from the last 72 hours
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);

    // Get articles that have entities but haven't been processed for relationships
    const articles = await Article.find({
      publishedAt: { $gte: cutoffDate },
      "entities.0": { $exists: true }, // Has at least one entity
      relatedArticles: { $exists: false }, // Hasn't been processed yet
    }).limit(200);

    if (articles.length === 0) {
      console.log("No new articles to process for relationships");
      return;
    }

    console.log(`Finding relationships among ${articles.length} articles`);

    // Track related article pairs
    const relationPairs = [];

    // For each article, find potential matches based on shared entities
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const articleEntities = new Set(article.entities.map((e) => `${e.type}:${e.name.toLowerCase()}`));

      // Compare with other articles
      for (let j = i + 1; j < articles.length; j++) {
        const otherArticle = articles[j];
        const otherEntities = new Set(otherArticle.entities.map((e) => `${e.type}:${e.name.toLowerCase()}`));

        // Find common entities
        const commonEntities = [...articleEntities].filter((entity) => otherEntities.has(entity));

        // If they share enough entities, mark as related
        if (commonEntities.length >= 2) {
          relationPairs.push({
            sourceId: article._id,
            targetId: otherArticle._id,
            commonEntities: commonEntities,
          });
        }
      }

      // Mark as processed by adding an empty relatedArticles array
      await Article.findByIdAndUpdate(article._id, {
        $set: { relatedArticles: [] },
      });
    }

    // Update related articles in the database
    for (const pair of relationPairs) {
      await Article.findByIdAndUpdate(pair.sourceId, {
        $addToSet: { relatedArticles: pair.targetId },
      });

      await Article.findByIdAndUpdate(pair.targetId, {
        $addToSet: { relatedArticles: pair.sourceId },
      });
    }

    console.log(`Found ${relationPairs.length} article relationships`);
  } catch (error) {
    console.error("Error finding related articles:", error);
  }
}
