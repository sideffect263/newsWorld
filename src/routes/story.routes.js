const express = require('express');
const router = express.Router();
const storyController = require('../controllers/story.controller');

// Get all stories with pagination and filtering
router.get('/', storyController.getStories);

// Get a single story by ID
router.get('/:id', storyController.getStory);

// Generate/update stories - only available to admin in production
// but we're keeping it open for testing in development
router.post('/generate', storyController.generateStories);

module.exports = router; 