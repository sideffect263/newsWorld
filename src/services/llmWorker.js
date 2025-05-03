/**
 * LLM Worker Service
 *
 * A background worker that intelligently schedules LLM tasks based on rate limits
 * and prioritizes content enrichment during idle periods.
 */

const Article = require("../models/article.model");
const Story = require("../models/story.model");
const insightGenerator = require("./insightGenerator");
const multiLLMService = require("./multiLLMService");

class LLMWorker {
  constructor() {
    this.isRunning = false;
    this.taskQueue = [];
    this.processingDelay = 2000; // 2 seconds between tasks to avoid rate limits
    this.batchSize = 5; // Process 5 items per batch
    this.cooldownPeriod = 300000; // 5 minutes cooldown after hitting rate limits
    this.lastRateLimitTime = 0;
    this.providerStatus = {
      gemini: { available: true, lastFailure: 0 },
      together: { available: true, lastFailure: 0 },
      mistral: { available: true, lastFailure: 0 },
    };
  }

  /**
   * Start the LLM worker
   */
  start() {
    if (this.isRunning) return;

    console.log("Starting LLM background worker");
    this.isRunning = true;
    this.scheduleNextRun();
  }

  /**
   * Stop the LLM worker
   */
  stop() {
    console.log("Stopping LLM background worker");
    this.isRunning = false;
  }

  /**
   * Schedule the next worker run
   */
  scheduleNextRun() {
    if (!this.isRunning) return;

    // If we've hit rate limits recently, wait for the cooldown period
    const timeSinceRateLimit = Date.now() - this.lastRateLimitTime;
    if (this.lastRateLimitTime > 0 && timeSinceRateLimit < this.cooldownPeriod) {
      const remainingCooldown = this.cooldownPeriod - timeSinceRateLimit;
      console.log(`Rate limit cooldown: waiting ${Math.round(remainingCooldown / 1000)}s before resuming LLM tasks`);
      setTimeout(() => this.run(), remainingCooldown);
      return;
    }

    // Otherwise run immediately
    setTimeout(() => this.run(), 0);
  }

  /**
   * Main worker function that runs LLM tasks
   */
  async run() {
    if (!this.isRunning) return;

    try {
      // Check if any providers are available
      if (this.areAllProvidersUnavailable()) {
        console.log("All LLM providers are rate-limited, entering cooldown period");
        this.lastRateLimitTime = Date.now();
        setTimeout(() => this.scheduleNextRun(), this.cooldownPeriod);
        return;
      }

      // First, process any queued tasks
      if (this.taskQueue.length > 0) {
        await this.processQueuedTasks();
      }
      // Then look for new content to enrich
      else {
        await this.findAndEnrichContent();
      }

      // Schedule the next run with a delay to avoid hitting rate limits
      setTimeout(() => this.scheduleNextRun(), this.processingDelay);
    } catch (error) {
      console.error("Error in LLM worker:", error);
      // If something goes wrong, wait a bit before retrying
      setTimeout(() => this.scheduleNextRun(), 30000);
    }
  }

  /**
   * Process tasks that are already in the queue
   */
  async processQueuedTasks() {
    // Get a batch of tasks but keep the rest in the queue
    const tasksToProcess = this.taskQueue.splice(0, this.batchSize);
    console.log(`Processing ${tasksToProcess.length} queued LLM tasks`);

    for (const task of tasksToProcess) {
      try {
        switch (task.type) {
          case "insight":
            await this.processInsightTask(task);
            break;
          case "story":
            await this.processStoryTask(task);
            break;
          default:
            console.warn(`Unknown task type: ${task.type}`);
        }
      } catch (error) {
        console.error(`Error processing ${task.type} task:`, error);
        // If it's a rate limit error, update provider status
        if (error.response && error.response.status === 429) {
          this.handleRateLimit(error, task);
        }
      }
    }
  }

  /**
   * Handle a rate limit error
   */
  handleRateLimit(error, task) {
    // Try to determine which provider hit the rate limit based on error message
    if (error.message && error.message.includes("Gemini")) {
      this.providerStatus.gemini.available = false;
      this.providerStatus.gemini.lastFailure = Date.now();
      console.log("Gemini API rate limited, marking as unavailable");
    } else if (error.message && error.message.includes("Together")) {
      this.providerStatus.together.available = false;
      this.providerStatus.together.lastFailure = Date.now();
      console.log("Together API rate limited, marking as unavailable");
    } else if (error.message && error.message.includes("Mistral")) {
      this.providerStatus.mistral.available = false;
      this.providerStatus.mistral.lastFailure = Date.now();
      console.log("Mistral API rate limited, marking as unavailable");
    }
    // If can't determine specific provider, assume all are rate limited
    else {
      this.lastRateLimitTime = Date.now();
      console.log("Unknown provider rate limited, entering global cooldown");
    }

    // Add the failed task back to the queue with lower priority (at the end)
    this.taskQueue.push(task);
  }

  /**
   * Find content in the database that needs enrichment and process it
   */
  async findAndEnrichContent() {
    // First check if we have articles without insights
    const articlesNeedingInsights = await Article.find({ insights: { $size: 0 } })
      .sort({ publishedAt: -1 })
      .limit(this.batchSize);

    if (articlesNeedingInsights.length > 0) {
      console.log(`Found ${articlesNeedingInsights.length} articles needing insights`);

      for (const article of articlesNeedingInsights) {
        this.taskQueue.push({
          type: "insight",
          articleId: article._id,
          priority: 1,
        });
      }

      // Process these tasks immediately
      return this.processQueuedTasks();
    }

    // If no articles need insights, check for stories needing enrichment
    // Here we could implement additional story enrichment tasks
    const storiesNeedingUpdate = await Story.find({
      $or: [{ summary: { $exists: false } }, { narrative: { $exists: false } }, { predictions: { $size: 0 } }],
    }).limit(this.batchSize);

    if (storiesNeedingUpdate.length > 0) {
      console.log(`Found ${storiesNeedingUpdate.length} stories needing enrichment`);

      for (const story of storiesNeedingUpdate) {
        this.taskQueue.push({
          type: "story",
          storyId: story._id,
          priority: 2,
        });
      }

      // Process these tasks immediately
      return this.processQueuedTasks();
    }

    // If nothing urgent to process, perhaps look for older content to refresh
    // For example, articles with older insights that could be updated

    console.log("No content currently needs LLM enrichment");
  }

  /**
   * Process an insight generation task
   */
  async processInsightTask(task) {
    try {
      const article = await Article.findById(task.articleId);
      if (!article) {
        console.warn(`Article ${task.articleId} not found`);
        return;
      }

      // Skip if article already has insights (might have been added while in queue)
      if (article.insights && article.insights.length > 0) {
        console.log(`Article ${article._id} already has insights, skipping`);
        return;
      }

      console.log(`Generating insights for article: ${article.title}`);
      const insights = await insightGenerator.generateArticleInsights(article);

      if (insights && insights.length > 0) {
        // Generate insights returns properly normalized insights, but let's double check before saving
        const validInsightTypes = [
          "stock_prediction",
          "market_trend",
          "political_impact",
          "social_impact",
          "technology_impact",
          "legal_consequence",
          "economic_impact",
          "financial_impact",
          "environmental_impact",
          "health_impact",
          "regulatory_impact",
          "other",
        ];

        // Ensure each insight has a valid type before saving
        const validatedInsights = insights.map((insight) => {
          // Copy the insight to avoid mutations
          const validInsight = { ...insight };

          // If type is not in valid list, change it to "other"
          if (!validInsightTypes.includes(validInsight.type)) {
            console.log(`Converting invalid insight type "${validInsight.type}" to "other" for article ${article._id}`);
            validInsight.type = "other";
          }

          return validInsight;
        });

        article.insights = validatedInsights;

        try {
          await article.save();
          console.log(`✓ Successfully added ${insights.length} insights to article`);
        } catch (saveError) {
          console.error(`Error saving insights to article ${article._id}:`, saveError);

          // If we still have validation errors, try with just "other" type
          if (saveError.name === "ValidationError") {
            console.log("Attempting to save with fallback insight types");
            // Last resort: convert all types to "other"
            article.insights = validatedInsights.map((insight) => ({
              ...insight,
              type: "other",
            }));
            await article.save();
            console.log(`✓ Successfully added ${insights.length} insights with fallback types`);
          } else {
            throw saveError;
          }
        }
      } else {
        console.log(`No insights generated for article: ${article.title}`);
      }
    } catch (error) {
      console.error(`Error generating insights for article ${task.articleId}:`, error);
      // If it's a rate limit, throw so it can be caught by the calling function
      if (error.response && error.response.status === 429) {
        throw error;
      }
    }
  }

  /**
   * Process a story enrichment task
   */
  async processStoryTask(task) {
    try {
      const story = await Story.findById(task.storyId);
      if (!story) {
        console.warn(`Story ${task.storyId} not found`);
        return;
      }

      // Do whatever story enrichment is needed
      console.log(`Enriching story: ${story.title}`);

      // Check what's missing and generate it
      let updateNeeded = false;

      // Check if narrative needs generation
      if (!story.narrative || story.narrative.trim() === "") {
        try {
          console.log("Generating narrative for story");
          const articles = await Article.find({ storyReferences: story._id }).sort({ publishedAt: 1 }).limit(10);

          // For simplicity, pass a dummy sentiment trend. In a real implementation,
          // you'd calculate this from the articles
          const sentimentTrend = "neutral";

          const narrative = await multiLLMService.generateNarrative({
            entityName: story.entities[0]?.name || "Unknown",
            entityType: story.entities[0]?.type || "organization",
            chapters: story.chapters,
            sentiment: sentimentTrend,
          });

          if (narrative) {
            story.narrative = narrative;
            updateNeeded = true;
            console.log("✓ Successfully generated narrative");
          }
        } catch (error) {
          console.error("Error generating narrative:", error);
          // If rate limited, rethrow for handler
          if (error.response && error.response.status === 429) throw error;
        }
      }

      // Check if predictions need generation
      if (!story.predictions || story.predictions.length === 0) {
        try {
          console.log("Generating predictions for story");
          const predictions = await multiLLMService.generatePredictions({
            entityName: story.entities[0]?.name || "Unknown",
            categories: story.categories || [],
            sentiment: "neutral",
            chapters: story.chapters,
          });

          if (predictions && predictions.length > 0) {
            story.predictions = predictions;
            updateNeeded = true;
            console.log("✓ Successfully generated predictions");
          }
        } catch (error) {
          console.error("Error generating predictions:", error);
          // If rate limited, rethrow for handler
          if (error.response && error.response.status === 429) throw error;
        }
      }

      // Save if any updates were made
      if (updateNeeded) {
        await story.save();
        console.log(`✓ Successfully updated story: ${story.title}`);
      }
    } catch (error) {
      console.error(`Error enriching story ${task.storyId}:`, error);
      // If it's a rate limit, throw so it can be caught by the calling function
      if (error.response && error.response.status === 429) {
        throw error;
      }
    }
  }

  /**
   * Check if all LLM providers are unavailable due to rate limits
   */
  areAllProvidersUnavailable() {
    // Reset provider status if enough time has passed since the last failure
    Object.keys(this.providerStatus).forEach((provider) => {
      const status = this.providerStatus[provider];
      const timeSinceFailure = Date.now() - status.lastFailure;

      // If it's been more than the cooldown period, mark as available again
      if (!status.available && timeSinceFailure > this.cooldownPeriod) {
        console.log(`${provider} API cooldown complete, marking as available`);
        status.available = true;
      }
    });

    return (
      !this.providerStatus.gemini.available &&
      !this.providerStatus.together.available &&
      !this.providerStatus.mistral.available
    );
  }
}

// Create and export a singleton instance
const llmWorker = new LLMWorker();
module.exports = llmWorker;
