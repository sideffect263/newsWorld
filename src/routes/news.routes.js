const express = require("express");
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
  getRelatedArticles,
  getArticleInsights,
  generateInsights,
  trackViewedRelatedArticles,
} = require("../controllers/news.controller");

// Public routes
router.get("/", getArticles);
router.get("/latest", getLatestArticles);
router.get("/top", getTopArticles);
router.get("/category/:category", getArticlesByCategory);
router.get("/country/:countryCode", getArticlesByCountry);
router.get("/source/:sourceId", getArticlesBySource);
router.get("/search", searchArticles);
router.get("/related", getRelatedArticles);

// Insights routes
router.get("/:id/insights", getArticleInsights);
router.post("/batch-insights", generateInsights); // Admin route for batch processing

router.get("/:id", getArticleById);
router.post("/:id/view", incrementViewCount);

// Add route for tracking viewed related articles
router.post("/:id/viewed-related", trackViewedRelatedArticles);

// Admin routes for generating insights
router.post("/insights/:id/generate", generateInsights);

module.exports = router;
