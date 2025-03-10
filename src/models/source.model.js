const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Source URL is required'],
    },
    category: {
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
      ],
      default: 'general',
    },
    language: {
      type: String,
      required: [true, 'Source language is required'],
      minlength: 2,
      maxlength: 2,
    },
    country: {
      type: String,
      required: [true, 'Source country is required'],
      minlength: 2,
      maxlength: 2,
    },
    logoUrl: {
      type: String,
    },
    reliability: {
      type: Number,
      min: 0,
      max: 10,
      default: 5,
    },
    bias: {
      type: Number,
      min: -10, // -10 = far left, 0 = center, 10 = far right
      max: 10,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    fetchMethod: {
      type: String,
      enum: ['api', 'rss', 'scraping'],
      required: [true, 'Fetch method is required'],
    },
    apiDetails: {
      type: {
        type: String,
        enum: ['newsapi', 'mediastack', 'gdelt', 'custom'],
      },
      endpoint: String,
      apiKey: String,
      params: mongoose.Schema.Types.Mixed,
    },
    rssDetails: {
      feedUrl: String,
      articleSelector: String,
      titleSelector: String,
      contentSelector: String,
      imageSelector: String,
    },
    scrapingDetails: {
      targetUrl: String,
      articleSelector: String,
      titleSelector: String,
      contentSelector: String,
      imageSelector: String,
      authorSelector: String,
      dateSelector: String,
      dateFormat: String,
    },
    fetchFrequency: {
      type: Number, // in minutes
      default: 60,
      min: 5,
    },
    lastFetchedAt: {
      type: Date,
      default: null,
    },
    fetchStatus: {
      success: {
        type: Boolean,
        default: true,
      },
      message: String,
      lastErrorAt: Date,
      errorCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
sourceSchema.index({ name: 1 });
sourceSchema.index({ category: 1 });
sourceSchema.index({ country: 1 });
sourceSchema.index({ language: 1 });
sourceSchema.index({ isActive: 1 });
sourceSchema.index({ fetchMethod: 1 });

const Source = mongoose.model('Source', sourceSchema);

module.exports = Source; 