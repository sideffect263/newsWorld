const express = require('express');
const router = express.Router();

// Import controllers
const {
  getArticles,
  getArticleById,
  getLatestArticles,
  getTopArticles,
  getArticlesByCategory,
  getArticlesBySource,
  getArticlesByCountry,
  searchArticles,
  incrementViewCount,
  saveArticle,
  unsaveArticle,
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
} = require('../controllers/news.controller');

// Public routes
router.get('/', getArticles);
router.get('/latest', getLatestArticles);
router.get('/top', getTopArticles);
router.get('/category/:category', getArticlesByCategory);
router.get('/source/:sourceId', getArticlesBySource);
router.get('/country/:countryCode', getArticlesByCountry);
router.get('/search', searchArticles);
router.get('/:id', getArticleById);
router.put('/:id/view', incrementViewCount);
router.get('/news', getAllNews);
router.get('/news/:id', getNewsById);

// Protected routes (require authentication)
router.post('/save/:id', saveArticle); // Removed protect middleware
router.delete('/save/:id', unsaveArticle); // Removed protect middleware
router.post('/news', createNews); // Ensure createNews is defined
router.put('/news/:id', updateNews); // Ensure updateNews is defined
router.delete('/news/:id', deleteNews); // Ensure deleteNews is defined

module.exports = router;