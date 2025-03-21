const Source = require('../models/source.model');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get sources
// @route   GET /api/sources
// @access  Public
const getSources = async (req, res, next) => {
  try {
    // Get all sources without filtering by isPublic
    const sources = await Source.find();

    res.status(200).json({
      success: true,
      count: sources.length,
      data: sources
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new source
// @route   POST /api/sources
// @access  Public (was Private)
const createSource = async (req, res, next) => {
  try {
    // Create source without attaching to a user
    const source = await Source.create(req.body);

    res.status(201).json({
      success: true,
      data: source
    });
  } catch (err) {
    next(err);
  }
};

// Subscription functions removed as they depend on user authentication

module.exports = {
  getSources,
  createSource
};
