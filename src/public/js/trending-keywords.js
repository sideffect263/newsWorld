// Common function to attempt to fetch trending keywords
function tryFetchTrendingKeywords() {
  // Show loading state in the swiper
  const keywordsContainer = document.getElementById("trending-keywords");
  if (keywordsContainer) {
    keywordsContainer.innerHTML = '<div class="swiper-slide">Loading trending topics...</div>';
  }

  console.log("Fetching trending keywords from API...");
  fetch("/api/trends/keywords?timeframe=daily&limit=15")
    .then((response) => {
      console.log("API Response status:", response.status);
      if (!response.ok) {
        throw new Error(`API response was not ok: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Trending keywords API response:", data);

      // Process the data to normalize it into the expected format
      let processedData = [];

      if (data.success && data.data) {
        // Debug log the first item to understand its structure
        if (Array.isArray(data.data) && data.data.length > 0) {
          console.log("First keyword item structure:", JSON.stringify(data.data[0]));
        }

        // Handle different potential response formats
        if (Array.isArray(data.data)) {
          processedData = data.data.map((item) => {
            // For the specific API response format we're seeing
            if (item.keyword && item.count) {
              return { keyword: item.keyword, count: item.count };
            }

            // Check if already in the right format
            if (item.keyword && typeof item.count !== "undefined") {
              return { keyword: item.keyword, count: item.count };
            }

            // Handle format from the trends API
            if (item.word && typeof item.count !== "undefined") {
              return { keyword: item.word, count: item.count };
            }

            // Handle format from different API source
            if (item.text && typeof item.frequency !== "undefined") {
              return { keyword: item.text, count: item.frequency };
            }

            // Default case - try to find some usable data
            return {
              keyword: item.keyword || item.word || item.term || item.text || "Unknown",
              count: item.count || item.frequency || item.occurrences || 0,
            };
          });
        } else if (typeof data.data === "object") {
          // Handle if the API returns an object with keywords as keys
          processedData = Object.entries(data.data).map(([keyword, count]) => ({
            keyword,
            count: typeof count === "object" ? count.count || 1 : count,
          }));
        }
      }

      if (processedData.length > 0) {
        console.log("Processed trending keywords from server:", processedData.length);
        console.log("First few processed keywords:", processedData.slice(0, 3));

        // Check if updateTrendingKeywords function exists before calling
        if (typeof updateTrendingKeywords === "function") {
          console.log("Calling updateTrendingKeywords function");
          updateTrendingKeywords(processedData);
        } else if (typeof window.updateTrendingKeywords === "function") {
          console.log("Calling window.updateTrendingKeywords function");
          window.updateTrendingKeywords(processedData);
        } else {
          console.error("updateTrendingKeywords function not found!");
          throw new Error("updateTrendingKeywords function not available");
        }
      } else {
        console.warn("No usable trending keyword data found", data);
        throw new Error("No trending keywords found in API response");
      }
    })
    .catch((error) => {
      console.warn("Error fetching trending keywords:", error);

      // Only use fallback keywords if we absolutely have to
      console.log("Using fallback trending keywords due to API error");
      const fallbackKeywords = [
        { keyword: "Climate Change", count: 87 },
        { keyword: "AI", count: 64 },
        { keyword: "Election", count: 102 },
        { keyword: "Inflation", count: 56 },
        { keyword: "Renewable Energy", count: 59 },
      ];

      // Use the updateTrendingKeywords function
      if (typeof updateTrendingKeywords === "function") {
        updateTrendingKeywords(fallbackKeywords);
      } else if (typeof window.updateTrendingKeywords === "function") {
        window.updateTrendingKeywords(fallbackKeywords);
      } else {
        console.error("updateTrendingKeywords function not found even for fallback!");
      }
    });
}

// Function to directly test the trending keywords API from the console
window.testTrendingKeywordsAPI = function () {
  console.log("Running direct API test...");
  fetch("/api/trends/keywords?timeframe=daily&limit=15")
    .then((response) => {
      console.log("Test API Response status:", response.status);
      console.log("Test API Response headers:", Object.fromEntries([...response.headers.entries()]));

      return response.text().then((text) => {
        try {
          // Try to parse as JSON
          const json = JSON.parse(text);
          console.log("Test API Response parsed JSON:", json);
          return json;
        } catch (e) {
          // If not valid JSON, return the raw text
          console.log("Test API Response raw text (not valid JSON):", text);
          console.error("Error parsing JSON:", e);
          return { success: false, error: e.message, data: text };
        }
      });
    })
    .catch((error) => {
      console.error("Test API Request failed:", error);
    });
};

// Debug - check if the script is being loaded
console.log("trending-keywords.js loaded");

// Expose the tryFetchTrendingKeywords function globally
window.tryFetchTrendingKeywords = tryFetchTrendingKeywords;
