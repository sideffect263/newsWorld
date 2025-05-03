const Article = require("../models/article.model");
const axios = require("axios");

// Rate limiting configuration
const INSIGHTS_ENABLED = true; // Flag to globally enable/disable insights
const MAX_REQUESTS_PER_HOUR = 50; // Adjust based on your API limits
const REQUEST_COUNTER = {
  count: 0,
  resetTime: Date.now() + 60 * 60 * 1000,
};

// Queue system to process API requests sequentially
const REQUEST_QUEUE = {
  isProcessing: false,
  queue: [],
  processNext: async function () {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const nextRequest = this.queue.shift();

    try {
      // Execute the queued request
      const result = await nextRequest.operation();
      nextRequest.resolve(result);
    } catch (error) {
      nextRequest.reject(error);
    } finally {
      // Add a delay before processing next request to avoid overloading
      setTimeout(() => {
        this.isProcessing = false;
        this.processNext();
      }, 3000); // 3-second minimum delay between API calls
    }
  },

  add: function (operation) {
    return new Promise((resolve, reject) => {
      // Add the operation to the queue
      this.queue.push({ operation, resolve, reject });

      // Start processing if not already
      if (!this.isProcessing) {
        this.processNext();
      }
    });
  },
};

// Reset the counter hourly
setInterval(() => {
  REQUEST_COUNTER.count = 0;
  REQUEST_COUNTER.resetTime = Date.now() + 60 * 60 * 1000;
}, 60 * 60 * 1000);

/**
 * Generate insights for an article
 * @param {Object} article - The article object
 * @returns {Promise<Array>} Array of insights
 */
exports.generateArticleInsights = async (article) => {
  // Skip if insights are disabled or article already has insights
  if (!INSIGHTS_ENABLED || (article.insights && article.insights.length > 0)) {
    return [];
  }

  // Rate limiting check
  if (REQUEST_COUNTER.count >= MAX_REQUESTS_PER_HOUR) {
    console.log("Insight generation rate limit reached, skipping");
    return [];
  }

  try {
    // Extract entities, sentiment, and categories for context
    const entities = article.entities || [];
    const companies = entities.filter((e) => e.type === "organization").map((e) => e.name);
    const people = entities.filter((e) => e.type === "person").map((e) => e.name);
    const locations = entities.filter((e) => ["location", "city", "country"].includes(e.type)).map((e) => e.name);
    const sentiment = article.sentimentAssessment || "neutral";
    const categories = article.categories || [];

    // Only process articles with sufficient content
    if (!article.title || (!article.content && !article.description)) {
      return [];
    }

    // Create a summary of the article for the AI prompt
    const articleText = `
Title: ${article.title}
Source: ${article.source?.name || "Unknown"}
Categories: ${categories.join(", ")}
Sentiment: ${sentiment}
Key Organizations: ${companies.join(", ") || "None identified"}
Key People: ${people.join(", ") || "None identified"}
Key Locations: ${locations.join(", ") || "None identified"}
Content Summary: ${article.description || article.content?.substring(0, 500) || ""}
    `.trim();

    // Generate insights using Gemini API - add to queue
    const insights = await REQUEST_QUEUE.add(() => callGeminiAPI(articleText));

    // Increment the request counter after successful processing
    REQUEST_COUNTER.count++;

    return insights;
  } catch (error) {
    console.error("Error generating article insights:", error.message);
    return [];
  }
};

/**
 * Call Gemini API to generate insights with retry logic
 * @param {String} articleText - Formatted article text
 * @returns {Promise<Array>} Array of insights
 */
async function callGeminiAPI(articleText, retryCount = 0) {
  try {
    // Maximum retries
    const MAX_RETRIES = 5;
    // Exponential backoff delay calculation (3s, 6s, 12s, 24s, 48s)
    const delay = retryCount > 0 ? Math.min(3000 * Math.pow(2, retryCount - 1), 60000) : 0;

    if (retryCount > 0) {
      console.log(`Retrying Gemini API call (attempt ${retryCount}/${MAX_RETRIES}) after ${delay}ms delay`);
      // Wait for the calculated delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const GEMINI_API_KEY = process.env.GEMINI_API;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    // Craft a prompt that encourages specific, actionable insights
    const prompt = `
Based on this news article, generate 1-2 specific, data-backed predictions or insights about potential outcomes.

Article details:
${articleText}

For each insight:
1. Focus on logical consequences or implications (economic, political, social, etc.)
2. Mention specific entities when possible
3. Provide a brief reasoning
4. Only generate high-confidence predictions, not speculations
5. Include a confidence level (percentage)

FORMAT YOUR RESPONSE AS JSON with this structure (and nothing else):
[
  {
    "type": "Choose one: stock_prediction, market_trend, political_impact, social_impact, technology_impact, legal_consequence, other",
    "entity": "Name of entity affected",
    "prediction": "Brief, specific prediction",
    "confidence": "Number between 0-1",
    "reasoning": "1-2 sentence explanation with supporting rationale"
  }
]

If no reasonable predictions can be made, return an empty array: []
    `.trim();

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30-second timeout
      },
    );

    // Parse the response to get insights
    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return [];
    }

    // Extract JSON from the response (Gemini might include extra text)
    let jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const insights = JSON.parse(jsonMatch[0]);

        // Validate insights format
        return insights.filter(
          (insight) =>
            insight.type &&
            insight.entity &&
            insight.prediction &&
            typeof insight.confidence === "number" &&
            insight.reasoning,
        );
      } catch (e) {
        console.error("Error parsing Gemini response:", e);
        return [];
      }
    }

    return [];
  } catch (error) {
    // Check for overloaded model error (503)
    const isOverloaded = error.response && error.response.status === 503;
    console.error("Error calling Gemini API:", error.message);

    if (error.response) {
      console.error("API response:", error.response.data);
    }

    // Retry with exponential backoff if model is overloaded
    if (isOverloaded && retryCount < 5) {
      console.log(`Gemini API overloaded, retrying (${retryCount + 1}/5)...`);
      return callGeminiAPI(articleText, retryCount + 1);
    }

    // If exhausted retries or different error, return empty array
    return [];
  }
}

// Batch process existing articles that don't have insights yet
exports.batchProcessArticles = async (options = {}) => {
  const { limit = 10, skip = 0 } = options;

  try {
    const articles = await Article.find({ insights: { $size: 0 } })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`Batch processing insights for ${articles.length} articles`);

    let processedCount = 0;

    // Process articles sequentially to avoid API overload
    for (const article of articles) {
      // Check rate limits
      if (REQUEST_COUNTER.count >= MAX_REQUESTS_PER_HOUR) {
        console.log("Rate limit reached during batch processing");
        break;
      }

      try {
        const insights = await exports.generateArticleInsights(article);

        if (insights && insights.length > 0) {
          article.insights = insights;
          await article.save();
          processedCount++;
          console.log(`Generated insights for article: ${article.title}`);
        }
      } catch (error) {
        console.error(`Error processing article ${article._id}:`, error.message);
      }

      // Wait between articles to avoid overloading the API (especially in batch mode)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return {
      success: true,
      processed: processedCount,
      total: articles.length,
    };
  } catch (error) {
    console.error("Error in batch processing insights:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};
