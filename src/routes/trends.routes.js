const express = require('express');
const router = express.Router();
const trendsController = require('../controllers/trends.controller');

// Public routes
router.get('/', trendsController.getTrends);
router.get('/keywords', trendsController.getTrendingKeywords);
router.get('/entities/:type', trendsController.getTrendingEntities);
router.get('/categories', trendsController.getTrendingCategories);
router.get('/locations', trendsController.getTrendingLocations);
router.get('/:id/articles', trendsController.getTrendArticles);

// Protected routes (admin only)
router.post('/analyze',trendsController.triggerTrendAnalysis);

module.exports = router; 