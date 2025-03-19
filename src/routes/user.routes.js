const express = require('express');
const router = express.Router();

// Import controllers
const {
  getUserPreferences,
  updateUserPreferences,
  getSavedArticles,
  getReadHistory,
} = require('../controllers/user.controller');

// Routes
router.get('/preferences', getUserPreferences);
router.put('/preferences', updateUserPreferences);
router.get('/saved-articles', getSavedArticles);
router.get('/read-history', getReadHistory);

module.exports = router;