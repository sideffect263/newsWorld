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
  getSchedulerStatusPage,
} = require('../controllers/status.controller');

// Public routes
router.get('/', getStatusPage);
router.get('/scheduler', getSchedulerStatusPage);
router.get('/data', getStatusData);
router.get('/sources', getSourcesStatus);
router.get('/articles', getArticlesStats);

// API routes for managing news fetching
router.post('/fetch', triggerManualFetch);
router.put('/schedule', updateSchedule);

module.exports = router;