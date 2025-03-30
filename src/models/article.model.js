const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      maxlength: [500, 'Title cannot be more than 500 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    content: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Article URL is required'],
    },
    imageUrl: {
      type: String,
    },
    publishedAt: {
      type: Date,
      required: [true, 'Published date is required'],
    },
    source: {
      id: {
        type: String,
      },
      name: {
        type: String,
        required: [true, 'Source name is required'],
      },
      url: {
        type: String,
      },
    },
    author: {
      type: String,
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
    countries: [{
      type: String,
      minlength: 2,
      maxlength: 2,
    }],
    language: {
      type: String,
      minlength: 2,
      maxlength: 2,
    },
    sentiment: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },
    sentimentAssessment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    entities: [{
      name: String,
      type: {
        type: String,
        enum: ['person', 'organization', 'location', 'event', 'other'],
      },
      count: Number,
    }],
    viewCount: {
      type: Number,
      default: 0,
    },
    isBreakingNews: {
      type: Boolean,
      default: false,
    },
    relatedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    }],
    storyReferences: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story'
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
articleSchema.index({ publishedAt: -1 });
articleSchema.index({ url: 1 }, { unique: true });
articleSchema.index({ categories: 1 });
articleSchema.index({ countries: 1 });
articleSchema.index({ 'source.name': 1 });
articleSchema.index({ 'entities.name': 1, 'entities.type': 1 });
articleSchema.index({ relatedArticles: 1 });
articleSchema.index({ storyReferences: 1 });

// Virtual for article age
articleSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.publishedAt) / (1000 * 60 * 60));
});

// Pre-save hook to ensure categories are lowercase and clean entities types
articleSchema.pre('save', function(next) {
  // Process categories
  if (this.categories && this.categories.length > 0) {
    this.categories = this.categories
      .filter(category => typeof category === 'string')
      .map(category => category.toLowerCase());
  }
  
  // Ensure valid entity types
  if (this.entities && this.entities.length > 0) {
    this.entities = this.entities.map(entity => {
      // Convert 'city' to 'location'
      if (entity.type === 'city') {
        entity.type = 'location';
      }
      return entity;
    });
  }
  
  next();
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article; 