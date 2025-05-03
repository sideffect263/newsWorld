const express = require("express");
const router = express.Router();
const sentimentController = require("../controllers/sentiment.controller");

// Public routes
router.get("/", sentimentController.getSentimentAnalysis);
router.get("/summary", sentimentController.getSentimentSummary);
router.get("/stats", sentimentController.getSentimentStats);
router.get("/categories", sentimentController.getSentimentByCategory);

// API route for sentiment updates
router.post("/update", sentimentController.updateSentiment);

module.exports = router;
