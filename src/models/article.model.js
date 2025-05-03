const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Article title is required"],
      trim: true,
      maxlength: [500, "Title cannot be more than 500 characters"],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    content: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Article URL is required"],
    },
    imageUrl: {
      type: String,
    },
    imageSource: {
      type: String,
      enum: ["original", "sentiment", "api", "default"],
      default: "original",
    },
    imageTags: {
      type: String,
    },
    publishedAt: {
      type: Date,
      required: [true, "Published date is required"],
    },
    source: {
      id: {
        type: String,
      },
      name: {
        type: String,
        required: [true, "Source name is required"],
      },
      url: {
        type: String,
      },
    },
    author: {
      type: String,
    },
    categories: [
      {
        type: String,
        enum: [
          "general",
          "business",
          "entertainment",
          "health",
          "science",
          "sports",
          "technology",
          "politics",
          "world",
          "nation",
          "lifestyle",
          "other",
        ],
      },
    ],
    countries: [
      {
        type: String,
        minlength: 2,
        maxlength: 2,
      },
    ],
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
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
    entities: [
      {
        name: String,
        type: {
          type: String,
          enum: ["person", "organization", "location", "city", "country", "event", "other"],
        },
        count: Number,
        coordinates: {
          type: { type: String, enum: ["Point"], default: "Point" },
          coordinates: { type: [Number], index: "2dsphere" },
        },
        geo: {
          lat: Number,
          lng: Number,
        },
        countryCode: String,
        formattedAddress: String,
      },
    ],
    // New field for AI-generated insights
    insights: [
      {
        type: {
          type: String,
          enum: [
            "stock_prediction",
            "market_trend",
            "political_impact",
            "social_impact",
            "technology_impact",
            "legal_consequence",
            "economic_impact",
            "financial_impact",
            "environmental_impact",
            "health_impact",
            "regulatory_impact",
            "other",
          ],
        },
        entity: String,
        prediction: String,
        confidence: {
          type: Number,
          min: 0,
          max: 1,
        },
        reasoning: String,
        generatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    isBreakingNews: {
      type: Boolean,
      default: false,
    },
    relatedArticles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Article",
      },
    ],
    storyReferences: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for faster queries
articleSchema.index({ publishedAt: -1 });
articleSchema.index({ url: 1 }, { unique: true });
articleSchema.index({ categories: 1 });
articleSchema.index({ countries: 1 });
articleSchema.index({ "source.name": 1 });
articleSchema.index({ "entities.name": 1, "entities.type": 1 });
articleSchema.index({ "entities.coordinates.coordinates": "2dsphere" }); // Updated geospatial index for GeoJSON format
articleSchema.index({ relatedArticles: 1 });
articleSchema.index({ storyReferences: 1 });

// Virtual for article age
articleSchema.virtual("age").get(function () {
  return Math.floor((Date.now() - this.publishedAt) / (1000 * 60 * 60));
});

// Pre-save hook to ensure categories are lowercase and clean entities types
articleSchema.pre("save", function (next) {
  // Process categories
  if (this.categories && this.categories.length > 0) {
    this.categories = this.categories
      .filter((category) => typeof category === "string")
      .map((category) => category.toLowerCase());
  }

  // Ensure valid entity types
  if (this.entities && this.entities.length > 0) {
    this.entities = this.entities.map((entity) => {
      // Keep city as a valid type now
      if (
        entity.type &&
        !["person", "organization", "location", "city", "country", "event", "other"].includes(entity.type)
      ) {
        entity.type = "other";
      }

      // Validate GeoJSON format - ensure coordinates are valid for Point type
      if (entity.coordinates) {
        if (
          entity.coordinates.type === "Point" &&
          (!entity.coordinates.coordinates ||
            !Array.isArray(entity.coordinates.coordinates) ||
            entity.coordinates.coordinates.length !== 2)
        ) {
          // Remove invalid coordinates to prevent MongoDB errors
          delete entity.coordinates;
        }
      }

      return entity;
    });
  }

  // Map unknown insight types to valid values
  if (this.insights && this.insights.length > 0) {
    const validTypes = [
      "stock_prediction",
      "market_trend",
      "political_impact",
      "social_impact",
      "technology_impact",
      "legal_consequence",
      "economic_impact",
      "financial_impact",
      "environmental_impact",
      "health_impact",
      "regulatory_impact",
      "other",
    ];

    // Mapping of common unknown types to our supported types
    const typeMapping = {
      economic: "economic_impact",
      economy: "economic_impact",
      financial: "financial_impact",
      finance: "financial_impact",
      money: "financial_impact",
      investment: "financial_impact",
      market: "market_trend",
      stock: "stock_prediction",
      shares: "stock_prediction",
      political: "political_impact",
      policy: "political_impact",
      government: "political_impact",
      social: "social_impact",
      society: "social_impact",
      community: "social_impact",
      technology: "technology_impact",
      tech: "technology_impact",
      innovation: "technology_impact",
      legal: "legal_consequence",
      law: "legal_consequence",
      regulation: "legal_consequence",
      environment: "environmental_impact",
      environmental: "environmental_impact",
      climate: "environmental_impact",
      health: "health_impact",
      healthcare: "health_impact",
      medical: "health_impact",
      regulatory: "regulatory_impact",
      regulation: "regulatory_impact",
      compliance: "regulatory_impact",
    };

    this.insights.forEach((insight) => {
      if (insight.type && !validTypes.includes(insight.type)) {
        console.log(`Mapping unknown insight type: ${insight.type}`);

        // Try to map based on our mapping table
        const lowerType = insight.type.toLowerCase();

        // Check for exact matches in our mapping
        if (typeMapping[lowerType]) {
          insight.type = typeMapping[lowerType];
        }
        // Check for partial matches by searching within the type string
        else {
          let mapped = false;
          for (const [key, value] of Object.entries(typeMapping)) {
            if (lowerType.includes(key)) {
              insight.type = value;
              mapped = true;
              break;
            }
          }

          // Default to "other" if no mapping found
          if (!mapped) {
            console.log(`No mapping found for insight type: ${insight.type}, defaulting to "other"`);
            insight.type = "other";
          }
        }
      }
    });
  }

  // Generate slug from title if it doesn't exist
  if (this.title && (!this.slug || this.isModified("title"))) {
    // Create a URL-friendly version of the title
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .substring(0, 100); // Limit length

    // Append part of the ID to ensure uniqueness
    if (this._id) {
      this.slug = `${this.slug}-${this._id.toString().slice(-6)}`;
    }
  }

  next();
});

const Article = mongoose.model("Article", articleSchema);

module.exports = Article;
