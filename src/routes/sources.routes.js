const express = require('express');
const router = express.Router();
const path = require('path');

// Serve static files
router.use('/scripts', express.static(path.join(__dirname, '../public/scripts')));

// Import controllers (to be created)
const {
  getSources,
  getSourceById,
  getSourcesByCategory,
  getSourcesByCountry,
  getSourcesByLanguage,
  createSource,
  updateSource,
  deleteSource,
  testSourceFetch,
} = require('../controllers/sources.controller');

// Public routes
router.get('/', getSources);
router.get('/category/:category', getSourcesByCategory);
router.get('/country/:countryCode', getSourcesByCountry);
router.get('/language/:languageCode', getSourcesByLanguage);
router.get('/:id', getSourceById);

// API routes for managing sources
router.post('/', createSource);
router.put('/:id', updateSource);
router.delete('/:id', deleteSource);
router.post('/:id/test', testSourceFetch);

module.exports = router;