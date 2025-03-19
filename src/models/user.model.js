const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    preferences: {
      sources: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Source'
      }],
      categories: [String],
      keywords: [String],
      refreshInterval: {
        type: Number,
        default: 30 // minutes
      }
    },
    savedArticles: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Article'
    }],
    readHistory: [{
      article: {
        type: mongoose.Schema.ObjectId,
        ref: 'Article'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema); 