const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Story title is required'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      trim: true,
      maxlength: [1000, 'Summary cannot be more than 1000 characters'],
    },
    narrative: {
      type: String,
      required: [true, 'Narrative content is required'],
      trim: true,
    },
    chapters: [{
      title: {
        type: String,
        required: true
      },
      summary: String,
      content: String,
      articles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
      }],
      publishedAt: Date,
      updatedAt: Date
    }],
    keywords: [{
      type: String,
      index: true
    }],
    entities: [{
      name: String,
      type: {
        type: String,
        enum: ['person', 'organization', 'location', 'event', 'other'],
      },
      importance: {
        type: Number,
        min: 0,
        max: 10,
        default: 5
      }
    }],
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
    predictions: [{
      content: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    timeline: {
      startDate: Date,
      endDate: Date,
      ongoing: {
        type: Boolean,
        default: true
      }
    },
    countries: [{
      type: String,
      minlength: 2,
      maxlength: 2,
    }],
    viewCount: {
      type: Number,
      default: 0,
    },
    relatedStories: [{
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
storySchema.index({ createdAt: -1 });
storySchema.index({ updatedAt: -1 });
storySchema.index({ categories: 1 });
storySchema.index({ keywords: 1 });
storySchema.index({ countries: 1 });
storySchema.index({ 'timeline.startDate': 1 });
storySchema.index({ 'entities.name': 1, 'entities.type': 1 });

// Calculate article count
storySchema.virtual('articleCount').get(function() {
  return this.chapters.reduce((count, chapter) => count + chapter.articles.length, 0);
});

// Pre-save hook to ensure categories are lowercase
storySchema.pre('save', function(next) {
  if (this.categories && this.categories.length > 0) {
    this.categories = this.categories
      .filter(category => typeof category === 'string')
      .map(category => category.toLowerCase());
  }
  
  if (this.keywords && this.keywords.length > 0) {
    this.keywords = this.keywords
      .filter(keyword => typeof keyword === 'string')
      .map(keyword => keyword.toLowerCase());
  }
  
  // Update timeline dates
  if (this.chapters && this.chapters.length > 0) {
    const dates = this.chapters
      .filter(chapter => chapter.publishedAt)
      .map(chapter => chapter.publishedAt);
    
    if (dates.length > 0) {
      this.timeline.startDate = new Date(Math.min(...dates));
      this.timeline.endDate = new Date(Math.max(...dates));
    }
  }
  
  next();
});

const Story = mongoose.model('Story', storySchema);

module.exports = Story; 