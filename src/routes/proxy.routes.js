const express = require("express");
const router = express.Router();
const axios = require("axios");

// Import controllers
const {
  proxyPixabayRequest,
  getSentimentImage,
  getFallbackImage,
  proxyImage,
} = require("../controllers/proxy.controller");

// Pixabay API proxy
router.get("/pixabay", proxyPixabayRequest);

// Sentiment-based image
router.get("/sentiment-image", getSentimentImage);

// Fallback image for any article
router.get("/fallback-image", getFallbackImage);

// Image proxy to bypass CSP restrictions
router.get("/image", proxyImage);

module.exports = router;
