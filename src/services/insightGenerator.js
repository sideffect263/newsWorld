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

// Modified LLM prompts to include valid insight types
function getPrompt(articleText) {
  return `
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
    "type": "Choose one from these valid types: stock_prediction, market_trend, political_impact, social_impact, technology_impact, legal_consequence, economic_impact, financial_impact, environmental_impact, health_impact, regulatory_impact, other",
    "entity": "Name of entity affected",
    "prediction": "Brief, specific prediction",
    "confidence": "Number between 0-1",
    "reasoning": "1-2 sentence explanation with supporting rationale"
  }
]

If no reasonable predictions can be made, return an empty array: []
Your response must be valid JSON and nothing else.
`.trim();
}

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

    // Try multiple LLM providers in sequence
    let insights = [];
    let error = null;

    // Try Gemini API first
    try {
      console.log("Trying Gemini API for insights generation...");
      insights = await REQUEST_QUEUE.add(() => callGeminiAPI(articleText));
    } catch (err) {
      console.log("Gemini API failed, will try fallback providers:", err.message);
      error = err;
    }

    // If Gemini returned empty results or failed, try Together AI
    if (insights.length === 0) {
      try {
        console.log("Gemini API returned no insights, trying Together AI...");
        insights = await REQUEST_QUEUE.add(() => callTogetherAPI(articleText));
      } catch (err) {
        console.log("Together API failed, will try next fallback provider:", err.message);
        error = err;
      }
    }

    // If Together AI returned empty results or failed, try Mistral AI
    if (insights.length === 0) {
      try {
        console.log("Together API returned no insights, trying Mistral AI...");
        insights = await REQUEST_QUEUE.add(() => callMistralAPI(articleText));
      } catch (err) {
        console.log("Mistral API failed:", err.message);
        error = err;
      }
    }

    // If all providers failed and we have an error, log it
    if (insights.length === 0 && error) {
      console.error("All LLM providers failed for insight generation:", error);
    }

    // Normalize insight types before returning
    insights = validateAndNormalizeInsights(insights);

    // Increment the request counter after successful processing
    REQUEST_COUNTER.count++;

    return insights;
  } catch (error) {
    console.error("Error generating article insights:", error.message);
    return [];
  }
};

/**
 * Validate and normalize insight types to ensure compatibility with article schema
 * @param {Array} insights - The array of insights to validate
 * @returns {Array} - Validated and normalized insights
 */
function validateAndNormalizeInsights(insights) {
  if (!insights || !Array.isArray(insights) || insights.length === 0) {
    return [];
  }

  // Define valid types and mapping of common variants
  const validTypes = [
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

  const typeMapping = {
    economic: "economic_impact",
    economy: "economic_impact",
    financial: "financial_impact",
    finance: "financial_impact",
    money: "financial_impact",
    investment: "financial_impact",
    market: "market_trend",
    stock: "stock_prediction",
    shares: "stock_prediction",
    political: "political_impact",
    policy: "political_impact",
    government: "political_impact",
    social: "social_impact",
    society: "social_impact",
    community: "social_impact",
    technology: "technology_impact",
    tech: "technology_impact",
    innovation: "technology_impact",
    legal: "legal_consequence",
    law: "legal_consequence",
    regulation: "legal_consequence",
    environment: "environmental_impact",
    environmental: "environmental_impact",
    climate: "environmental_impact",
    health: "health_impact",
    healthcare: "health_impact",
    medical: "health_impact",
    regulatory: "regulatory_impact",
    regulation: "regulatory_impact",
    compliance: "regulatory_impact",
  };

  return insights.map((insight) => {
    // Create a normalized copy to avoid mutating the original
    const normalizedInsight = { ...insight };

    // Handle missing or invalid confidence values
    if (typeof normalizedInsight.confidence !== "number" || isNaN(normalizedInsight.confidence)) {
      // Try to parse confidence from string (e.g., "80%" -> 0.8)
      if (typeof normalizedInsight.confidence === "string") {
        const match = normalizedInsight.confidence.match(/(\d+)/);
        if (match) {
          const percentage = parseInt(match[1], 10);
          normalizedInsight.confidence = Math.min(Math.max(percentage / 100, 0), 1);
        } else {
          normalizedInsight.confidence = 0.7; // Default confidence
        }
      } else {
        normalizedInsight.confidence = 0.7; // Default confidence
      }
    }

    // Ensure confidence is within valid range
    normalizedInsight.confidence = Math.min(Math.max(normalizedInsight.confidence, 0), 1);

    // Normalize insight type
    if (!normalizedInsight.type) {
      console.log("Insight missing type, defaulting to 'other'");
      normalizedInsight.type = "other";
    } else if (!validTypes.includes(normalizedInsight.type)) {
      console.log(`Normalizing unknown insight type: ${normalizedInsight.type}`);

      // Try to map the type based on our mapping table
      const lowerType = normalizedInsight.type.toLowerCase();

      // Check for exact matches in our mapping
      if (typeMapping[lowerType]) {
        normalizedInsight.type = typeMapping[lowerType];
      }
      // Check for partial matches
      else {
        let mapped = false;
        for (const [key, value] of Object.entries(typeMapping)) {
          if (lowerType.includes(key)) {
            normalizedInsight.type = value;
            mapped = true;
            break;
          }
        }

        // Default to "other" if no mapping found
        if (!mapped) {
          console.log(`No mapping found for insight type: ${normalizedInsight.type}, defaulting to "other"`);
          normalizedInsight.type = "other";
        }
      }
    }

    return normalizedInsight;
  });
}

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

    // Use the common prompt
    const prompt = getPrompt(articleText);

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
            (typeof insight.confidence === "number" || typeof insight.confidence === "string") &&
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

    // Propagate the error so we can try fallback
    throw error;
  }
}

/**
 * Call Together AI API to generate insights as a fallback
 * @param {String} articleText - Formatted article text
 * @returns {Promise<Array>} Array of insights
 */
async function callTogetherAPI(articleText, retryCount = 0) {
  try {
    // Maximum retries
    const MAX_RETRIES = 3;
    // Exponential backoff delay calculation (3s, 6s, 12s)
    const delay = retryCount > 0 ? Math.min(3000 * Math.pow(2, retryCount - 1), 60000) : 0;

    if (retryCount > 0) {
      console.log(`Retrying Together API call (attempt ${retryCount}/${MAX_RETRIES}) after ${delay}ms delay`);
      // Wait for the calculated delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // First try to get key from environment variable, then use hardcoded key as fallback
    const TOGETHER_API_KEY = process.env.TOGETHER_API;
    // Log which key we're using (without exposing the full key for security)
    if (process.env.TOGETHER_API) {
      console.log("Using Together API key from environment variables");
    } else {
      console.log("Using fallback Together API key");
    }

    const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

    // Use the common prompt
    const prompt = getPrompt(articleText);

    const response = await axios.post(
      TOGETHER_API_URL,
      {
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", // Using free tier model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30-second timeout
      },
    );

    // Parse the response to get insights
    const textResponse = response.data?.choices?.[0]?.message?.content;

    if (!textResponse) {
      return [];
    }

    // Extract JSON from the response (model might include extra text)
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
            (typeof insight.confidence === "number" || typeof insight.confidence === "string") &&
            insight.reasoning,
        );
      } catch (e) {
        console.error("Error parsing Together AI response:", e);

        // Try one more approach - attempt to parse the entire response as JSON
        try {
          const insights = JSON.parse(textResponse);
          if (Array.isArray(insights)) {
            return insights.filter(
              (insight) =>
                insight.type &&
                insight.entity &&
                insight.prediction &&
                (typeof insight.confidence === "number" || typeof insight.confidence === "string") &&
                insight.reasoning,
            );
          }
        } catch (e2) {
          console.error("Second parse attempt failed:", e2);
        }

        return [];
      }
    }

    return [];
  } catch (error) {
    console.error("Error calling Together AI API:", error.message);

    if (error.response) {
      console.error("API response:", error.response.data);
    }

    // Retry with exponential backoff for certain errors
    if (retryCount < 3) {
      console.log(`Together API error, retrying (${retryCount + 1}/3)...`);
      return callTogetherAPI(articleText, retryCount + 1);
    }

    // Return empty array after all retries failed
    return [];
  }
}

/**
 * Call Mistral AI API to generate insights as another fallback option
 * @param {String} articleText - Formatted article text
 * @returns {Promise<Array>} Array of insights
 */
async function callMistralAPI(articleText, retryCount = 0) {
  try {
    // Maximum retries
    const MAX_RETRIES = 3;
    // Exponential backoff delay calculation (3s, 6s, 12s)
    const delay = retryCount > 0 ? Math.min(3000 * Math.pow(2, retryCount - 1), 60000) : 0;

    if (retryCount > 0) {
      console.log(`Retrying Mistral API call (attempt ${retryCount}/${MAX_RETRIES}) after ${delay}ms delay`);
      // Wait for the calculated delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // First try to get key from environment variable, then use hardcoded key as fallback
    const MISTRAL_API_KEY = process.env.MISTRAL_API;

    // Log which key we're using (without exposing the full key for security)
    if (process.env.MISTRAL_API) {
      console.log("Using Mistral API key from environment variables");
    } else {
      console.log("Using fallback Mistral API key");
    }

    const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

    // Use the common prompt
    const prompt = getPrompt(articleText);

    const response = await axios.post(
      MISTRAL_API_URL,
      {
        model: "mistral-large-latest",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000, // 30-second timeout
      },
    );

    // Parse the response to get insights
    const textResponse = response.data?.choices?.[0]?.message?.content;

    if (!textResponse) {
      return [];
    }

    // Extract JSON from the response (model might include extra text)
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
            (typeof insight.confidence === "number" || typeof insight.confidence === "string") &&
            insight.reasoning,
        );
      } catch (e) {
        console.error("Error parsing Mistral AI response:", e);

        // Try one more approach - attempt to parse the entire response as JSON
        try {
          const insights = JSON.parse(textResponse);
          if (Array.isArray(insights)) {
            return insights.filter(
              (insight) =>
                insight.type &&
                insight.entity &&
                insight.prediction &&
                (typeof insight.confidence === "number" || typeof insight.confidence === "string") &&
                insight.reasoning,
            );
          }
        } catch (e2) {
          console.error("Second parse attempt failed:", e2);
        }

        return [];
      }
    }

    return [];
  } catch (error) {
    console.error("Error calling Mistral AI API:", error.message);

    if (error.response) {
      console.error("API response:", error.response.data);
    }

    // Retry with exponential backoff for certain errors
    if (retryCount < 3) {
      console.log(`Mistral API error, retrying (${retryCount + 1}/3)...`);
      return callMistralAPI(articleText, retryCount + 1);
    }

    // Propagate the error so we can try the next fallback
    throw error;
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
