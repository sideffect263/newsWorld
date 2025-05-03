const Story = require("../models/story.model");
const Article = require("../models/article.model");
const mongoose = require("mongoose");
const geminiService = require("../services/geminiService");

// Get all stories with pagination
exports.getStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const category = req.query.category ? req.query.category.toLowerCase() : null;
    const keyword = req.query.keyword ? req.query.keyword.toLowerCase() : null;
    const country = req.query.country ? req.query.country.toUpperCase() : null;
    const sortBy = req.query.sort || "relevancy";

    // Build filter
    const filter = {};
    if (category) filter.categories = category;
    if (keyword) filter.keywords = keyword;
    if (country) filter.countries = country;

    // Determine sort order
    let sortOptions = {};
    switch (sortBy) {
      case "newest":
        sortOptions = { updatedAt: -1 };
        break;
      case "oldest":
        sortOptions = { updatedAt: 1 };
        break;
      case "popular":
        sortOptions = { viewCount: -1 };
        break;
      case "relevancy":
      default:
        sortOptions = { relevancyScore: -1, updatedAt: -1 };
        break;
    }

    // Execute query
    const stories = await Story.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select("title summary timeline categories countries viewCount keywords relevancyScore")
      .lean();

    const total = await Story.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: stories.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: stories,
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching stories",
    });
  }
};

// Get a single story by ID
exports.getStory = async (req, res) => {
  try {
    const id = req.params.id;
    let story;

    // Check if ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      story = await Story.findById(id)
        .populate({
          path: "chapters.articles",
          select: "title description url publishedAt source imageUrl",
        })
        .populate({
          path: "relatedStories",
          select: "title summary",
        });
    } else {
      // If not a valid ObjectId, try to find by string ID
      story = await Story.findOne({ _id: id })
        .populate({
          path: "chapters.articles",
          select: "title description url publishedAt source imageUrl",
        })
        .populate({
          path: "relatedStories",
          select: "title summary",
        });
    }

    if (!story) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found",
      });
    }

    // Increment view count
    story.viewCount += 1;
    await story.save();

    res.status(200).json({
      status: "success",
      data: story,
    });
  } catch (error) {
    console.error("Error fetching story:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching story",
    });
  }
};

// Generate new stories or update existing ones based on recent articles
exports.generateStories = async (req, res) => {
  try {
    // This would typically be a background job, but we're exposing an API for testing
    const result = await createOrUpdateStories();

    res.status(200).json({
      status: "success",
      message: "Story generation process completed",
      data: result,
    });
  } catch (error) {
    console.error("Error generating stories:", error);
    res.status(500).json({
      status: "error",
      message: "Error generating stories",
    });
  }
};

// Add a direct function to generate stories without going through the API
exports.generateStoriesDirectly = async () => {
  try {
    const result = await createOrUpdateStories();
    return {
      status: "success",
      message: "Story generation process completed",
      data: result,
    };
  } catch (error) {
    console.error("Error in direct story generation:", error);
    throw error;
  }
};

// Helper function to create or update stories
async function createOrUpdateStories() {
  // In a real implementation, this would use NLP, clustering, and narrative generation
  // For now, we'll create a simplified version that groups by entities and categories

  // Get recent articles from the last 72 hours (increased from 48)
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 72);

  const articles = await Article.find({
    publishedAt: { $gte: cutoffDate },
  })
    .sort({ publishedAt: -1 })
    .select(
      "_id title description content publishedAt source entities categories countries sentiment sentimentAssessment",
    );

  console.log(`Processing ${articles.length} articles for story generation`);

  // Simple clustering based on entities and topics
  const clusters = {};

  // Group articles by primary entity
  articles.forEach((article) => {
    if (!article.entities || article.entities.length === 0) return;

    // Sort entities by count and get the most prominent one
    const sortedEntities = [...article.entities].sort((a, b) => b.count - a.count);
    const primaryEntity = sortedEntities[0];

    // Skip if no primary entity or it's too generic
    if (!primaryEntity || primaryEntity.name.length < 3) return;

    const entityKey = `${primaryEntity.type}:${primaryEntity.name.toLowerCase()}`;

    if (!clusters[entityKey]) {
      clusters[entityKey] = {
        entity: primaryEntity,
        articles: [],
        categories: new Set(),
        countries: new Set(),
        sentiment: [],
        relatedEntities: {},
      };
    }

    clusters[entityKey].articles.push(article);

    // Track sentiment for the cluster
    if (typeof article.sentiment === "number") {
      clusters[entityKey].sentiment.push(article.sentiment);
    }

    // Track related entities to find story connections
    if (article.entities && article.entities.length > 1) {
      article.entities.forEach((entity) => {
        if (entity.name !== primaryEntity.name) {
          const secondaryKey = `${entity.type}:${entity.name.toLowerCase()}`;
          clusters[entityKey].relatedEntities[secondaryKey] =
            (clusters[entityKey].relatedEntities[secondaryKey] || 0) + 1;
        }
      });
    }

    if (article.categories) {
      article.categories.forEach((category) => {
        clusters[entityKey].categories.add(category);
      });
    }

    if (article.countries) {
      article.countries.forEach((country) => {
        clusters[entityKey].countries.add(country);
      });
    }
  });

  // Filter clusters with too few articles (increased from 3 to 4)
  const significantClusters = Object.values(clusters).filter((cluster) => cluster.articles.length >= 4);

  // Sort clusters by number of articles (descending)
  significantClusters.sort((a, b) => b.articles.length - a.articles.length);

  const results = {
    processed: articles.length,
    clustersFound: Object.keys(clusters).length,
    significantClusters: significantClusters.length,
    storiesCreated: 0,
    storiesUpdated: 0,
  };

  // Track created/updated stories to establish relationships
  const storyRegistry = {};

  // Initialize Gemini service
  const geminiAvailable = geminiService.initialize();
  console.log(`Gemini API ${geminiAvailable ? "is" : "is not"} available for story generation`);

  // For each significant cluster, create or update a story
  for (const cluster of significantClusters) {
    // Sort articles by date
    cluster.articles.sort((a, b) => a.publishedAt - b.publishedAt);

    const entityName = cluster.entity.name;
    const entityType = cluster.entity.type;

    // Check if a story for this entity already exists
    let story = await Story.findOne({
      "entities.name": entityName,
      "entities.type": entityType,
      "timeline.ongoing": true,
    });

    // Calculate cluster sentiment trend
    const sentimentAvg =
      cluster.sentiment.length > 0 ? cluster.sentiment.reduce((a, b) => a + b, 0) / cluster.sentiment.length : 0;

    const sentimentTrend = calculateSentimentTrend(cluster.articles);

    // Generate story title - use Gemini if available or fallback to template
    let storyTitle;
    if (geminiAvailable) {
      try {
        storyTitle = await geminiService.generateStoryTitle({
          entityName,
          entityType,
          categories: Array.from(cluster.categories),
          sentiment: sentimentTrend,
          articleCount: cluster.articles.length,
        });
      } catch (error) {
        console.error("Error generating title with Gemini:", error);
        storyTitle = generateStoryTitle(
          entityName,
          entityType,
          Array.from(cluster.categories),
          cluster.articles,
          sentimentTrend,
        );
      }
    } else {
      storyTitle = generateStoryTitle(
        entityName,
        entityType,
        Array.from(cluster.categories),
        cluster.articles,
        sentimentTrend,
      );
    }

    // Get all article IDs to update story references later
    const allArticleIds = cluster.articles.map((article) => article._id);

    // Improved date validation
    // Get safe start and end dates for the timeline
    const validDates = cluster.articles
      .map((article) => article.publishedAt)
      .filter((date) => date && !isNaN(new Date(date).getTime()));

    // Default to current date if no valid dates are found
    const now = new Date();
    let earliestArticleDate = now;
    let latestArticleDate = now;

    if (validDates.length > 0) {
      earliestArticleDate = new Date(Math.min(...validDates.map((date) => new Date(date).getTime())));
      latestArticleDate = new Date(Math.max(...validDates.map((date) => new Date(date).getTime())));
    }

    // Double-check the dates are valid
    if (isNaN(earliestArticleDate.getTime())) {
      console.warn("Invalid earliest date detected, using current date");
      earliestArticleDate = now;
    }

    if (isNaN(latestArticleDate.getTime())) {
      console.warn("Invalid latest date detected, using current date");
      latestArticleDate = now;
    }

    if (story) {
      // Update existing story
      const articleIds = cluster.articles.map((article) => article._id);
      const newArticleIds = articleIds.filter(
        (id) => !story.chapters.some((chapter) => chapter.articles.some((artId) => artId.equals(id))),
      );

      if (newArticleIds.length > 0) {
        // We have new articles to add to the story
        // Group new articles into chapters by date (simplified approach)
        const dateGroups = groupArticlesByDate(
          cluster.articles.filter((article) => newArticleIds.some((id) => id.equals(article._id))),
        );

        // Add new chapters or update existing ones
        for (const [dateKey, articles] of Object.entries(dateGroups)) {
          const existingChapter = story.chapters.find(
            (chapter) => formatDateForGrouping(chapter.publishedAt) === dateKey,
          );

          if (existingChapter) {
            // Add articles to existing chapter
            existingChapter.articles.push(...articles.map((a) => a._id));
            existingChapter.updatedAt = new Date();

            // Update summary for the chapter
            existingChapter.summary = generateChapterSummary(
              await Article.find({ _id: { $in: existingChapter.articles } }),
            );
          } else {
            // Create new chapter
            const chapterTitle = generateChapterTitle(dateKey, articles, entityName, sentimentTrend);
            const chapterSummary = generateChapterSummary(articles);

            story.chapters.push({
              title: chapterTitle,
              summary: chapterSummary,
              content: generateChapterContent(articles),
              articles: articles.map((a) => a._id),
              publishedAt: validateDate(articles[0].publishedAt),
              updatedAt: new Date(),
            });
          }
        }

        // Update story narrative and predictions
        story.narrative = generateNarrative(story.chapters, sentimentTrend);
        story.predictions = generatePredictions(story.chapters, cluster.categories, sentimentTrend);
        story.updatedAt = new Date();

        // Save the updated story
        await story.save();

        // Update article references to point to this story
        await updateArticleStoryReferences(newArticleIds, story._id);

        results.storiesUpdated++;
        storyRegistry[`${entityType}:${entityName.toLowerCase()}`] = story._id;
      }
    } else {
      // Create new story
      const dateGroups = groupArticlesByDate(cluster.articles);
      const chapters = [];

      for (const [dateKey, articles] of Object.entries(dateGroups)) {
        let chapterTitle;
        let chapterSummary;

        // Use Gemini for chapter generation if available
        if (geminiAvailable) {
          try {
            // Generate chapter title with more context
            const formattedDate = new Date(dateKey).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            });

            chapterTitle =
              (await geminiService.generateChapterTitle({
                entityName,
                date: formattedDate,
                articles: articles.slice(0, 5), // Use a sample of articles for context
              })) || generateChapterTitle(dateKey, articles, entityName, sentimentTrend);

            // Generate chapter summary
            chapterSummary =
              (await geminiService.generateChapterSummary({
                entityName,
                date: formattedDate,
                articles,
              })) || generateChapterSummary(articles);
          } catch (error) {
            console.error("Error generating chapter content with Gemini:", error);
            chapterTitle = generateChapterTitle(dateKey, articles, entityName, sentimentTrend);
            chapterSummary = generateChapterSummary(articles);
          }
        } else {
          chapterTitle = generateChapterTitle(dateKey, articles, entityName, sentimentTrend);
          chapterSummary = generateChapterSummary(articles);
        }

        chapters.push({
          title: chapterTitle,
          summary: chapterSummary,
          content: generateChapterContent(articles),
          articles: articles.map((a) => a._id),
          publishedAt: validateDate(articles[0].publishedAt),
          updatedAt: new Date(),
        });
      }

      // Format time range for summary generation
      const timeRange = `${earliestArticleDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })} to ${latestArticleDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;

      // Get unique source count
      const sourceCount = new Set(cluster.articles.map((a) => a.source?.name).filter(Boolean)).size;

      // Generate story summary - use Gemini if available
      let storySummary;
      if (geminiAvailable) {
        try {
          storySummary = await geminiService.generateStorySummary({
            entityName,
            articles: cluster.articles,
            timeRange,
            sourceCount,
            sentiment: sentimentTrend,
          });
        } catch (error) {
          console.error("Error generating summary with Gemini:", error);
          storySummary = generateStorySummary(cluster.articles, entityName, sentimentTrend);
        }
      } else {
        storySummary = generateStorySummary(cluster.articles, entityName, sentimentTrend);
      }

      // Generate narrative - use Gemini if available
      let narrative;
      if (geminiAvailable) {
        try {
          narrative = await geminiService.generateNarrative({
            entityName,
            entityType,
            chapters,
            sentiment: sentimentTrend,
          });
        } catch (error) {
          console.error("Error generating narrative with Gemini:", error);
          narrative = null;
        }
      }

      // Fall back to template narrative if Gemini fails or isn't available
      if (!narrative) {
        narrative = generateNarrative(chapters, sentimentTrend);
      }

      // Generate predictions - use Gemini if available
      let predictions;
      if (geminiAvailable) {
        try {
          predictions = await geminiService.generatePredictions({
            entityName,
            categories: Array.from(cluster.categories),
            sentiment: sentimentTrend,
            chapters,
          });
        } catch (error) {
          console.error("Error generating predictions with Gemini:", error);
          predictions = null;
        }
      }

      // Fall back to template predictions if Gemini fails or isn't available
      if (!predictions) {
        predictions = generatePredictions(chapters, Array.from(cluster.categories), sentimentTrend);
      }

      // Process entity types to match allowed enum values
      const processedEntities = [
        {
          name: entityName,
          type: entityType === "country" ? "location" : entityType, // Fix for country validation error
          importance: 10,
        },
        ...extractSecondaryEntities(cluster.articles, entityName).map((entity) => ({
          ...entity,
          type: entity.type === "country" ? "location" : entity.type, // Fix for country validation error
        })),
      ];

      // Create the new story
      story = new Story({
        title: storyTitle,
        summary: storySummary,
        narrative: narrative,
        chapters: chapters,
        keywords: extractKeywordsFromArticles(cluster.articles),
        entities: processedEntities,
        categories: Array.from(cluster.categories),
        predictions: predictions,
        timeline: {
          startDate: earliestArticleDate,
          endDate: latestArticleDate,
          ongoing: true,
        },
        countries: Array.from(cluster.countries),
        viewCount: 0,
        relatedStories: [], // Will be populated later
      });

      await story.save();

      // Update article references to point to this story
      await updateArticleStoryReferences(allArticleIds, story._id);

      results.storiesCreated++;
      storyRegistry[`${entityType}:${entityName.toLowerCase()}`] = story._id;
    }
  }

  // Create relationships between stories
  await establishStoryRelationships(significantClusters, storyRegistry);

  // Update search/relevancy scores for stories
  await updateStoryRelevancyScores();

  return results;
}

// Establish relationships between stories based on shared entities
async function establishStoryRelationships(clusters, storyRegistry) {
  const relationships = [];

  // Build relationship map
  for (const cluster of clusters) {
    const entityKey = `${cluster.entity.type}:${cluster.entity.name.toLowerCase()}`;
    const storyId = storyRegistry[entityKey];

    if (!storyId) continue;

    // Find related entities that have their own stories
    const relatedEntityKeys = Object.keys(cluster.relatedEntities)
      .filter((key) => storyRegistry[key])
      .sort((a, b) => cluster.relatedEntities[b] - cluster.relatedEntities[a])
      .slice(0, 5); // Limit to top 5 related entities

    for (const relatedKey of relatedEntityKeys) {
      const relatedStoryId = storyRegistry[relatedKey];

      if (relatedStoryId && !relatedStoryId.equals(storyId)) {
        relationships.push({
          source: storyId,
          target: relatedStoryId,
          strength: cluster.relatedEntities[relatedKey],
        });
      }
    }
  }

  // Update story relationships in the database
  for (const rel of relationships) {
    await Story.findByIdAndUpdate(rel.source, {
      $addToSet: { relatedStories: rel.target },
    });
  }

  console.log(`Established ${relationships.length} story relationships`);
}

// Calculate sentiment trend based on articles
function calculateSentimentTrend(articles) {
  const articleWithSentiment = articles.filter((a) => typeof a.sentiment === "number");

  if (articleWithSentiment.length < 3) return "neutral";

  // Sort by date
  articleWithSentiment.sort((a, b) => a.publishedAt - b.publishedAt);

  // Split into two groups (earlier and later)
  const midpoint = Math.floor(articleWithSentiment.length / 2);
  const earlierArticles = articleWithSentiment.slice(0, midpoint);
  const laterArticles = articleWithSentiment.slice(midpoint);

  // Calculate average sentiment for each group
  const earlierSentiment = earlierArticles.reduce((sum, a) => sum + a.sentiment, 0) / earlierArticles.length;
  const laterSentiment = laterArticles.reduce((sum, a) => sum + a.sentiment, 0) / laterArticles.length;

  // Determine trend
  const delta = laterSentiment - earlierSentiment;

  if (delta > 0.2) return "improving";
  if (delta < -0.2) return "worsening";
  if (laterSentiment > 0.3) return "positive";
  if (laterSentiment < -0.3) return "negative";
  return "neutral";
}

// Generate a title for a story
function generateStoryTitle(entityName, entityType, categories, articles, sentimentTrend) {
  // Use sentiment trend to influence title
  const sentimentPhrases = {
    improving: ["Turning Point", "Positive Shift", "Dramatic Improvement"],
    worsening: ["Growing Concerns", "Mounting Challenges", "Escalating Situation"],
    positive: ["Success Story", "Breakthrough", "Positive Developments"],
    negative: ["Crisis Unfolds", "Troubling Situation", "Challenging Times"],
    neutral: ["Developing Story", "Ongoing Developments", "Evolving Situation"],
  };

  // Get sentiment-specific phrases
  const sentimentOptions = sentimentPhrases[sentimentTrend] || sentimentPhrases.neutral;
  const sentimentPhrase = sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)];

  // Use entity type to influence title
  let entityPrefix = "";
  if (entityType === "person") {
    entityPrefix = "The";
  } else if (entityType === "organization") {
    entityPrefix = "Inside";
  } else if (entityType === "location") {
    entityPrefix = "From";
  }

  // Create title templates
  const templates = [
    `${entityName}: ${sentimentPhrase}`,
    `${entityPrefix} ${entityName} ${sentimentPhrase}`,
    `${sentimentPhrase}: ${entityName}'s Story`,
    `The ${entityName} Chronicles: ${sentimentPhrase}`,
  ];

  // Select a template randomly
  const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

  return selectedTemplate;
}

// Generate a chapter title
function generateChapterTitle(dateKey, articles, entityName, sentimentTrend) {
  const date = new Date(dateKey);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Extract key topics from the articles
  const topics = extractTopics(articles);
  const topTopic = topics.length > 0 ? topics[0] : "";

  // Generate titles based on sentiment and topics
  if (sentimentTrend === "improving") {
    return `${formattedDate}: ${entityName}'s ${topTopic ? topTopic + " " : ""}Breakthrough`;
  } else if (sentimentTrend === "worsening") {
    return `${formattedDate}: ${entityName} Faces ${topTopic ? topTopic + " " : ""}Challenges`;
  } else if (sentimentTrend === "positive") {
    return `${formattedDate}: ${entityName}'s ${topTopic ? topTopic + " " : ""}Success Story`;
  } else if (sentimentTrend === "negative") {
    return `${formattedDate}: ${entityName}'s ${topTopic ? topTopic + " " : ""}Crisis Deepens`;
  }

  // Default neutral title
  return `${formattedDate}: ${entityName}'s ${topTopic ? topTopic + " " : ""}Developments`;
}

// Extract key topics from articles
function extractTopics(articles) {
  const topicCounts = {};

  // Extract topics from article titles and descriptions
  articles.forEach((article) => {
    const text = `${article.title} ${article.description || ""}`.toLowerCase();

    // List of common topics to look for
    const commonTopics = [
      "announcement",
      "launch",
      "release",
      "policy",
      "decision",
      "investigation",
      "regulation",
      "controversy",
      "breakthrough",
      "innovation",
      "crisis",
      "scandal",
      "partnership",
      "agreement",
      "conflict",
      "lawsuit",
      "settlement",
      "acquisition",
      "merger",
    ];

    commonTopics.forEach((topic) => {
      if (text.includes(topic)) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    });
  });

  // Sort topics by frequency
  return Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);
}

// Generate a chapter summary
function generateChapterSummary(articles) {
  if (articles.length === 0) return "";

  // In a real NLP implementation, we would use extractive or abstractive summarization
  // For simplicity, we'll use a rule-based approach

  // Sort articles by sentiment to find the most representative
  const sortedByRepresentation = [...articles].sort((a, b) => {
    // Prefer articles with both title and description
    const aScore = (a.title ? 1 : 0) + (a.description ? 1 : 0);
    const bScore = (b.title ? 1 : 0) + (b.description ? 1 : 0);
    return bScore - aScore;
  });

  // Get the best article
  const mainArticle = sortedByRepresentation[0];

  // Generate summary based on the main article
  if (articles.length === 1) {
    return mainArticle.description || mainArticle.title;
  }

  // For multiple articles, combine main article with article count
  return `${mainArticle.description || mainArticle.title} This chapter includes insights from ${
    articles.length
  } articles published on this date.`;
}

// Generate chapter content
function generateChapterContent(articles) {
  if (articles.length === 0) return "";

  // Group articles by source to avoid repetition
  const sourceGroups = {};

  articles.forEach((article) => {
    const sourceName = article.source?.name || "Unknown Source";
    if (!sourceGroups[sourceName]) {
      sourceGroups[sourceName] = [];
    }
    sourceGroups[sourceName].push(article);
  });

  // Generate paragraphs by source with improved narrative flow
  const paragraphs = Object.entries(sourceGroups).map(([source, sourceArticles]) => {
    // Sort by date for chronological narrative
    sourceArticles.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

    if (sourceArticles.length === 1) {
      const article = sourceArticles[0];
      return `According to ${source}, ${article.description || article.title}${
        article.description ? ` ${article.content ? article.content.substring(0, 150) + "..." : ""}` : ""
      }`;
    } else {
      // Create a coherent paragraph from multiple articles
      const mainArticle = sourceArticles[0];
      const otherArticles = sourceArticles.slice(1);

      let paragraph = `${source} reports that ${mainArticle.description || mainArticle.title}. `;

      // Add context from other articles
      if (otherArticles.length === 1) {
        paragraph += `They additionally noted that ${otherArticles[0].description || otherArticles[0].title}.`;
      } else if (otherArticles.length > 1) {
        // Get a sample of other articles for context
        const sampleArticles = otherArticles.slice(0, Math.min(2, otherArticles.length));
        const remainingCount = otherArticles.length - sampleArticles.length;

        sampleArticles.forEach((article, index) => {
          const connector = index === 0 ? "They further reported that " : "Additionally, ";
          paragraph += `${connector}${article.description || article.title}. `;
        });

        if (remainingCount > 0) {
          paragraph += `${source} published ${remainingCount} more related articles on this topic.`;
        }
      }

      return paragraph;
    }
  });

  // Add a summary paragraph at the end with more context
  const dateRange = getDateRangeText(articles);
  const mainThemes = extractMainThemes(articles);

  let summaryParagraph = `These developments occurred on ${dateRange} and were covered by ${
    Object.keys(sourceGroups).length
  } different news sources.`;

  if (mainThemes.length > 0) {
    summaryParagraph += ` Key themes in the coverage include ${mainThemes.join(", ")}.`;
  }

  paragraphs.push(summaryParagraph);

  return paragraphs.join("\n\n");
}

// Extract main themes from articles for better context
function extractMainThemes(articles) {
  const wordCounts = {};
  const stopWords = new Set([
    "the",
    "and",
    "a",
    "an",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "as",
    "is",
    "was",
    "were",
    "be",
    "been",
  ]);

  // Count word occurrences in titles and descriptions
  articles.forEach((article) => {
    const text = `${article.title} ${article.description || ""}`.toLowerCase();
    const words = text.split(/\W+/).filter((word) => word.length > 3 && !stopWords.has(word));

    words.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
  });

  // Find the most frequent words
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);
}

// Generate narrative content
function generateNarrative(chapters, sentimentTrend) {
  if (!chapters || chapters.length === 0) return "";

  // Determine narrative style based on sentiment trend
  let narrativeIntro;
  switch (sentimentTrend) {
    case "improving":
      narrativeIntro =
        "This is a story of progressive improvement. What began with challenges has shown signs of positive development.";
      break;
    case "worsening":
      narrativeIntro =
        "This is a story of mounting challenges. What began with promise has faced increasing difficulties.";
      break;
    case "positive":
      narrativeIntro =
        "This is a story of success and achievement. The developments have been predominantly positive throughout.";
      break;
    case "negative":
      narrativeIntro =
        "This is a story of persistent challenges. The situation has remained concerning throughout its development.";
      break;
    default:
      narrativeIntro =
        "This is a developing story with both challenges and opportunities. The situation continues to evolve.";
  }

  // Sort chapters chronologically to ensure coherent narrative
  const sortedChapters = [...chapters].sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt) : new Date(0);
    const dateB = b.publishedAt ? new Date(b.publishedAt) : new Date(0);
    return dateA - dateB;
  });

  // Create an array of chapters with improved transitions
  const narrativeChapters = sortedChapters.map((chapter, index) => {
    // Use different transitions based on position in narrative
    if (index === 0) {
      return `The story begins on ${formatDate(chapter.publishedAt)}. ${chapter.summary}`;
    } else if (index === sortedChapters.length - 1) {
      return `Most recently, on ${formatDate(chapter.publishedAt)}, the story reached its current state. ${
        chapter.summary
      }`;
    } else if (index === 1) {
      return `Following these initial developments, on ${formatDate(chapter.publishedAt)}, the narrative progressed. ${
        chapter.summary
      }`;
    } else {
      // Use varying transitions for middle chapters
      const transitions = [
        `Then, on ${formatDate(chapter.publishedAt)}, the situation evolved further.`,
        `By ${formatDate(chapter.publishedAt)}, new developments had emerged.`,
        `As ${formatDate(chapter.publishedAt)} approached, the story took another turn.`,
      ];
      const transition = transitions[index % transitions.length];
      return `${transition} ${chapter.summary}`;
    }
  });

  // Add conclusion based on sentiment trend and ongoing status
  let conclusion;
  if (sortedChapters.length > 2) {
    if (sentimentTrend === "improving") {
      conclusion =
        "The trajectory suggests continued improvement, with positive developments becoming more prominent over time. Future reporting will likely focus on the sustainability of these positive trends.";
    } else if (sentimentTrend === "worsening") {
      conclusion =
        "The situation appears to be deteriorating, with increasing challenges emerging in recent coverage. Observers will be watching closely for any signs of stabilization or further decline.";
    } else if (sentimentTrend === "positive") {
      conclusion =
        "The outlook remains positive based on current reporting and trends. Stakeholders appear optimistic about continued favorable developments in this story.";
    } else if (sentimentTrend === "negative") {
      conclusion =
        "Concerns persist given the negative trend in coverage and developments. Analysts are closely monitoring for any potential resolution to the challenges highlighted in this narrative.";
    } else {
      conclusion =
        "This situation continues to evolve, with multiple factors at play. Future developments remain uncertain, though the narrative may shift as new information emerges.";
    }
  } else {
    conclusion = "This is an emerging story that will likely develop further in the coming days and weeks.";
  }

  // Build the full narrative with improved structure
  return `${narrativeIntro}\n\n${narrativeChapters.join("\n\n")}\n\n${conclusion}`;
}

// Validate a date and return a safe default if invalid
function validateDate(date) {
  if (!date) return new Date();

  const parsedDate = new Date(date);

  // Check if the date is valid and not in the future
  if (isNaN(parsedDate.getTime())) {
    console.warn(`Invalid date detected: ${date}, using current date instead`);
    return new Date();
  }

  const now = new Date();
  return parsedDate > now ? now : parsedDate;
}

// Get date range text
function getDateRangeText(articles) {
  const dates = articles.map((a) =>
    new Date(a.publishedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  );

  // Get unique dates
  const uniqueDates = [...new Set(dates)];

  if (uniqueDates.length === 1) {
    return uniqueDates[0];
  } else {
    return `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`;
  }
}

// Generate story summary
function generateStorySummary(articles, entityName, sentimentTrend) {
  // Build a more sophisticated summary based on entity type, sentiment trend, and article count
  const articleCount = articles.length;
  const earliestDate = new Date(Math.min(...articles.map((a) => a.publishedAt))).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const latestDate = new Date(Math.max(...articles.map((a) => a.publishedAt))).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Get unique sources
  const sourcesSet = new Set(articles.map((a) => a.source?.name).filter(Boolean));
  const sourceCount = sourcesSet.size;

  // Create summary based on sentiment trend
  let trendDescription = "";
  switch (sentimentTrend) {
    case "improving":
      trendDescription = "with coverage showing increasingly positive developments";
      break;
    case "worsening":
      trendDescription = "with coverage indicating deteriorating conditions";
      break;
    case "positive":
      trendDescription = "with generally positive coverage";
      break;
    case "negative":
      trendDescription = "with predominantly negative reporting";
      break;
    default:
      trendDescription = "with varied perspectives";
  }

  return `This evolving story follows ${entityName} from ${earliestDate} to ${latestDate}, drawing from ${articleCount} articles across ${sourceCount} sources ${trendDescription}. Follow the timeline below to understand how events have unfolded.`;
}

// Generate predictions
function generatePredictions(chapters, categories, sentimentTrend) {
  // In a real implementation, this would use ML models trained on news data
  // For now, we'll use a template-based approach enhanced with sentiment and categories

  const predictions = [];

  // Add a sentiment-based prediction
  if (sentimentTrend === "improving") {
    predictions.push({
      content:
        "Based on improving sentiment in recent coverage, we predict continued positive developments in the near term.",
      confidence: 0.7,
      createdAt: new Date(),
    });
  } else if (sentimentTrend === "worsening") {
    predictions.push({
      content:
        "The declining sentiment in recent coverage suggests challenging conditions will likely persist or worsen.",
      confidence: 0.65,
      createdAt: new Date(),
    });
  } else if (sentimentTrend === "positive") {
    predictions.push({
      content: "The consistently positive reporting indicates favorable conditions will likely continue.",
      confidence: 0.75,
      createdAt: new Date(),
    });
  } else if (sentimentTrend === "negative") {
    predictions.push({
      content: "The predominantly negative coverage suggests issues will continue without significant intervention.",
      confidence: 0.7,
      createdAt: new Date(),
    });
  }

  // Add category-specific predictions
  const categorySet = new Set(categories);

  if (categorySet.has("politics")) {
    predictions.push({
      content:
        "Political implications will likely expand in coming weeks, with potential for policy adjustments or official statements.",
      confidence: 0.6,
      createdAt: new Date(),
    });
  }

  if (categorySet.has("technology")) {
    predictions.push({
      content:
        "Technological developments in this area are expected to accelerate, with new announcements likely in the next 2-4 weeks.",
      confidence: 0.65,
      createdAt: new Date(),
    });
  }

  if (categorySet.has("business")) {
    predictions.push({
      content:
        "Market reactions may continue to evolve as new information emerges, with potential impacts on related sectors.",
      confidence: 0.7,
      createdAt: new Date(),
    });
  }

  // Always add a general prediction
  predictions.push({
    content:
      "Additional media coverage will likely emerge as this story develops, potentially revealing new aspects and perspectives.",
    confidence: 0.8,
    createdAt: new Date(),
  });

  // Return 2-3 predictions
  return predictions.slice(0, Math.min(3, predictions.length));
}

// Helper function to group articles by date
function groupArticlesByDate(articles) {
  const groups = {};

  articles.forEach((article) => {
    const dateKey = formatDateForGrouping(article.publishedAt);

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(article);
  });

  return groups;
}

// Format date for grouping (YYYY-MM-DD)
function formatDateForGrouping(date) {
  try {
    const d = new Date(date);

    // Check if date is valid
    if (isNaN(d.getTime())) {
      console.warn(`Invalid date encountered in formatDateForGrouping: ${date}, using current date instead`);
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(
        2,
        "0",
      )}`;
    }

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch (error) {
    console.error(`Error formatting date: ${date}`, error);
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(
      2,
      "0",
    )}`;
  }
}

// Extract keywords from articles
function extractKeywordsFromArticles(articles) {
  // In a real implementation, this would use NLP for keyword extraction
  // For simplicity, use categories and basic entity names
  const keywords = new Set();

  articles.forEach((article) => {
    if (article.categories) {
      article.categories.forEach((category) => keywords.add(category));
    }

    if (article.entities) {
      article.entities.forEach((entity) => {
        if (entity.name && entity.name.length > 3) {
          keywords.add(entity.name.toLowerCase());
        }
      });
    }
  });

  return Array.from(keywords).slice(0, 10); // Limit to 10 keywords
}

// Extract secondary entities
function extractSecondaryEntities(articles, primaryEntityName) {
  // Get other important entities mentioned in the articles
  const entityCounts = {};

  articles.forEach((article) => {
    if (!article.entities) return;

    article.entities.forEach((entity) => {
      // Skip the primary entity
      if (entity.name.toLowerCase() === primaryEntityName.toLowerCase()) return;

      const key = `${entity.type}:${entity.name.toLowerCase()}`;

      if (!entityCounts[key]) {
        entityCounts[key] = {
          name: entity.name,
          type: entity.type,
          count: 0,
        };
      }

      entityCounts[key].count += entity.count || 1;
    });
  });

  // Sort by count and take top 5
  return Object.values(entityCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((entity) => ({
      name: entity.name,
      type: entity.type,
      importance: Math.min(9, Math.floor(entity.count / 2)), // Scale importance, max 9
    }));
}

// Format date for narrative
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Update article references to link back to stories
async function updateArticleStoryReferences(articleIds, storyId) {
  if (!articleIds.length) return;

  try {
    await Article.updateMany({ _id: { $in: articleIds } }, { $addToSet: { storyReferences: storyId } });

    console.log(`Updated ${articleIds.length} articles with story reference ${storyId}`);
  } catch (error) {
    console.error("Error updating article story references:", error);
  }
}

// Update story relevancy scores based on article counts, age, etc.
async function updateStoryRelevancyScores() {
  try {
    // Get all active stories
    const stories = await Story.find({ "timeline.ongoing": true });
    console.log(`Updating relevancy scores for ${stories.length} stories`);

    for (const story of stories) {
      // Calculate factors that influence score
      const articleCount = story.chapters.reduce((sum, chapter) => sum + chapter.articles.length, 0);
      const daysSinceLastUpdate = Math.max(
        1,
        Math.floor((Date.now() - new Date(story.updatedAt)) / (1000 * 60 * 60 * 24)),
      );
      const relatedStoriesCount = story.relatedStories ? story.relatedStories.length : 0;

      // Calculate relevancy score
      // More articles, recent updates, and more related stories increase score
      const score = articleCount * 5 + 100 / daysSinceLastUpdate + relatedStoriesCount * 10 + (story.viewCount || 0);

      // Update the score
      story.relevancyScore = Math.round(score);
      await story.save();
    }
  } catch (error) {
    console.error("Error updating story relevancy scores:", error);
  }
}
