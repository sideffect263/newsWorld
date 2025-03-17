const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentiment.controller');

// Public routes
router.get('/', sentimentController.getSentimentAnalysis);
router.get('/stats', sentimentController.getSentimentStats);
router.get('/categories', sentimentController.getSentimentByCategory);

// Protected routes (admin only)
router.post('/update',  sentimentController.updateSentiment);

module.exports = router; 