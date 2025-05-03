const axios = require("axios");

/**
 * Service to interact with Google's Gemini API for AI-generated content
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API;
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    this.model = "gemini-1.5-pro"; // Using the most capable model
  }

  /**
   * Initialize the service
   */
  initialize() {
    if (!this.apiKey) {
      console.warn("GEMINI_API key not found in environment variables");
      return false;
    }
    return true;
  }

  /**
   * Generate AI content using Gemini
   *
   * @param {string} prompt - The prompt for generating content
   * @param {Object} options - Additional options for generation
   * @returns {Promise<string>} - The generated content
   */
  async generateContent(prompt, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error("GEMINI_API key not configured");
      }

      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await axios.post(url, {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxTokens || 1024,
          stopSequences: options.stopSequences || [],
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
        ],
      });

      // Extract the generated text from response
      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates[0] &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts[0]
      ) {
        return response.data.candidates[0].content.parts[0].text;
      }

      throw new Error("Failed to extract generated content from Gemini API response");
    } catch (error) {
      console.error("Error generating content with Gemini API:", error.message);
      // Return a fallback message if API fails
      return null;
    }
  }

  /**
   * Generate a story title that's engaging and unique
   *
   * @param {Object} storyData - Data about the story
   * @returns {Promise<string>} - Generated title
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
   * Generate a concise, engaging summary for a story
   *
   * @param {Object} storyData - Story data including articles and context
   * @returns {Promise<string>} - Generated summary
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

    // Fallback if API fails
    if (!summary) {
      return `This story tracks key developments related to ${entityName} from ${timeRange}, based on reporting from ${sourceCount} news sources.`;
    }

    return summary;
  }

  /**
   * Generate narrative content for a story based on chapters and articles
   *
   * @param {Object} storyData - Story data with chapters and context
   * @returns {Promise<string>} - Generated narrative
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

    const narrative = await this.generateContent(prompt, {
      temperature: 0.7,
      maxTokens: 800,
    });

    // Fallback if API fails
    if (!narrative) {
      // Use the existing narrative generation function as fallback
      return null;
    }

    return narrative;
  }

  /**
   * Generate a more engaging chapter summary
   *
   * @param {Object} chapterData - Data about the chapter and its articles
   * @returns {Promise<string>} - Generated chapter summary
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

    // Fallback if API fails
    if (!summary) {
      // Get the best article
      const mainArticle = articles[0];
      return mainArticle.description || mainArticle.title;
    }

    return summary;
  }

  /**
   * Generate insightful predictions based on story data
   *
   * @param {Object} storyData - Story data including trends and context
   * @returns {Promise<Array>} - Array of prediction objects
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
      // Fallback to template-based predictions
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
}

module.exports = new GeminiService();
