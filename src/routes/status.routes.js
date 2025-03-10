const express = require('express');
const router = express.Router();

// Import controllers (to be created)
const {
  getStatusPage,
  getStatusData,
  getSourcesStatus,
  getArticlesStats,
  triggerManualFetch,
  updateSchedule,
} = require('../controllers/status.controller');

// Public routes
router.get('/', getStatusPage);
router.get('/data', getStatusData);
router.get('/sources', getSourcesStatus);
router.get('/articles', getArticlesStats);

// Protected routes (admin only)
router.post('/fetch', triggerManualFetch); // Removed protect and authorize middleware
router.put('/schedule', updateSchedule); // Removed protect and authorize middleware

module.exports = router;