const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password in queries
    },
    role: {
      type: String,
      enum: ['user', 'publisher', 'admin'],
      default: 'user',
    },
    preferences: {
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
        ],
      }],
      sources: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Source',
      }],
      countries: [{
        type: String,
        minlength: 2,
        maxlength: 2,
      }],
      languages: [{
        type: String,
        minlength: 2,
        maxlength: 2,
      }],
      refreshInterval: {
        type: Number,
        default: 30, // minutes
        min: 5,
        max: 1440, // 24 hours
      },
    },
    savedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
    }],
    readHistory: [{
      article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes for faster queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User; 