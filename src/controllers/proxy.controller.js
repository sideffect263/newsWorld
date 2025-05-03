const axios = require("axios");

// @desc    Proxy requests to Pixabay API
// @route   GET /api/proxy/pixabay
// @access  Public
exports.proxyPixabayRequest = async (req, res, next) => {
  try {
    const apiKey = process.env.PIXABAY_API;

    // Build the query params from the request
    const params = new URLSearchParams();
    params.append("key", apiKey);

    // Copy all query parameters except apiKey for security
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== "key") {
        params.append(key, value);
      }
    });

    // Set safesearch to true by default if not specified
    if (!req.query.safesearch) {
      params.append("safesearch", "true");
    }

    const url = `https://pixabay.com/api/?${params.toString()}`;

    // Make the request to Pixabay
    const response = await axios.get(url);

    // Return the data
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Pixabay API proxy error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error proxying request to Pixabay",
      error: error.message,
    });
  }
};

// @desc    Get image based on article sentiment
// @route   GET /api/proxy/sentiment-image
// @access  Public
exports.getSentimentImage = async (req, res, next) => {
  try {
    const { sentiment, keywords, articleId } = req.query;

    if (!sentiment) {
      return res.status(400).json({
        success: false,
        message: "Sentiment parameter is required",
      });
    }

    // Determine search terms and colors based on sentiment
    let searchTerms = [];
    let colors = [];

    if (keywords) {
      // Add any provided keywords
      searchTerms = keywords.split(",").map((k) => k.trim());
    }

    // Configure query based on sentiment
    switch (sentiment) {
      case "positive":
        if (searchTerms.length === 0) {
          searchTerms.push("happy", "success", "celebration", "achievement", "growth", "joy");
        }
        colors = ["yellow", "green", "blue", "orange", "teal"];
        break;
      case "negative":
        if (searchTerms.length === 0) {
          searchTerms.push("sad", "problem", "challenge", "difficulty", "concern", "issue");
        }
        colors = ["blue", "gray", "black", "brown", "purple"];
        break;
      case "neutral":
      default:
        if (searchTerms.length === 0) {
          searchTerms.push("abstract", "neutral", "balance", "perspective", "overview", "analysis");
        }
        colors = ["white", "gray", "blue", "beige", "silver"];
        break;
    }

    // Pick a random search term and color
    // Use articleId (if provided) to create consistent but unique selection for each article
    let searchTermIndex = 0;
    let colorIndex = 0;

    if (articleId) {
      // Use the article ID to derive a consistent but unique index for this article
      const hashCode = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      };

      const idHash = hashCode(articleId);
      searchTermIndex = idHash % searchTerms.length;
      colorIndex = (idHash + 1) % colors.length; // +1 to ensure different from searchTermIndex
    } else {
      // Fallback to random if no article ID
      searchTermIndex = Math.floor(Math.random() * searchTerms.length);
      colorIndex = Math.floor(Math.random() * colors.length);
    }

    const searchTerm = searchTerms[searchTermIndex];
    const color = colors[colorIndex];

    // Add order parameter to get different results each time
    const orderOptions = ["popular", "latest"];
    const order = orderOptions[Math.floor(Math.random() * orderOptions.length)];

    // Build the query params
    const apiKey = process.env.PIXABAY_API;
    const params = new URLSearchParams();
    params.append("key", apiKey);
    params.append("q", searchTerm);
    params.append("safesearch", "true");
    params.append("colors", color);
    params.append("per_page", "5"); // Increased from 3 to 5 for more variety
    params.append("order", order);

    // Add a page parameter to increase variety (0-5)
    const page = Math.floor(Math.random() * 5) + 1;
    params.append("page", page.toString());

    const url = `https://pixabay.com/api/?${params.toString()}`;

    // Make the request to Pixabay
    const response = await axios.get(url);

    // If no images found, try without color filter
    if (response.data.hits.length === 0) {
      params.delete("colors");
      const fallbackUrl = `https://pixabay.com/api/?${params.toString()}`;
      const fallbackResponse = await axios.get(fallbackUrl);

      if (fallbackResponse.data.hits.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No images found for the given sentiment",
          data: null,
        });
      }

      // Randomly select one image
      const randomImage = fallbackResponse.data.hits[Math.floor(Math.random() * fallbackResponse.data.hits.length)];

      // Convert Pixabay URL to our proxied URL for better CSP compatibility
      const imageUrl = randomImage.webformatURL;
      const largeImageUrl = randomImage.largeImageURL;
      const proxyImageUrl = `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
      const proxyLargeImageUrl = `/api/proxy/image?url=${encodeURIComponent(largeImageUrl)}`;

      return res.status(200).json({
        success: true,
        data: {
          imageUrl: proxyImageUrl,
          originalImageUrl: imageUrl,
          largeImageUrl: proxyLargeImageUrl,
          originalLargeImageUrl: largeImageUrl,
          source: "pixabay",
          id: randomImage.id,
          tags: randomImage.tags,
          sentiment: sentiment,
          searchTerm: searchTerm,
        },
      });
    }

    // Randomly select one image
    const randomImage = response.data.hits[Math.floor(Math.random() * response.data.hits.length)];

    // Convert Pixabay URL to our proxied URL for better CSP compatibility
    const imageUrl = randomImage.webformatURL;
    const largeImageUrl = randomImage.largeImageURL;
    const proxyImageUrl = `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
    const proxyLargeImageUrl = `/api/proxy/image?url=${encodeURIComponent(largeImageUrl)}`;

    res.status(200).json({
      success: true,
      data: {
        imageUrl: proxyImageUrl,
        originalImageUrl: imageUrl,
        largeImageUrl: proxyLargeImageUrl,
        originalLargeImageUrl: largeImageUrl,
        source: "pixabay",
        id: randomImage.id,
        tags: randomImage.tags,
        sentiment: sentiment,
        searchTerm: searchTerm,
        color: color,
      },
    });
  } catch (error) {
    console.error("Sentiment image error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error getting sentiment-based image",
      error: error.message,
    });
  }
};

// @desc    Get fallback image for any article
// @route   GET /api/proxy/fallback-image
// @access  Public
exports.getFallbackImage = async (req, res, next) => {
  try {
    const { category } = req.query;

    // Define default fallback image terms per category
    const categoryTerms = {
      business: ["business", "office", "meeting", "finance"],
      entertainment: ["entertainment", "movie", "music", "concert"],
      sports: ["sports", "football", "game", "competition"],
      technology: ["technology", "computer", "digital", "innovation"],
      science: ["science", "laboratory", "research", "space"],
      health: ["health", "medical", "doctor", "wellness"],
      politics: ["politics", "government", "capitol", "democracy"],
      world: ["world", "globe", "international", "map"],
      nation: ["nation", "flag", "country", "capital"],
      lifestyle: ["lifestyle", "living", "home", "fashion"],
    };

    // Default to 'news' if no category matched
    let searchTerms = ["news", "newspaper", "headlines", "information"];

    // If category is provided and recognized, use its terms
    if (category && categoryTerms[category]) {
      searchTerms = categoryTerms[category];
    }

    // Randomly select one search term
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    // Build the query params
    const apiKey = process.env.PIXABAY_API;
    const params = new URLSearchParams();
    params.append("key", apiKey);
    params.append("q", searchTerm);
    params.append("safesearch", "true");
    params.append("per_page", "3"); // Limit to 3 to reduce API usage

    const url = `https://pixabay.com/api/?${params.toString()}`;

    // Make the request to Pixabay
    const response = await axios.get(url);

    // Handle no results
    if (response.data.hits.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No fallback images found",
        data: null,
      });
    }

    // Randomly select one image
    const randomImage = response.data.hits[Math.floor(Math.random() * response.data.hits.length)];

    res.status(200).json({
      success: true,
      data: {
        imageUrl: randomImage.webformatURL,
        largeImageUrl: randomImage.largeImageURL,
        source: "pixabay",
        id: randomImage.id,
        tags: randomImage.tags,
        searchTerm: searchTerm,
        category: category || "general",
      },
    });
  } catch (error) {
    console.error("Fallback image error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error getting fallback image",
      error: error.message,
    });
  }
};

// @desc    Proxy image requests to bypass CSP restrictions
// @route   GET /api/proxy/image
// @access  Public
exports.proxyImage = async (req, res, next) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL parameter is required",
      });
    }

    // Validate the URL to ensure it's from Pixabay to prevent abuse
    if (!url.includes("pixabay.com") && !url.includes("pixy.org")) {
      return res.status(403).json({
        success: false,
        message: "Only Pixabay images can be proxied",
      });
    }

    try {
      // Fetch the image
      const response = await axios({
        method: "get",
        url: url,
        responseType: "arraybuffer",
        timeout: 5000, // Add timeout to prevent long hanging requests
      });

      // Set appropriate headers
      const contentType = response.headers["content-type"];
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for one day

      // Send the image data
      return res.send(response.data);
    } catch (imageError) {
      console.error("Failed to fetch original image:", imageError.message);

      // Try to get a fallback image instead
      try {
        // Use general news category as fallback
        const category = "general";
        const terms = ["news", "newspaper", "headlines", "information"];
        const searchTerm = terms[Math.floor(Math.random() * terms.length)];

        // Build the query params for a fallback image
        const apiKey = process.env.PIXABAY_API;
        const params = new URLSearchParams();
        params.append("key", apiKey);
        params.append("q", searchTerm);
        params.append("safesearch", "true");
        params.append("per_page", "3");

        const fallbackUrl = `https://pixabay.com/api/?${params.toString()}`;
        const fallbackResponse = await axios.get(fallbackUrl);

        // If we got results, redirect to one of them
        if (fallbackResponse.data.hits && fallbackResponse.data.hits.length > 0) {
          const randomImage = fallbackResponse.data.hits[Math.floor(Math.random() * fallbackResponse.data.hits.length)];
          // Redirect to the new image
          return res.redirect(`/api/proxy/image?url=${encodeURIComponent(randomImage.webformatURL)}`);
        }
      } catch (fallbackError) {
        console.error("Failed to get fallback image:", fallbackError.message);
      }

      // If all fails, return a 404 with a JSON error
      return res.status(404).json({
        success: false,
        message: "Image not found and fallback failed",
      });
    }
  } catch (error) {
    console.error("Image proxy error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error proxying image",
      error: error.message,
    });
  }
};
