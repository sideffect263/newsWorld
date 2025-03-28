const Story = require('../models/story.model');
const Article = require('../models/article.model');
const mongoose = require('mongoose');

// Get all stories with pagination
exports.getStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const category = req.query.category ? req.query.category.toLowerCase() : null;
    const keyword = req.query.keyword ? req.query.keyword.toLowerCase() : null;
    const country = req.query.country ? req.query.country.toUpperCase() : null;
    
    // Build filter
    const filter = {};
    if (category) filter.categories = category;
    if (keyword) filter.keywords = keyword;
    if (country) filter.countries = country;
    
    // Execute query
    const stories = await Story.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title summary timeline categories countries viewCount keywords')
      .lean();
    
    const total = await Story.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      results: stories.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: stories,
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching stories',
    });
  }
};

// Get a single story by ID
exports.getStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate({
        path: 'chapters.articles',
        select: 'title description url publishedAt source imageUrl'
      })
      .populate({
        path: 'relatedStories',
        select: 'title summary'
      });
    
    if (!story) {
      return res.status(404).json({
        status: 'fail',
        message: 'Story not found',
      });
    }
    
    // Increment view count
    story.viewCount += 1;
    await story.save();
    
    res.status(200).json({
      status: 'success',
      data: story,
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching story',
    });
  }
};

// Generate new stories or update existing ones based on recent articles
exports.generateStories = async (req, res) => {
  try {
    // This would typically be a background job, but we're exposing an API for testing
    const result = await createOrUpdateStories();
    
    res.status(200).json({
      status: 'success',
      message: 'Story generation process completed',
      data: result
    });
  } catch (error) {
    console.error('Error generating stories:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating stories',
    });
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
    publishedAt: { $gte: cutoffDate }
  })
  .sort({ publishedAt: -1 })
  .select('_id title description content publishedAt source entities categories countries');
  
  // Initialize story tracking
  const results = {
    processed: articles.length,
    clustersFound: 0,
    significantClusters: 0,
    storiesCreated: 0,
    storiesUpdated: 0
  };
  
  if (articles.length === 0) {
    return results;
  }
  
  // Step 1: Apply initial clustering based on entities
  const entityClusters = createEntityClusters(articles);
  results.clustersFound = Object.keys(entityClusters).length;
  
  // Step 2: Apply secondary clustering based on content similarity
  const refinedClusters = refineClustersBySimilarity(entityClusters);
  results.significantClusters = refinedClusters.length;
  
  // Step 3: Create or update stories for each significant cluster
  for (const cluster of refinedClusters) {
    // Process each cluster to create or update a story
    const storyResult = await processCluster(cluster);
    
    if (storyResult.created) {
      results.storiesCreated++;
    } else if (storyResult.updated) {
      results.storiesUpdated++;
    }
  }
  
  return results;
}

// Create initial clusters based on entities
function createEntityClusters(articles) {
  const clusters = {};
  
  // Group articles by primary entity
  articles.forEach(article => {
    if (!article.entities || article.entities.length === 0) return;
    
    // Sort entities by count and get the most prominent ones
    const sortedEntities = [...article.entities].sort((a, b) => b.count - a.count);
    
    // Try to find a meaningful entity to cluster by - use the top 2 entities to improve clustering
    for (let i = 0; i < Math.min(2, sortedEntities.length); i++) {
      const entity = sortedEntities[i];
      if (!entity || entity.name.length < 3) continue;
      
      const entityKey = `${entity.type}:${entity.name.toLowerCase()}`;
      
      if (!clusters[entityKey]) {
        clusters[entityKey] = {
          entity: entity,
          articles: [],
          categories: new Set(),
          countries: new Set(),
          keywords: new Set()
        };
      }
      
      // Only add if not already in the cluster
      if (!clusters[entityKey].articles.some(a => a._id.equals(article._id))) {
        clusters[entityKey].articles.push(article);
        
        // Process categories
        if (article.categories) {
          article.categories.forEach(category => {
            clusters[entityKey].categories.add(category);
          });
        }
        
        // Process countries
        if (article.countries) {
          article.countries.forEach(country => {
            clusters[entityKey].countries.add(country);
          });
        }
        
        // Extract keywords from title and description for better similarity matching
        extractKeywords(article).forEach(kw => {
          clusters[entityKey].keywords.add(kw);
        });
      }
    }
  });
  
  return clusters;
}

// Extract keywords from article title and description
function extractKeywords(article) {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  
  // Remove common stop words and punctuation
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of'];
  
  return text
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3) // Only keep words longer than 3 chars
    .filter(word => !stopWords.includes(word))
    .filter(word => !isNaN(word)) // Filter out numbers
    .slice(0, 20); // Limit to top 20 keywords
}

// Calculate similarity between two sets of keywords
function calculateSimilarity(keywords1, keywords2) {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  // Calculate Jaccard similarity: size of intersection divided by size of union
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Refine clusters by checking content similarity
function refineClustersBySimilarity(entityClusters) {
  const clusterArray = Object.values(entityClusters);
  
  // Filter out clusters with too few articles
  const significantClusters = clusterArray.filter(
    cluster => cluster.articles.length >= 3
  );
  
  // For each cluster, calculate the internal similarity
  significantClusters.forEach(cluster => {
    // Extract all article keywords
    const allKeywords = cluster.articles.map(article => extractKeywords(article));
    
    // Calculate average similarity between articles
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < allKeywords.length; i++) {
      for (let j = i + 1; j < allKeywords.length; j++) {
        totalSimilarity += calculateSimilarity(allKeywords[i], allKeywords[j]);
        comparisons++;
      }
    }
    
    cluster.coherence = comparisons > 0 ? totalSimilarity / comparisons : 0;
  });
  
  // Only keep clusters with reasonable coherence
  return significantClusters
    .filter(cluster => cluster.coherence > 0.1)
    .sort((a, b) => b.articles.length - a.articles.length);
}

// Process a cluster to create or update a story
async function processCluster(cluster) {
  // Sort articles by date
  cluster.articles.sort((a, b) => a.publishedAt - b.publishedAt);
  
  const entityName = cluster.entity.name;
  const entityType = cluster.entity.type;
  
  // Check if a story for this entity already exists
  let story = await Story.findOne({
    'entities.name': entityName,
    'entities.type': entityType,
    'timeline.ongoing': true
  });
  
  // Generate story title based on entity
  const storyTitle = generateStoryTitle(entityName, entityType, 
    Array.from(cluster.categories), cluster.articles);
  
  const result = { created: false, updated: false };
  
  if (story) {
    // Update existing story
    const updateResult = await updateExistingStory(story, cluster);
    result.updated = updateResult;
  } else {
    // Create new story
    const createResult = await createNewStory(cluster, storyTitle);
    result.created = createResult;
  }
  
  return result;
}

// Update an existing story with new articles
async function updateExistingStory(story, cluster) {
  const articleIds = cluster.articles.map(article => article._id);
  const newArticleIds = articleIds.filter(
    id => !story.chapters.some(chapter => 
      chapter.articles.some(artId => artId.equals(id))
    )
  );
  
  if (newArticleIds.length === 0) {
    return false;
  }
  
  // We have new articles to add to the story
  // Group new articles into chapters by date (simplified approach)
  const dateGroups = groupArticlesByDate(
    cluster.articles.filter(article => 
      newArticleIds.some(id => id.equals(article._id))
    )
  );
  
  // Add new chapters or update existing ones
  for (const [dateKey, articles] of Object.entries(dateGroups)) {
    const existingChapter = story.chapters.find(
      chapter => formatDateForGrouping(chapter.publishedAt) === dateKey
    );
    
    if (existingChapter) {
      // Add articles to existing chapter
      existingChapter.articles.push(...articles.map(a => a._id));
      existingChapter.updatedAt = new Date();
    } else {
      // Create new chapter
      const chapterTitle = generateChapterTitle(dateKey, articles, cluster.entity.name);
      const chapterSummary = generateChapterSummary(articles);
      
      story.chapters.push({
        title: chapterTitle,
        summary: chapterSummary,
        content: generateChapterContent(articles),
        articles: articles.map(a => a._id),
        publishedAt: articles[0].publishedAt,
        updatedAt: new Date()
      });
    }
  }
  
  // Update story narrative
  story.narrative = generateNarrative(story.chapters);
  
  // Update predictions with improved algorithm
  story.predictions = generateImprovedPredictions(story.chapters, cluster);
  
  // Update related keywords
  const newKeywords = extractKeywordsFromArticles(cluster.articles);
  story.keywords = Array.from(new Set([...story.keywords, ...newKeywords])).slice(0, 15);
  
  // Update timeline
  story.timeline.endDate = new Date(Math.max(
    ...cluster.articles.map(a => a.publishedAt),
    story.timeline.endDate
  ));
  
  story.updatedAt = new Date();
  
  // Save the updated story
  await story.save();
  return true;
}

// Create a new story from a cluster
async function createNewStory(cluster, storyTitle) {
  const dateGroups = groupArticlesByDate(cluster.articles);
  const chapters = [];
  
  for (const [dateKey, articles] of Object.entries(dateGroups)) {
    const chapterTitle = generateChapterTitle(dateKey, articles, cluster.entity.name);
    
    chapters.push({
      title: chapterTitle,
      summary: generateChapterSummary(articles),
      content: generateChapterContent(articles),
      articles: articles.map(a => a._id),
      publishedAt: articles[0].publishedAt,
      updatedAt: new Date()
    });
  }
  
  // Create the new story with improved narrative and predictions
  const story = new Story({
    title: storyTitle,
    summary: generateStorySummary(cluster.articles, cluster.entity.name),
    narrative: generateNarrative(chapters),
    chapters: chapters,
    keywords: extractKeywordsFromArticles(cluster.articles),
    entities: [
      {
        name: cluster.entity.name,
        type: cluster.entity.type,
        importance: 10
      },
      ...extractSecondaryEntities(cluster.articles, cluster.entity.name)
    ],
    categories: Array.from(cluster.categories),
    predictions: generateImprovedPredictions(chapters, cluster),
    timeline: {
      startDate: cluster.articles[0].publishedAt,
      endDate: cluster.articles[cluster.articles.length - 1].publishedAt,
      ongoing: true
    },
    countries: Array.from(cluster.countries),
    viewCount: 0
  });
  
  await story.save();
  
  // Find and link related stories
  await linkRelatedStories(story);
  
  return true;
}

// Link related stories based on entity and keyword overlap
async function linkRelatedStories(story) {
  // Find stories that share entities or keywords
  const relatedStories = await Story.find({
    _id: { $ne: story._id },
    $or: [
      { 'entities.name': { $in: story.entities.map(e => e.name) } },
      { keywords: { $in: story.keywords } }
    ]
  })
  .select('_id title summary keywords entities')
  .limit(5);
  
  if (relatedStories.length > 0) {
    // Calculate similarity scores
    const similarStories = relatedStories.map(relatedStory => {
      // Count overlapping entities
      const entityOverlap = story.entities.filter(e1 => 
        relatedStory.entities.some(e2 => e2.name.toLowerCase() === e1.name.toLowerCase())
      ).length;
      
      // Count overlapping keywords
      const keywordOverlap = story.keywords.filter(k => 
        relatedStory.keywords.includes(k)
      ).length;
      
      return {
        story: relatedStory,
        score: (entityOverlap * 2) + keywordOverlap // Weight entities more heavily
      };
    });
    
    // Sort by similarity score and take top 3
    const topRelated = similarStories
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.story._id);
    
    // Update the story with related stories
    if (topRelated.length > 0) {
      story.relatedStories = topRelated;
      await story.save();
      
      // Also update the related stories to point back to this story
      for (const relatedId of topRelated) {
        await Story.findByIdAndUpdate(
          relatedId,
          { $addToSet: { relatedStories: story._id } }
        );
      }
    }
  }
}

// Generate improved predictions based on trend analysis
function generateImprovedPredictions(chapters, cluster) {
  const predictions = [];
  
  // Get the most recent articles to analyze trends
  const recentArticles = cluster.articles
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 5);
  
  // Look for common themes in recent articles
  const recentKeywords = extractKeywordsFromArticles(recentArticles);
  const entityNames = cluster.articles.flatMap(article => 
    article.entities ? article.entities.map(e => e.name.toLowerCase()) : []
  );
  
  // Count entity mentions to identify key players
  const entityCounts = {};
  entityNames.forEach(name => {
    entityCounts[name] = (entityCounts[name] || 0) + 1;
  });
  
  // Get top entities
  const topEntities = Object.entries(entityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  
  // Basic templates for predictions based on story type
  const categories = Array.from(cluster.categories);
  
  // Technology story predictions
  if (categories.includes('technology')) {
    predictions.push({
      content: `Development around ${cluster.entity.name} will likely continue to evolve rapidly, with new technical advancements expected in the coming weeks.`,
      confidence: 0.75,
      createdAt: new Date()
    });
  }
  
  // Political story predictions
  if (categories.includes('politics')) {
    predictions.push({
      content: `Political implications related to ${cluster.entity.name} will continue to unfold, potentially involving ${topEntities[0] || 'key stakeholders'} in upcoming developments.`,
      confidence: 0.65,
      createdAt: new Date()
    });
  }
  
  // Business story predictions
  if (categories.includes('business')) {
    predictions.push({
      content: `Market reactions to these developments around ${cluster.entity.name} will be closely watched, with potential economic impacts in related sectors.`,
      confidence: 0.7,
      createdAt: new Date()
    });
  }
  
  // Default prediction if none of the above categories match
  if (predictions.length === 0) {
    predictions.push({
      content: `This situation involving ${cluster.entity.name} will continue to develop, with ${topEntities[0] || 'key participants'} likely to play an important role in upcoming events.`,
      confidence: 0.6,
      createdAt: new Date()
    });
  }
  
  // Add a second prediction about information availability
  predictions.push({
    content: "More information will emerge as sources continue to report on this evolving story, potentially changing the current understanding of events.",
    confidence: 0.8,
    createdAt: new Date()
  });
  
  return predictions;
}

// Helper function to group articles by date
function groupArticlesByDate(articles) {
  const groups = {};
  
  articles.forEach(article => {
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
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Generate a title for a story
function generateStoryTitle(entityName, entityType, categories, articles) {
  // In a real implementation, this would use NLP to generate a meaningful title
  // For now, use a template-based approach
  
  const templates = [
    `The ${entityName} Story: Developing News`,
    `${entityName}: A Developing Narrative`,
    `Tracking Developments: ${entityName}`,
    `The Evolution of ${entityName} News`
  ];
  
  // Use a random template for now
  return templates[Math.floor(Math.random() * templates.length)];
}

// Generate a chapter title
function generateChapterTitle(dateKey, articles, entityName) {
  // In a real implementation, this would use NLP
  // For simplicity, use the date and entity name
  const date = new Date(dateKey);
  const formattedDate = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${formattedDate}: ${entityName} Developments`;
}

// Generate a chapter summary
function generateChapterSummary(articles) {
  // In a real implementation, this would use NLP to summarize the articles
  // For simplicity, use the description of the first article
  if (articles.length === 0) return "";
  
  return articles[0].description || articles[0].title;
}

// Generate chapter content
function generateChapterContent(articles) {
  // In a real implementation, this would use NLP to generate coherent content
  // For simplicity, concatenate article descriptions
  return articles
    .map(article => {
      const source = article.source?.name || 'Unknown Source';
      return `According to ${source}, ${article.description || article.title}`;
    })
    .join("\n\n");
}

// Generate story summary
function generateStorySummary(articles, entityName) {
  // In a real implementation, this would use NLP
  // For simplicity, use a template
  const articleCount = articles.length;
  const earliestDate = new Date(Math.min(...articles.map(a => a.publishedAt))).toLocaleDateString();
  const latestDate = new Date(Math.max(...articles.map(a => a.publishedAt))).toLocaleDateString();
  
  return `This story follows developments related to ${entityName} from ${earliestDate} to ${latestDate}, based on ${articleCount} news articles.`;
}

// Generate narrative content
function generateNarrative(chapters) {
  // In a real implementation, this would use advanced NLP
  // For simplicity, concatenate chapter summaries with transitions
  return chapters
    .map((chapter, index) => {
      if (index === 0) {
        return `The story begins on ${formatDate(chapter.publishedAt)}. ${chapter.summary}`;
      } else {
        return `Then, on ${formatDate(chapter.publishedAt)}, the narrative continues. ${chapter.summary}`;
      }
    })
    .join("\n\n");
}

// Format date for narrative
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}

// Extract keywords from articles
function extractKeywordsFromArticles(articles) {
  // In a real implementation, this would use NLP for keyword extraction
  // For simplicity, use categories and basic entity names
  const keywords = new Set();
  
  articles.forEach(article => {
    if (article.categories) {
      article.categories.forEach(category => keywords.add(category));
    }
    
    if (article.entities) {
      article.entities.forEach(entity => {
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
  
  articles.forEach(article => {
    if (!article.entities) return;
    
    article.entities.forEach(entity => {
      // Skip the primary entity
      if (entity.name.toLowerCase() === primaryEntityName.toLowerCase()) return;
      
      const key = `${entity.type}:${entity.name.toLowerCase()}`;
      
      if (!entityCounts[key]) {
        entityCounts[key] = {
          name: entity.name,
          type: entity.type,
          count: 0
        };
      }
      
      entityCounts[key].count += entity.count || 1;
    });
  });
  
  // Sort by count and take top 5
  return Object.values(entityCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(entity => ({
      name: entity.name,
      type: entity.type,
      importance: Math.min(9, Math.floor(entity.count / 2)) // Scale importance, max 9
    }));
} 