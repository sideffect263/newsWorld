/**
 * Image Service for fetching article images based on sentiment and category
 */

// Map sentiment scores to category numbers
const getSentimentCategory = (sentiment) => {
  if (!sentiment && sentiment !== 0) return 1;
  
  if (sentiment > 0.5) return 2;  // Very positive
  if (sentiment > 0.2) return 3;  // Positive
  if (sentiment > -0.2) return 4; // Neutral
  if (sentiment > -0.5) return 5; // Negative
  return 6;                       // Very negative
};

// Map categories to a numeric category ID
const getCategoryId = (category) => {
  const categoryMap = {
    'politics': 10,
    'business': 20,
    'technology': 30,
    'health': 40,
    'science': 50, 
    'sports': 60,
    'entertainment': 70,
    'world': 80,
    'environment': 90,
    'education': 100
  };
  
  return categoryMap[category?.toLowerCase()] || 0;
};

/**
 * Get an image URL for an article based on its properties
 * Uses Picsum Photos which is reliable and free
 * 
 * @param {Object} article - The article object
 * @param {number} width - Desired image width
 * @param {number} height - Desired image height
 * @returns {string} - URL to the image
 */
export const getArticleImage = (article, width = 600, height = 400) => {
  // If article already has an image, use it
  if (article?.imageUrl) return article.imageUrl;
  
  // Handle null/undefined article
  if (!article) {
    return `https://picsum.photos/seed/default/${width}/${height}`;
  }
  
  // Generate a deterministic but "random-looking" ID from article properties
  let seed;
  
  if (article._id) {
    // If we have an ID, use it as the base for our seed
    seed = typeof article._id === 'string' 
      ? article._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) 
      : Number(article._id);
  } else if (article.title) {
    // If no ID but we have a title, use that
    seed = article.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  } else {
    // Fallback to a timestamp-based random number
    seed = Date.now() % 1000;
  }
  
  // Ensure seed is a positive integer and reasonably sized
  seed = Math.abs(seed % 1000) + 1;
  
  // Add sentiment category (1-6) to the seed (multiply by 1000 to ensure unique numbers)
  const sentimentCategory = getSentimentCategory(article.sentiment || article.sentimentScore);
  seed += sentimentCategory * 1000;
  
  // Add category ID to the seed if available (multiply by 10000 to ensure unique numbers)
  const category = article.category || (Array.isArray(article.categories) && article.categories[0]);
  if (category) {
    const categoryId = getCategoryId(category);
    seed += categoryId * 10000;
  }
  
  // Use Picsum Photos with seed for reliable, deterministic images
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
};

/**
 * Get a fallback image based on sentiment
 * 
 * @param {number} sentiment - Sentiment score (-1 to 1)
 * @returns {string} - URL to a fallback image
 */
export const getFallbackImage = (sentiment = 0) => {
  const sentimentCategory = getSentimentCategory(sentiment);
  const seed = 9000 + sentimentCategory; // Use 9000+ range for fallbacks
  
  return `https://picsum.photos/seed/${seed}/800/600`;
};

/**
 * Get a special hero image for the homepage
 * Uses a set of high-quality image seeds that look good as hero images
 * 
 * @returns {string} - URL to a hero image
 */
export const getHeroImage = () => {
  // These seed numbers were manually selected to produce good hero images
  const heroSeeds = [42, 237, 433, 823, 1024, 1042]; 
  
  // Pick one based on the day of the month to change daily but stay consistent within a day
  const day = new Date().getDate();
  const seedIndex = day % heroSeeds.length;
  const seed = heroSeeds[seedIndex];
  
  return `https://picsum.photos/seed/${seed}/1200/800`;
}; 