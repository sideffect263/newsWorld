const cron = require('node-cron');
const newsFetcher = require('./newsFetcher');

// Initialize scheduled tasks
let fetchNewsTask;
let currentSchedule = null;

/**
 * Start the news fetching scheduler
 * @param {string} schedule - Cron schedule expression (default: every 30 minutes)
 */
exports.startNewsScheduler = (schedule = '*/30 * * * *') => {
  // Validate cron expression
  if (!cron.validate(schedule)) {
    console.error(`Invalid cron schedule: ${schedule}`);
    return false;
  }

  // Stop any existing task
  if (fetchNewsTask) {
    this.stopNewsScheduler();
  }

  console.log(`Starting news scheduler with schedule: ${schedule}`);
  currentSchedule = schedule;

  // Schedule the task
  fetchNewsTask = cron.schedule(schedule, async () => {
    console.log(`Running scheduled news fetch at ${new Date().toISOString()}`);
    
    try {
      const result = await newsFetcher.fetchAllNews();
      console.log(`Fetch result: ${result.message}`);
    } catch (error) {
      console.error('Error during scheduled news fetch:', error);
    }
  });

  // Run immediately on startup
  newsFetcher.fetchAllNews()
    .then(result => {
      console.log(`Initial fetch completed: ${result.message}`);
    })
    .catch(error => {
      console.error('Error in initial news fetch:', error);
    });

  return true;
};

/**
 * Stop the news fetching scheduler
 */
exports.stopNewsScheduler = () => {
  if (fetchNewsTask) {
    fetchNewsTask.stop();
    fetchNewsTask = null;
    currentSchedule = null;
    console.log('News scheduler stopped');
    return true;
  }
  
  return false;
};

/**
 * Check if the scheduler is running
 */
exports.isSchedulerRunning = () => {
  return fetchNewsTask !== null;
};

/**
 * Get the current schedule
 */
exports.getCurrentSchedule = () => {
  return currentSchedule;
};

/**
 * Update the schedule
 * @param {string} schedule - New cron schedule expression
 */
exports.updateSchedule = (schedule) => {
  return this.startNewsScheduler(schedule);
};

/**
 * Run a manual fetch
 */
exports.runManualFetch = async () => {
  console.log(`Running manual news fetch at ${new Date().toISOString()}`);
  
  try {
    return await newsFetcher.fetchAllNews();
  } catch (error) {
    console.error('Error in manual news fetch:', error);
    throw error;
  }
};