/**
 * Test script for Together AI API integration
 * This script tests the fallback LLM provider functionality
 *
 * Run with: node src/scripts/test-together-api.js
 */

require("dotenv").config();
const axios = require("axios");

// Sample article text for testing
const sampleArticle = {
  title: "Tech Giant Announces New AI Research Lab",
  source: { name: "TechNews Daily" },
  categories: ["technology", "business"],
  sentimentAssessment: "positive",
  entities: [
    { name: "TechCorp", type: "organization" },
    { name: "Jane Smith", type: "person" },
    { name: "Silicon Valley", type: "location" },
  ],
  description:
    "TechCorp announced a new AI research lab led by Dr. Jane Smith to focus on ethical AI development. The $200 million investment aims to accelerate responsible innovation in machine learning technologies.",
};

// Format article text similar to the insightGenerator.js format
const formatArticleText = (article) => {
  const companies = article.entities.filter((e) => e.type === "organization").map((e) => e.name);
  const people = article.entities.filter((e) => e.type === "person").map((e) => e.name);
  const locations = article.entities.filter((e) => ["location", "city", "country"].includes(e.type)).map((e) => e.name);

  return `
Title: ${article.title}
Source: ${article.source?.name || "Unknown"}
Categories: ${article.categories.join(", ")}
Sentiment: ${article.sentimentAssessment || "neutral"}
Key Organizations: ${companies.join(", ") || "None identified"}
Key People: ${people.join(", ") || "None identified"}
Key Locations: ${locations.join(", ") || "None identified"}
Content Summary: ${article.description || ""}
  `.trim();
};

// Call Together AI API
const callTogetherAPI = async (articleText) => {
  try {
    // Get API key from environment variables or use default
    const TOGETHER_API_KEY = process.env.TOGETHER_API;
    const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

    console.log(
      "Using API Key:",
      TOGETHER_API_KEY.substring(0, 5) + "..." + TOGETHER_API_KEY.substring(TOGETHER_API_KEY.length - 5),
    );

    // Craft a prompt similar to the one in insightGenerator.js
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
Your response must be valid JSON and nothing else.
`.trim();

    console.log("\nSending request to Together AI...");

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
      },
    );

    // Parse the response
    console.log("\nResponse received:");
    console.log("Status:", response.status);

    const textResponse = response.data?.choices?.[0]?.message?.content;
    console.log("\nRaw response content:");
    console.log(textResponse);

    if (!textResponse) {
      console.log("No text response received");
      return [];
    }

    // Try to extract and parse JSON from response
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      try {
        console.log("\nParsed JSON response:");
        const insights = JSON.parse(jsonMatch[0]);
        console.log(JSON.stringify(insights, null, 2));
        return insights;
      } catch (e) {
        console.error("Error parsing JSON response:", e.message);
        return [];
      }
    } else {
      // If no JSON brackets found, try parsing the entire response as JSON
      try {
        const insights = JSON.parse(textResponse);
        console.log("\nParsed entire response as JSON:");
        console.log(JSON.stringify(insights, null, 2));
        return insights;
      } catch (e) {
        console.error("Error parsing entire response as JSON:", e.message);
        return [];
      }
    }
  } catch (error) {
    console.error("Error calling Together AI API:", error.message);
    if (error.response) {
      console.error("API error data:", error.response.data);
      console.error("API error status:", error.response.status);
    }
    return [];
  }
};

// Main test function
const runTest = async () => {
  console.log("==== Testing Together AI Integration ====\n");

  // Format the article text
  const articleText = formatArticleText(sampleArticle);
  console.log("Article text for testing:");
  console.log(articleText);

  // Call the API
  const insights = await callTogetherAPI(articleText);

  // Display results
  console.log("\n==== Test Results ====");
  if (insights && insights.length > 0) {
    console.log(`Successfully generated ${insights.length} insights using Together AI`);
    console.log("Test passed!");
  } else {
    console.log("No insights generated");
    console.log("Test may have failed or returned empty insights array");
  }
};

// Run the test
runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
