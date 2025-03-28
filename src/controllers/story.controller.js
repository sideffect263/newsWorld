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
  
  // Get recent articles from the last 48 hours
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 48);
  
  const articles = await Article.find({
    publishedAt: { $gte: cutoffDate }
  })
  .sort({ publishedAt: -1 })
  .select('_id title description content publishedAt source entities categories countries');
  
  // Simple clustering based on entities
  const clusters = {};
  
  // Group articles by primary entity
  articles.forEach(article => {
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
        countries: new Set()
      };
    }
    
    clusters[entityKey].articles.push(article);
    
    if (article.categories) {
      article.categories.forEach(category => {
        clusters[entityKey].categories.add(category);
      });
    }
    
    if (article.countries) {
      article.countries.forEach(country => {
        clusters[entityKey].countries.add(country);
      });
    }
  });
  
  // Filter clusters with too few articles
  const significantClusters = Object.values(clusters).filter(
    cluster => cluster.articles.length >= 3
  );
  
  const results = {
    processed: articles.length,
    clustersFound: Object.keys(clusters).length,
    significantClusters: significantClusters.length,
    storiesCreated: 0,
    storiesUpdated: 0
  };
  
  // For each significant cluster, create or update a story
  for (const cluster of significantClusters) {
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
    
    if (story) {
      // Update existing story
      const articleIds = cluster.articles.map(article => article._id);
      const newArticleIds = articleIds.filter(
        id => !story.chapters.some(chapter => 
          chapter.articles.some(artId => artId.equals(id))
        )
      );
      
      if (newArticleIds.length > 0) {
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
            const chapterTitle = generateChapterTitle(dateKey, articles, entityName);
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
        
        // Update story narrative and predictions
        story.narrative = generateNarrative(story.chapters);
        story.predictions = generatePredictions(story.chapters);
        story.updatedAt = new Date();
        
        // Save the updated story
        await story.save();
        results.storiesUpdated++;
      }
    } else {
      // Create new story
      const dateGroups = groupArticlesByDate(cluster.articles);
      const chapters = [];
      
      for (const [dateKey, articles] of Object.entries(dateGroups)) {
        const chapterTitle = generateChapterTitle(dateKey, articles, entityName);
        
        chapters.push({
          title: chapterTitle,
          summary: generateChapterSummary(articles),
          content: generateChapterContent(articles),
          articles: articles.map(a => a._id),
          publishedAt: articles[0].publishedAt,
          updatedAt: new Date()
        });
      }
      
      // Create the new story
      story = new Story({
        title: storyTitle,
        summary: generateStorySummary(cluster.articles, entityName),
        narrative: generateNarrative(chapters),
        chapters: chapters,
        keywords: extractKeywordsFromArticles(cluster.articles),
        entities: [
          {
            name: entityName,
            type: entityType,
            importance: 10
          },
          ...extractSecondaryEntities(cluster.articles, entityName)
        ],
        categories: Array.from(cluster.categories),
        predictions: generatePredictions(chapters),
        timeline: {
          startDate: cluster.articles[0].publishedAt,
          endDate: cluster.articles[cluster.articles.length - 1].publishedAt,
          ongoing: true
        },
        countries: Array.from(cluster.countries),
        viewCount: 0
      });
      
      await story.save();
      results.storiesCreated++;
    }
  }
  
  return results;
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

// Generate predictions
function generatePredictions(chapters) {
  // In a real implementation, this would use NLP and ML
  // For simplicity, use a template-based approach
  
  // For now, just create one generic prediction
  return [
    {
      content: "This situation will continue to develop over the coming days with more information likely to emerge.",
      confidence: 0.7,
      createdAt: new Date()
    }
  ];
} 