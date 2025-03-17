const cron = require('node-cron');
const newsFetcher = require('./newsFetcher');
const Source = require('../models/source.model');
const trendAnalyzer = require('./trendAnalyzer');

// Initialize scheduled tasks and next scan times
const tasks = {
  rss: null,
  api: null,
  scraping: null
};

const nextScanTimes = {
  rss: null,
  api: null,
  scraping: null
};

// Default schedules for different source types
const defaultSchedules = {
  rss: '*/15 * * * *',      // Every 15 minutes
  api: '*/30 * * * *',      // Every 30 minutes
  scraping: '0 * * * *'     // Every hour
};

/**
 * Calculate next scan time from cron schedule
 */
const calculateNextScanTime = (schedule) => {
  try {
    const now = new Date();
    const parts = schedule.split(' ');
    if (parts.length !== 5) return null;

    const [minute, hour, day, month, weekday] = parts;
    
    // Create next date
    const next = new Date(now);
    
    // Handle different schedule patterns
    if (minute === '*' && hour === '*') {
      // Every minute
      next.setMinutes(next.getMinutes() + 1);
    } else if (minute.startsWith('*/')) {
      // Every X minutes
      const interval = parseInt(minute.split('/')[1]);
      next.setMinutes(Math.ceil(next.getMinutes() / interval) * interval);
    } else if (minute === '0' && hour === '*') {
      // Every hour
      next.setHours(next.getHours() + 1);
      next.setMinutes(0);
    } else {
      // Specific minute and hour
      const targetMinute = minute === '*' ? 0 : parseInt(minute);
      const targetHour = hour === '*' ? next.getHours() : parseInt(hour);
      
      next.setHours(targetHour);
      next.setMinutes(targetMinute);
      
      // If the calculated time is in the past, move to the next occurrence
      if (next <= now) {
        if (minute === '*' && hour !== '*') {
          next.setHours(next.getHours() + 1);
          next.setMinutes(0);
        } else if (hour === '*' && minute !== '*') {
          next.setMinutes(next.getMinutes() + 60);
        } else {
          next.setDate(next.getDate() + 1);
        }
      }
    }
    
    return next;
  } catch (error) {
    console.error(`Error calculating next scan time for schedule ${schedule}:`, error);
    return null;
  }
};

/**
 * Get detailed scheduling information
 */
exports.getDetailedScheduleInfo = async () => {
  const sources = await Source.find({ isActive: true });
  
  const scheduleInfo = {
    methods: {},
    sources: []
  };

  // Group sources by fetch method
  const sourceGroups = {
    rss: sources.filter(s => s.fetchMethod === 'rss'),
    api: sources.filter(s => s.fetchMethod === 'api'),
    scraping: sources.filter(s => s.fetchMethod === 'scraping')
  };

  // Get info for each method
  for (const [method, sources] of Object.entries(sourceGroups)) {
    const schedule = defaultSchedules[method];
    const nextScan = calculateNextScanTime(schedule);
    
    scheduleInfo.methods[method] = {
      schedule,
      nextScan: nextScan ? nextScan.toISOString() : null,
      isRunning: !!tasks[method],
      sourceCount: sources.length
    };

    // Add individual source info
    sources.forEach(source => {
      scheduleInfo.sources.push({
        id: source._id,
        name: source.name,
        method: method,
        schedule: schedule,
        nextScan: nextScan ? nextScan.toISOString() : null,
        lastFetched: source.lastFetchedAt ? source.lastFetchedAt.toISOString() : null,
        fetchStatus: source.fetchStatus,
        fetchFrequency: source.fetchFrequency
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
  
  console.log('News scheduler started');
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
      rss: sources.filter(s => s.fetchMethod === 'rss'),
      api: sources.filter(s => s.fetchMethod === 'api'),
      scraping: sources.filter(s => s.fetchMethod === 'scraping')
    };

    // Start schedulers for each group
    for (const [method, sources] of Object.entries(sourceGroups)) {
      if (sources.length > 0) {
        await startMethodScheduler(method, sources);
      }
    }

    console.log('All news schedulers started successfully');
    return true;
  } catch (error) {
    console.error('Error starting news schedulers:', error);
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
          forceFetch: true // Add this option to newsFetcher
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
    console.log('All news schedulers stopped');
  }
  
  return stopped;
};

/**
 * Check if the scheduler is running
 */
exports.isSchedulerRunning = () => {
  return Object.values(tasks).some(task => task !== null);
};

/**
 * Get the current schedules
 */
exports.getCurrentSchedules = () => {
  return {
    rss: tasks.rss ? defaultSchedules.rss : null,
    api: tasks.api ? defaultSchedules.api : null,
    scraping: tasks.scraping ? defaultSchedules.scraping : null
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
    console.error('Error in manual news fetch:', error);
    throw error;
  }
};

/**
 * Schedule trend analysis jobs
 */
const scheduleTrendAnalysis = () => {
  try {
    // Hourly trends - every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Running hourly trend analysis...');
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: 'hourly',
          limit: 500
        });
        console.log(`Hourly trend analysis completed: ${result.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error('Error in hourly trend analysis job:', error);
      }
    });
    
    // Daily trends - every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Running daily trend analysis...');
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: 'daily',
          limit: 1000
        });
        console.log(`Daily trend analysis completed: ${result.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error('Error in daily trend analysis job:', error);
      }
    });
    
    // Weekly trends - once per day
    cron.schedule('0 0 * * *', async () => {
      console.log('Running weekly trend analysis...');
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: 'weekly',
          limit: 5000
        });
        console.log(`Weekly trend analysis completed: ${result.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error('Error in weekly trend analysis job:', error);
      }
    });
    
    // Monthly trends - once per week
    cron.schedule('0 0 * * 0', async () => {
      console.log('Running monthly trend analysis...');
      try {
        const result = await trendAnalyzer.analyzeTrends({
          timeframe: 'monthly',
          limit: 10000
        });
        console.log(`Monthly trend analysis completed: ${result.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error('Error in monthly trend analysis job:', error);
      }
    });
    
    console.log('Trend analysis scheduler started');
  } catch (error) {
    console.error('Error setting up trend analysis scheduler:', error);
  }
};