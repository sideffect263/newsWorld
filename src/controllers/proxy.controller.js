const axios = require("axios");

// @desc    Proxy requests to Pixabay API
// @route   GET /api/proxy/pixabay
// @access  Public
exports.proxyPixabayRequest = async (req, res, next) => {
  try {
    const apiKey = process.env.PIXABAY_API || "43459658-a5c0d8a272f63d40c750bcdb0";

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
    const { sentiment, keywords } = req.query;

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
          searchTerms.push("happy", "success", "celebration");
        }
        colors = ["yellow", "green", "blue"];
        break;
      case "negative":
        if (searchTerms.length === 0) {
          searchTerms.push("sad", "problem", "challenge");
        }
        colors = ["blue", "gray", "black"];
        break;
      case "neutral":
      default:
        if (searchTerms.length === 0) {
          searchTerms.push("abstract", "neutral", "balance");
        }
        colors = ["white", "gray", "blue"];
        break;
    }

    // Pick a random search term and color
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Build the query params
    const apiKey = process.env.PIXABAY_API || "43459658-a5c0d8a272f63d40c750bcdb0";
    const params = new URLSearchParams();
    params.append("key", apiKey);
    params.append("q", searchTerm);
    params.append("safesearch", "true");
    params.append("colors", color);
    params.append("per_page", "3"); // Limit to 3 to reduce API usage

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
    const apiKey = process.env.PIXABAY_API || "43459658-a5c0d8a272f63d40c750bcdb0";
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

    // Fetch the image
    const response = await axios({
      method: "get",
      url: url,
      responseType: "arraybuffer",
    });

    // Set appropriate headers
    const contentType = response.headers["content-type"];
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for one day

    // Send the image data
    res.send(response.data);
  } catch (error) {
    console.error("Image proxy error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error proxying image",
      error: error.message,
    });
  }
};
