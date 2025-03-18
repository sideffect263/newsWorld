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
  getRelatedArticles
} = require('../controllers/news.controller');

// Public routes
router.get('/', getArticles);
router.get('/latest', getLatestArticles);
router.get('/top', getTopArticles);
router.get('/category/:category', getArticlesByCategory);
router.get('/country/:countryCode', getArticlesByCountry);
router.get('/source/:sourceId', getArticlesBySource);
router.get('/search', searchArticles);
router.get('/related', getRelatedArticles);

router.get('/:id', getArticleById);
router.put('/:id/view', incrementViewCount);

// Private routes - authentication temporarily disabled
router.post('/save/:id', saveArticle);
router.delete('/save/:id', unsaveArticle);

module.exports = router;