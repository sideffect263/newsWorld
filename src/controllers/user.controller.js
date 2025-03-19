const User = require('../models/user.model');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user preferences
// @route   GET /api/users/preferences
// @access  Public
const getUserPreferences = async (req, res, next) => {
  try {
    const preferences = await User.findById(req.params.id).select('preferences');
    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Public
const updateUserPreferences = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { preferences: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user.preferences
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get saved articles
// @route   GET /api/users/saved-articles
// @access  Public
const getSavedArticles = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('savedArticles');
    res.status(200).json({
      success: true,
      data: user.savedArticles
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get read history
// @route   GET /api/users/read-history
// @access  Public
const getReadHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('readHistory');
    res.status(200).json({
      success: true,
      data: user.readHistory
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUserPreferences,
  updateUserPreferences,
  getSavedArticles,
  getReadHistory
}; 