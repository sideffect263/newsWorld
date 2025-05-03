/**
 * MultiLLM Service - A service to handle multiple LLM providers with fallback mechanisms
 * This service attempts to use Gemini first, then falls back to Together AI, then to Mistral AI
 */

const axios = require("axios");
const geminiService = require("./geminiService");

class MultiLLMService {
  constructor() {
    // API keys for all providers
    this.geminiApiKey = process.env.GEMINI_API;
    this.togetherApiKey = process.env.TOGETHER_API;
    this.mistralApiKey = process.env.MISTRAL_API;

    // API endpoints
    this.togetherApiUrl = "https://api.together.xyz/v1/chat/completions";
    this.mistralApiUrl = "https://api.mistral.ai/v1/chat/completions";

    // Track available providers
    this.geminiAvailable = !!this.geminiApiKey;
    this.togetherAvailable = !!this.togetherApiKey;
    this.mistralAvailable = !!this.mistralApiKey;

    // Log initialization
    this.logProviderStatus();
  }

  /**
   * Log which providers are available
   */
  logProviderStatus() {
    console.log(`MultiLLM Service initialized with providers:`);
    console.log(`- Gemini API: ${this.geminiAvailable ? "Available" : "Not available"}`);
    console.log(`- Together API: ${this.togetherAvailable ? "Available" : "Available (fallback)"}`);
    console.log(`- Mistral AI: ${this.mistralAvailable ? "Available" : "Available (fallback)"}`);
  }

  /**
   * Generate content using multiple LLM providers with fallback
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - The generated content
   */
  async generateContent(prompt, options = {}) {
    // Attempt Gemini first if available
    if (this.geminiAvailable) {
      try {
        console.log("Attempting to use Gemini API for content generation");
        const content = await geminiService.generateContent(prompt, options);
        if (content) {
          return content;
        }
        console.log("Gemini API returned empty content, trying fallback");
      } catch (error) {
        console.log(`Gemini API error: ${error.message}. Trying fallback.`);
      }
    } else {
      console.log("Gemini API not available, trying Together AI");
    }

    // Try Together AI as first fallback
    try {
      console.log("Attempting to use Together AI as fallback");
      const content = await this.generateWithTogetherAI(prompt, options);
      if (content) {
        return content;
      }
      console.log("Together AI returned empty content, trying next fallback");
    } catch (error) {
      console.log(`Together AI error: ${error.message}. Trying next fallback.`);
    }

    // Try Mistral AI as second fallback
    try {
      console.log("Attempting to use Mistral AI as final fallback");
      const content = await this.generateWithMistralAI(prompt, options);
      if (content) {
        return content;
      }
      console.log("Mistral AI returned empty content");
    } catch (error) {
      console.log(`Mistral AI error: ${error.message}`);
    }

    // If all providers fail, return null
    console.log("All LLM providers failed, returning null");
    return null;
  }

  /**
   * Generate content using Together AI
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - The generated content
   */
  async generateWithTogetherAI(prompt, options = {}) {
    try {
      const response = await axios.post(
        this.togetherApiUrl,
        {
          model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", // Using free tier model
          messages: [{ role: "user", content: prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${this.togetherApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30-second timeout
        },
      );

      // Extract text from response
      const textResponse = response.data?.choices?.[0]?.message?.content;
      return textResponse || null;
    } catch (error) {
      console.error("Error calling Together AI:", error.message);
      throw error;
    }
  }

  /**
   * Generate content using Mistral AI
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - The generated content
   */
  async generateWithMistralAI(prompt, options = {}) {
    try {
      const response = await axios.post(
        this.mistralApiUrl,
        {
          model: "mistral-large-latest",
          messages: [{ role: "user", content: prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${this.mistralApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 30000, // 30-second timeout
        },
      );

      // Extract text from response
      const textResponse = response.data?.choices?.[0]?.message?.content;
      return textResponse || null;
    } catch (error) {
      console.error("Error calling Mistral AI:", error.message);
      throw error;
    }
  }

  /**
   * The following methods mirror the methods in geminiService but use our fallback mechanism
   */

  /**
   * Generate a story title with fallback mechanisms
   */
  async generateStoryTitle(storyData) {
    const { entityName, entityType, categories, sentiment, articleCount } = storyData;

    const prompt = `
    Create an engaging, journalistic headline for a news story about ${entityName} (a ${entityType}).
    
    Story context:
    - Main topic: ${entityName}
    - Categories: ${categories.join(", ")}
    - Overall sentiment: ${sentiment}
    - Based on ${articleCount} articles
    
    The headline should be:
    - Catchy and attention-grabbing
    - Between 6-12 words
    - Descriptive of the core story
    - Avoid clickbait tactics
    - Not use phrases like "Developing Story" or generic templates
    - Unique and specific to ${entityName}
    
    Return only the headline text with no quotation marks or additional explanation.
    `;

    const title = await this.generateContent(prompt, { temperature: 0.8 });
    return title || `${entityName}: The Unfolding Story`;
  }

  /**
   * Generate a story summary with fallback mechanisms
   */
  async generateStorySummary(storyData) {
    const { entityName, articles, timeRange, sourceCount, sentiment } = storyData;

    // Extract key information from a sample of articles to inform the summary
    const articleSample = articles
      .slice(0, 5)
      .map((a) => a.title)
      .join("\n- ");

    const prompt = `
    Create a concise, engaging summary for a news story about ${entityName}.
    
    Story context:
    - Time period: ${timeRange}
    - Number of articles: ${articles.length}
    - Number of sources: ${sourceCount}
    - Overall sentiment: ${sentiment}
    - Sample headlines:
      - ${articleSample}
    
    The summary should:
    - Be 2-3 sentences (maximum 75 words)
    - Highlight the most important aspects of the story
    - Be objective but engaging
    - Avoid phrases like "This story follows" or "This evolving story"
    - Use active voice and strong verbs
    
    Return only the summary text with no quotation marks or additional explanation.
    `;

    const summary = await this.generateContent(prompt, { temperature: 0.7 });

    // Fallback if all APIs fail
    if (!summary) {
      return `This story tracks key developments related to ${entityName} from ${timeRange}, based on reporting from ${sourceCount} news sources.`;
    }

    return summary;
  }

  /**
   * Generate narrative content with fallback mechanisms
   */
  async generateNarrative(storyData) {
    const { entityName, entityType, chapters, sentiment } = storyData;

    // Create a chronological overview from chapter summaries
    const chapterOverview = chapters
      .map(
        (ch, i) => `Chapter ${i + 1} (${new Date(ch.publishedAt).toLocaleDateString()}): ${ch.title} - ${ch.summary}`,
      )
      .join("\n\n");

    const prompt = `
    Create an engaging narrative that tells the story about ${entityName} (a ${entityType}) based on the following chapter summaries:
    
    ${chapterOverview}
    
    Overall sentiment: ${sentiment}
    
    The narrative should:
    - Begin with a strong, journalist-style introduction that hooks the reader
    - Connect the events in a coherent, flowing story
    - Be 3-5 paragraphs total
    - Use an objective but engaging tone
    - Avoid redundancy and formulaic writing
    - Highlight the most significant developments
    - End with insight about what this story means in the broader context
    
    Return only the narrative text with no quotation marks or additional explanation.
    `;

    return await this.generateContent(prompt, {
      temperature: 0.7,
      maxTokens: 800,
    });
  }

  /**
   * Generate chapter summary with fallback mechanisms
   */
  async generateChapterSummary(chapterData) {
    const { articles, date, entityName } = chapterData;

    // Get titles for context
    const articleTitles = articles
      .slice(0, 5)
      .map((a) => a.title)
      .join("\n- ");

    const prompt = `
    Create a concise, informative summary for a single chapter in a news story about ${entityName} from ${date}.
    
    Articles in this chapter:
    - ${articleTitles}
    ${articles.length > 5 ? `- Plus ${articles.length - 5} more articles` : ""}
    
    The summary should:
    - Be 1-2 sentences (maximum 50 words)
    - Capture the essential development on this date
    - Be specific and informative
    - Use journalistic style
    
    Return only the summary text with no quotation marks or additional explanation.
    `;

    const summary = await this.generateContent(prompt, { temperature: 0.7 });

    // Fallback if all APIs fail
    if (!summary) {
      // Get the best article
      const mainArticle = articles[0];
      return mainArticle.description || mainArticle.title;
    }

    return summary;
  }

  /**
   * Generate predictions with fallback mechanisms
   */
  async generatePredictions(storyData) {
    const { entityName, categories, sentiment, chapters } = storyData;

    const prompt = `
    Based on a news story about ${entityName} with sentiment trend "${sentiment}" and categories "${categories.join(
      ", ",
    )}", 
    generate 2 concise, insightful predictions about how this story might develop next.
    
    Each prediction should:
    - Be 1-2 sentences
    - Be specific but plausible
    - Avoid generic statements
    - Include a reasonable confidence score (0.5-0.9)
    
    Format each prediction as:
    1. [prediction text] | [confidence score]
    2. [prediction text] | [confidence score]
    
    Return only the predictions in the format specified, with no additional explanation.
    `;

    const result = await this.generateContent(prompt, { temperature: 0.8 });

    if (!result) {
      // Return null to use template-based fallback in the controller
      return null;
    }

    // Parse the response
    try {
      const predictions = [];
      const lines = result.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        // Extract prediction text and confidence
        const match = line.match(/\d+\.\s+(.*)\s+\|\s+(0\.\d+)/);
        if (match) {
          const [_, content, confidenceStr] = match;
          const confidence = parseFloat(confidenceStr);

          if (content && !isNaN(confidence)) {
            predictions.push({
              content: content.trim(),
              confidence: Math.min(0.95, Math.max(0.5, confidence)), // Ensure in valid range
              createdAt: new Date(),
            });
          }
        }
      }

      return predictions.length > 0 ? predictions : null;
    } catch (error) {
      console.error("Error parsing predictions:", error);
      return null;
    }
  }

  /**
   * Generate chapter title with fallback mechanisms
   */
  async generateChapterTitle(chapterData) {
    const { entityName, date, articles } = chapterData;

    // Get titles for context
    const articleTitles = articles
      .slice(0, 3)
      .map((a) => a.title)
      .join("\n- ");

    const prompt = `
    Create a short, newspaper-style headline for a chapter about ${entityName} from ${date}.
    
    Sample article headlines:
    - ${articleTitles}
    
    The chapter title should:
    - Be 5-8 words maximum
    - Include the date (${date})
    - Be specific and informative
    - Use journalistic style
    
    Return only the title with no quotation marks or additional explanation.
    `;

    const title = await this.generateContent(prompt, { temperature: 0.7 });

    // Fallback if all APIs fail
    if (!title) {
      return `${date}: ${entityName} Developments`;
    }

    return title;
  }
}

module.exports = new MultiLLMService();
