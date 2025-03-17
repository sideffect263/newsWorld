const mongoose = require('mongoose');

const trendSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: [true, 'Keyword is required'],
      trim: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ['keyword', 'person', 'organization', 'location', 'event', 'category', 'other'],
      default: 'keyword'
    },
    count: {
      type: Number,
      default: 1
    },
    score: {
      type: Number,
      default: 0
    },
    categories: [{
      type: String,
      enum: [
        'general',
        'business',
        'entertainment',
        'health',
        'science',
        'sports',
        'technology',
        'politics',
        'world',
        'nation',
        'lifestyle',
        'other'
      ],
    }],
    sources: [{
      id: String,
      name: String,
      count: Number
    }],
    countries: [{
      code: {
        type: String,
        minlength: 2,
        maxlength: 2
      },
      count: Number
    }],
    articles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    }],
    firstSeenAt: {
      type: Date,
      default: Date.now
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    timeframe: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
trendSchema.index({ keyword: 1, timeframe: 1 });
trendSchema.index({ entityType: 1, count: -1 });
trendSchema.index({ categories: 1, count: -1 });
trendSchema.index({ timeframe: 1, count: -1 });
trendSchema.index({ 'countries.code': 1, count: -1 });
trendSchema.index({ lastSeenAt: -1 });

const Trend = mongoose.model('Trend', trendSchema);

module.exports = Trend; 