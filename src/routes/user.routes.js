const express = require('express');
const router = express.Router();

// Import controllers (to be created)
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  getUserPreferences,
  updateUserPreferences,
  getSavedArticles,
  getReadHistory,
} = require('../controllers/user.controller');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Protected routes (require authentication)
router.get('/me', getMe); // Removed protect middleware
router.put('/details', updateDetails); // Removed protect middleware
router.put('/password', updatePassword); // Removed protect middleware
router.get('/logout', logout); // Removed protect middleware
router.get('/preferences', getUserPreferences); // Removed protect middleware
router.put('/preferences', updateUserPreferences); // Removed protect middleware
router.get('/saved-articles', getSavedArticles); // Removed protect middleware
router.get('/read-history', getReadHistory); // Removed protect middleware

module.exports = router;