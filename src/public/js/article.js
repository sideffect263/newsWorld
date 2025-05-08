document.addEventListener("DOMContentLoaded", () => {
  // Ensure updateTrendingKeywords function is available
  if (typeof window.updateTrendingKeywords !== "function") {
    console.log("Defining updateTrendingKeywords function in article.js");
    window.updateTrendingKeywords = function (keywords) {
      console.log("Using article.js implementation of updateTrendingKeywords");
      const container = document.getElementById("trending-topics");
      if (!container) {
        console.error("Trending topics container not found");
        return;
      }

      // Clear loading indicator
      container.innerHTML = "";

      if (!keywords || keywords.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-3">No trending topics found</p>';
        return;
      }

      // Add each keyword as a button link
      keywords.forEach((item) => {
        const keywordEl = document.createElement("div");
        keywordEl.className = "mb-2";
        keywordEl.innerHTML = `
          <a href="/news?search=${encodeURIComponent(item.keyword)}" class="btn btn-sm btn-outline-primary me-2 mb-2">
            ${item.keyword}
          </a>
          <small class="text-muted">(${item.count})</small>
        `;
        container.appendChild(keywordEl);
      });
    };
  }

  // Initialize reading progress bar
  initReadingProgressBar();

  // Initialize dark mode functionality
  initDarkMode();

  // Initialize font size controls
  initFontSizeControls();

  // Generate and initialize table of contents
  initTableOfContents();

  // Load header
  fetch("/components/header.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("header").innerHTML = html;
    });

  // Fetch trending keywords
  tryFetchTrendingKeywords();

  // Get article ID from URL
  const articleId = window.location.pathname.split("/").pop();
  if (!articleId) {
    window.location.href = "/news";
    return;
  }

  // Load article data
  loadArticle(articleId);
});

// Initialize reading progress bar functionality
function initReadingProgressBar() {
  const progressBar = document.getElementById("readingProgress");
  if (!progressBar) return;

  window.addEventListener("scroll", () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + "%";
  });
}

// Initialize dark mode functionality
function initDarkMode() {
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (!darkModeToggle) return;

  // Check for saved theme preference or prefer-color-scheme
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Apply theme based on saved preference or system preference
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  // Toggle dark mode on button click
  darkModeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    // Toggle icon (handled by CSS)
  });
}

// Initialize font size controls
function initFontSizeControls() {
  const decreaseBtn = document.getElementById("decreaseFont");
  const resetBtn = document.getElementById("resetFont");
  const increaseBtn = document.getElementById("increaseFont");
  const content = document.getElementById("article-content");

  if (!decreaseBtn || !resetBtn || !increaseBtn || !content) return;

  // Font size levels
  const fontSizes = ["font-sm", "font-md", "font-lg", "font-xl"];
  let currentFontIndex = -1; // Default (no class)

  // Load saved font size preference
  const savedFontSize = localStorage.getItem("fontSizePreference");
  if (savedFontSize && fontSizes.includes(savedFontSize)) {
    content.classList.add(savedFontSize);
    currentFontIndex = fontSizes.indexOf(savedFontSize);
  }

  // Decrease font size
  decreaseBtn.addEventListener("click", () => {
    // Remove all font size classes
    fontSizes.forEach((size) => content.classList.remove(size));

    // If already at smallest or default, do nothing
    if (currentFontIndex <= 0) {
      currentFontIndex = -1; // Reset to default
      localStorage.removeItem("fontSizePreference");
    } else {
      // Decrease to the next smallest size
      currentFontIndex--;
      if (currentFontIndex >= 0) {
        content.classList.add(fontSizes[currentFontIndex]);
        localStorage.setItem("fontSizePreference", fontSizes[currentFontIndex]);
      }
    }
  });

  // Reset font size
  resetBtn.addEventListener("click", () => {
    // Remove all font size classes
    fontSizes.forEach((size) => content.classList.remove(size));

    // Reset to default
    currentFontIndex = -1;
    localStorage.removeItem("fontSizePreference");
  });

  // Increase font size
  increaseBtn.addEventListener("click", () => {
    // Remove all font size classes
    fontSizes.forEach((size) => content.classList.remove(size));

    // If already at largest, do nothing
    if (currentFontIndex >= fontSizes.length - 1) {
      currentFontIndex = fontSizes.length - 1;
    } else {
      // Increase to the next largest size
      currentFontIndex++;
    }

    // Apply new size
    if (currentFontIndex >= 0) {
      content.classList.add(fontSizes[currentFontIndex]);
      localStorage.setItem("fontSizePreference", fontSizes[currentFontIndex]);
    }
  });
}

// Generate and initialize table of contents
function initTableOfContents() {
  const content = document.getElementById("article-content");
  const tocContainer = document.getElementById("article-toc-container");
  const toc = document.getElementById("article-toc");
  const toggleTocBtn = document.getElementById("toggleToc");

  if (!content || !tocContainer || !toc || !toggleTocBtn) return;

  // Find all headings in the content
  const headings = content.querySelectorAll("h2, h3, h4");

  // Hide TOC if there are fewer than 3 headings
  if (headings.length < 3) {
    tocContainer.style.display = "none";
    return;
  }

  // Generate TOC items
  headings.forEach((heading, index) => {
    // Create ID if not exists
    if (!heading.id) {
      heading.id = `section-${index}`;
    }

    // Create TOC item
    const tocItem = document.createElement("a");
    tocItem.href = `#${heading.id}`;

    // Apply appropriate class based on heading level
    if (heading.tagName === "H2") {
      tocItem.className = "toc-item";
    } else {
      tocItem.className = "toc-subitem";
    }

    // Create indicator dot for visual hierarchy
    const indicator = document.createElement("span");
    indicator.className = "toc-indicator";

    // Add text content
    tocItem.innerHTML = `${indicator.outerHTML} ${heading.textContent}`;

    // Add click event to highlight active item and smooth scroll
    tocItem.addEventListener("click", (e) => {
      e.preventDefault();

      // Remove active class from all TOC items
      document.querySelectorAll(".toc-item, .toc-subitem").forEach((item) => {
        item.classList.remove("active");
      });

      // Add active class to clicked item
      tocItem.classList.add("active");

      // Smooth scroll to the section
      document.getElementById(heading.id).scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    toc.appendChild(tocItem);
  });

  // Toggle TOC visibility
  toggleTocBtn.addEventListener("click", () => {
    tocContainer.classList.toggle("collapsed");
  });

  // Highlight TOC item on scroll
  window.addEventListener("scroll", () => {
    // Get current scroll position
    const scrollPosition = window.scrollY;

    // Find the current section
    let currentSection = null;

    headings.forEach((heading) => {
      const sectionTop = heading.offsetTop - 100;
      if (scrollPosition >= sectionTop) {
        currentSection = heading.id;
      }
    });

    if (currentSection) {
      // Remove active class from all TOC items
      document.querySelectorAll(".toc-item, .toc-subitem").forEach((item) => {
        item.classList.remove("active");
      });

      // Add active class to current section's TOC item
      const activeItem = document.querySelector(`[href="#${currentSection}"]`);
      if (activeItem) {
        activeItem.classList.add("active");
      }
    }
  });
}

// Helper function to estimate reading time
function estimateReadingTime(text) {
  const wordsPerMinute = 225; // Average reading speed
  const wordCount = text.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime === 0 ? 1 : readingTime; // Minimum 1 minute
}

// Add interactive entity highlighting
function setupEntityHighlighting(article) {
  if (!article.entities || article.entities.length === 0 || !article.content) {
    return;
  }

  // Sort entities by name length (longer first) to prevent partial matches
  const sortedEntities = [...article.entities].sort((a, b) => b.name.length - a.name.length);

  let content = article.content;

  // Create a map of entity types to CSS classes
  const entityClasses = {
    person: "entity-person",
    organization: "entity-organization",
    location: "entity-location",
    city: "entity-location",
    country: "entity-location",
    event: "entity-event",
  };

  // Create a map to track already processed entities to avoid duplicates
  const processedEntities = new Set();

  // Replace entity mentions with highlighted spans
  sortedEntities.forEach((entity) => {
    if (!entity.name || entity.name.length < 3) return;

    // Skip if this entity has already been processed
    if (processedEntities.has(entity.name.toLowerCase())) return;
    processedEntities.add(entity.name.toLowerCase());

    const className = entityClasses[entity.type] || "entity-other";

    // Create a search link URL for this entity
    const searchUrl = `/news?search=${encodeURIComponent(entity.name)}`;

    // Create regex that matches whole words only
    const regex = new RegExp(`\\b${entity.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");

    // Replace with a span that includes a subtle, accessible link
    content = content.replace(
      regex,
      `<span class="${className}" title="${
        entity.type
      }: click to highlight all mentions" data-entity="${entity.name.replace(/"/g, "&quot;")}">
        ${entity.name}
        <a href="${searchUrl}" class="entity-search-link" title="Find all news about ${
        entity.name
      }" aria-label="Search for ${entity.name}" onclick="event.stopPropagation();">
          <i class="bi bi-search"></i>
        </a>
      </span>`,
    );
  });

  return content;
}

async function loadArticle(articleId) {
  try {
    // Show loading indicator
    const loadingElement = document.getElementById("loading");
    if (loadingElement) {
      loadingElement.style.display = "block";
    }

    // Add timeout to prevent hanging if API request takes too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let result;

    try {
      const response = await fetch(`/api/news/${articleId}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId); // Clear the timeout

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      result = await response.json();

      if (!result.success || !result.data) {
        console.error("Article data not found or invalid format:", result);
        showArticleError("We couldn't find the article you're looking for.");
        return;
      }
    } catch (fetchError) {
      console.error("Error fetching article data:", fetchError);

      if (fetchError.name === "AbortError") {
        showArticleError("Request timed out. Please try again later.");
      } else {
        showArticleError("There was a problem loading the article. Please try again.");
      }
      return;
    }

    const article = result.data;

    // Update page title and meta tags with more compelling format
    document.title = `${article.title} | ${article.source.name} - NewsWorld`;

    // Update meta description
    const metaDescription = document.getElementById("meta-description");
    if (metaDescription) {
      // Check if article has AI insights and use them for the description
      if (article.insights && article.insights.length > 0) {
        // Create a description with the first insight
        const insight = article.insights[0];
        const insightDesc = `AI Insight: ${insight.entity} - ${insight.prediction}. ${insight.reasoning.substring(
          0,
          80,
        )}...`;
        metaDescription.setAttribute("content", insightDesc);
      } else {
        // Create a more clickable description with key entities and sentiment
        let description = article.description;
        if (!description) {
          let descriptionPrefix = "";
          if (article.sentimentAssessment === "positive") {
            descriptionPrefix = "Positive news: ";
          } else if (article.sentimentAssessment === "negative") {
            descriptionPrefix = "Breaking: ";
          }

          // Include key entities if available
          const keyEntities =
            article.entities
              ?.slice(0, 2)
              .map((e) => e.name)
              .join(" and ") || "";
          description = `${descriptionPrefix}Read the latest about ${keyEntities || article.title} on NewsWorld. ${
            article.categories?.[0] ? `Category: ${article.categories[0]}` : "Global news coverage"
          }`;
        }

        // Ensure description isn't too long
        if (description.length > 155) {
          description = description.substring(0, 152) + "...";
        }

        metaDescription.setAttribute("content", description);
      }
    }

    // Update meta keywords
    const metaKeywords = document.getElementById("meta-keywords");
    if (metaKeywords) {
      const keywords = [...(article.categories || []), ...(article.entities?.map((e) => e.name) || [])].join(", ");
      metaKeywords.setAttribute("content", `${keywords}, news, global news`);
    }

    // Update Open Graph tags
    const ogTitle = document.getElementById("og-title");
    if (ogTitle) {
      // Make the title more engaging for social sharing
      const shareTitle =
        article.sentimentAssessment === "negative"
          ? `Breaking: ${article.title}`
          : `${article.title} | ${article.source.name}`;
      ogTitle.setAttribute("content", shareTitle);
    }

    const ogDescription = document.getElementById("og-description");
    if (ogDescription && metaDescription) {
      // Use the same description we created for meta description
      ogDescription.setAttribute("content", metaDescription.getAttribute("content"));
    }

    const ogImage = document.getElementById("og-image");
    if (ogImage && article.imageUrl) {
      ogImage.setAttribute("content", article.imageUrl);
    }

    // Use slug for canonical URL if available
    const canonicalUrl = article.slug
      ? `https://newsworld.ofektechnology.com/news/${article.slug}`
      : `https://newsworld.ofektechnology.com/news/${articleId}`;

    const ogUrl = document.getElementById("og-url");
    if (ogUrl) {
      ogUrl.setAttribute("content", canonicalUrl);
    }

    // Set canonical URL for SEO
    const canonicalLink = document.getElementById("canonical-link");
    if (canonicalLink) {
      canonicalLink.setAttribute("href", canonicalUrl);
    }

    // Update Twitter Card tags with the same enhanced content
    const twitterTitle = document.getElementById("twitter-title");
    if (twitterTitle && ogTitle) {
      twitterTitle.setAttribute("content", ogTitle.getAttribute("content"));
    }

    const twitterDescription = document.getElementById("twitter-description");
    if (twitterDescription && metaDescription) {
      twitterDescription.setAttribute("content", metaDescription.getAttribute("content"));
    }

    const twitterImage = document.getElementById("twitter-image");
    if (twitterImage && article.imageUrl) {
      twitterImage.setAttribute("content", article.imageUrl);
    }

    // Update article content
    const articleTitle = document.getElementById("article-title");
    if (articleTitle) {
      articleTitle.textContent = article.title;
    }

    const articleDate = document.getElementById("article-date");
    if (articleDate) {
      articleDate.textContent = new Date(article.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const articleAuthor = document.getElementById("article-author");
    if (articleAuthor && article.author) {
      articleAuthor.textContent = article.author;
    }

    const articleSource = document.getElementById("article-source");
    if (articleSource) {
      articleSource.textContent = article.source.name;
    }

    // Country and language
    const countries = {
      us: "United States",
      gb: "United Kingdom",
      ca: "Canada",
      au: "Australia",
    };
    const languages = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
    };

    const articleCountry = document.getElementById("article-country");
    if (articleCountry && article.countries && article.countries.length > 0) {
      articleCountry.textContent = countries[article.countries[0]] || article.countries[0];
    }

    const articleLanguage = document.getElementById("article-language");
    if (articleLanguage && article.language) {
      articleLanguage.textContent = languages[article.language] || article.language;
    }

    // Only update view count if the element exists
    const viewsElement = document.getElementById("article-views");
    if (viewsElement && article.viewCount) {
      viewsElement.textContent = article.viewCount;
    }

    console.log(article);

    // Article image
    const imgContainer = document.getElementById("article-image-container");
    if (!imgContainer) {
      console.error("Article image container not found");
    } else if (article.imageUrl) {
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "position-relative";

      const img = document.createElement("img");
      img.src = article.imageUrl;
      img.alt = article.title;
      img.className = "article-image img-fluid";

      // Add appropriate class based on image source if it's a sentiment-based image
      if (article.imageSource === "sentiment") {
        img.className += ` sentiment-${article.sentimentAssessment || "neutral"}`;
      }

      // Add lazy loading for better performance
      img.loading = "lazy";

      // Handle image load errors gracefully
      img.onerror = function () {
        // If image failed to load, set to placeholder and remove onerror handler to prevent loops
        img.src = "/images/placeholder-news.jpg";
        img.onerror = null;
      };

      imgWrapper.appendChild(img);
      imgContainer.appendChild(imgWrapper);

      // Add image attribution if it's a sentiment-based image
      if (article.imageSource === "sentiment") {
        const caption = document.createElement("div");
        caption.className = "image-caption text-muted small mt-2";

        // Add image tags if available
        const tagsText = article.imageTags
          ? `Tags: ${article.imageTags}.`
          : `Based on article sentiment: ${article.sentimentAssessment || "neutral"}.`;

        caption.innerHTML = `AI-selected image. ${tagsText} Source: <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a>`;
        imgContainer.appendChild(caption);
      }
    } else if (result.sentimentImage && imgContainer) {
      // Use sentiment-based image if no image in article (fallback to API call)
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "position-relative";

      const img = document.createElement("img");
      // Use proxied URLs to avoid CSP issues
      img.src = result.sentimentImage.largeImageUrl || result.sentimentImage.imageUrl;
      img.alt = article.title;
      img.className = `article-image img-fluid sentiment-${result.sentimentImage.sentiment}`;
      img.loading = "lazy";

      // Handle image load errors gracefully
      img.onerror = function () {
        // If image failed to load, set to placeholder and remove onerror handler to prevent loops
        img.src = "/images/placeholder-news.jpg";
        img.onerror = null;
      };

      // Add caption with attribution
      const caption = document.createElement("div");
      caption.className = "image-caption text-muted small mt-2";
      caption.innerHTML = `Image based on article sentiment: ${result.sentimentImage.sentiment}. 
                         Keywords: ${result.sentimentImage.searchTerm}. 
                         Source: <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a>`;

      imgWrapper.appendChild(img);
      imgContainer.appendChild(imgWrapper);
      imgContainer.appendChild(caption);
    } else if (imgContainer) {
      // Try to get a fallback image based on article category
      // Get the first category, or default to 'general'
      const category = article.categories && article.categories.length > 0 ? article.categories[0] : "general";

      // Show loading indicator
      imgContainer.innerHTML =
        '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';

      try {
        const fallbackResponse = await fetch(`/api/proxy/fallback-image?category=${encodeURIComponent(category)}`);

        // Add additional error checking for the response
        if (!fallbackResponse.ok) {
          throw new Error(`Failed to load fallback image: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }

        const fallbackResult = await fallbackResponse.json();

        if (fallbackResult.success && fallbackResult.data) {
          // Clear loading indicator
          imgContainer.innerHTML = "";

          const imgWrapper = document.createElement("div");
          imgWrapper.className = "position-relative";

          const img = document.createElement("img");
          // Use proxied URLs to avoid CSP issues
          img.src = fallbackResult.data.largeImageUrl || fallbackResult.data.imageUrl;
          img.alt = article.title;
          img.className = "article-image img-fluid";
          img.loading = "lazy";

          // Handle image load errors gracefully
          img.onerror = function () {
            // If image failed to load, set to placeholder and remove onerror handler to prevent loops
            img.src = "/images/placeholder-news.jpg";
            img.onerror = null;
          };

          // Add caption with attribution
          const caption = document.createElement("div");
          caption.className = "image-caption text-muted small mt-2";
          caption.innerHTML = `Category image: ${fallbackResult.data.category}. 
                             Keywords: ${fallbackResult.data.searchTerm}. 
                             Source: <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a>`;

          imgWrapper.appendChild(img);
          imgContainer.appendChild(imgWrapper);
          imgContainer.appendChild(caption);
        } else {
          // No fallback image found, use placeholder image
          showPlaceholderImage(imgContainer, article.title);
        }
      } catch (error) {
        console.error("Error loading fallback image:", error);
        // Use placeholder image if fallback image loading failed
        showPlaceholderImage(imgContainer, article.title);
      }
    }

    // Calculate and add reading time
    let readingTimeText = "";
    if (article.content) {
      const minutes = estimateReadingTime(article.content);
      readingTimeText = `<div class="me-4 mb-2">
        <i class="bi bi-clock"></i>
        <span>${minutes} min read</span>
      </div>`;

      // Add reading time to metadata
      const metaContainer = document.querySelector(".article-meta");
      if (metaContainer) {
        metaContainer.insertAdjacentHTML("beforeend", readingTimeText);
      }
    }

    // Article sentiment
    const sentimentEl = document.getElementById("article-sentiment");
    if (sentimentEl) {
      if (article.sentimentAssessment) {
        let sentimentClass = "alert-secondary";
        let sentimentIcon = "bi-emoji-neutral";
        let sentimentText = "This article has a neutral tone";

        if (article.sentimentAssessment === "positive") {
          sentimentClass = "alert-success";
          sentimentIcon = "bi-emoji-smile";
          sentimentText = "This article has a positive tone";
        } else if (article.sentimentAssessment === "negative") {
          sentimentClass = "alert-danger";
          sentimentIcon = "bi-emoji-frown";
          sentimentText = "This article has a negative tone";
        }

        sentimentEl.className = `alert ${sentimentClass}`;
        sentimentEl.innerHTML = `<i class="bi ${sentimentIcon}"></i> ${sentimentText}`;
      } else {
        sentimentEl.style.display = "none";
      }
    }

    // Display AI-generated insights if available
    if (article.insights && article.insights.length > 0) {
      displayArticleInsights(article.insights);
    } else {
      // Try to fetch insights if not included in the article response
      try {
        const insightsResponse = await fetch(`/api/news/${articleId}/insights`);
        const insightsResult = await insightsResponse.json();

        if (insightsResult.success && insightsResult.data && insightsResult.data.length > 0) {
          displayArticleInsights(insightsResult.data);
        } else {
          // Hide insights container if no insights available
          const insightsEl = document.getElementById("article-insights");
          if (insightsEl) {
            insightsEl.style.display = "none";
          }
        }
      } catch (error) {
        console.error("Error fetching article insights:", error);
        // Hide insights container on error
        const insightsEl = document.getElementById("article-insights");
        if (insightsEl) {
          insightsEl.style.display = "none";
        }
      }
    }

    // Article content with entity highlighting
    const contentEl = document.getElementById("article-content");
    if (contentEl) {
      if (article.content) {
        // Apply entity highlighting if there are entities
        const processedContent = setupEntityHighlighting(article) || article.content;
        contentEl.innerHTML = processedContent;

        // Add click event handlers for entity highlighting
        document.querySelectorAll("[data-entity]").forEach((el) => {
          el.addEventListener("click", () => {
            const entityName = el.getAttribute("data-entity");
            // Highlight all instances of this entity
            document.querySelectorAll(`[data-entity="${entityName}"]`).forEach((match) => {
              match.classList.toggle("entity-highlight");
            });
          });
        });
      } else if (article.description) {
        contentEl.innerHTML = `<p>${article.description}</p>
                <p class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    Read the <a href="${article.url}" target="_blank" rel="noopener">full article at ${article.source.name} <i class="bi bi-box-arrow-up-right"></i></a>
                </p>`;
      } else {
        contentEl.innerHTML = `<p class="alert alert-info">
                <i class="bi bi-info-circle"></i>
                Read the <a href="${article.url}" target="_blank" rel="noopener">full article at ${article.source.name} <i class="bi bi-box-arrow-up-right"></i></a>
            </p>`;
      }
    }

    // Add source attribution section
    const attributionEl = document.getElementById("article-attribution");
    if (attributionEl) {
      const publishDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      attributionEl.innerHTML = `
        <div class="d-flex align-items-center">
          <div class="flex-grow-1">
            <p class="mb-1"><span class="attribution-label">Source:</span> ${article.source.name}</p>
            <p class="mb-1"><small>This article was originally published on ${publishDate}</small></p>
            <p class="mb-0">
              <a href="${article.url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary mt-2">
                <i class="bi bi-box-arrow-up-right me-1"></i> Read original article at ${article.source.name}
              </a>
            </p>
          </div>
          <div class="ms-auto d-none d-md-block">
            <i class="bi bi-link-45deg text-primary" style="font-size: 2rem;"></i>
          </div>
        </div>
      `;
    }

    // Article tags/categories
    const tagsEl = document.getElementById("article-tags");
    if (tagsEl) {
      let tagsHtml = "<h5>Categories:</h5><div>";

      if (article.categories && article.categories.length > 0) {
        // Remove duplicates by converting to Set and back to Array
        const uniqueCategories = [...new Set(article.categories)];
        uniqueCategories.forEach((category) => {
          tagsHtml += `<span class="badge bg-primary tag-badge">${category}</span>`;
        });
      }

      tagsHtml += "</div>";

      // Entities as tags
      if (article.entities && article.entities.length > 0) {
        const entityTypes = {
          person: { label: "People", class: "bg-danger" },
          organization: { label: "Organizations", class: "bg-success" },
          location: { label: "Locations", class: "bg-warning text-dark" },
          city: { label: "Cities", class: "bg-warning text-dark" },
          country: { label: "Countries", class: "bg-warning text-dark" },
          event: { label: "Events", class: "bg-info text-dark" },
        };

        // Group entities by type and remove duplicates
        const groupedEntities = {};
        article.entities.forEach((entity) => {
          if (!entity.name) return;

          const entityType = entity.type || "other";
          if (!groupedEntities[entityType]) {
            groupedEntities[entityType] = new Set();
          }
          // Add to set to ensure uniqueness
          groupedEntities[entityType].add(entity.name);
        });

        // Add entity sections
        Object.entries(groupedEntities).forEach(([type, entitiesSet]) => {
          if (entityTypes[type] && entitiesSet.size > 0) {
            tagsHtml += `<h5 class="mt-3">${entityTypes[type].label}:</h5><div>`;
            // Convert set back to array for iteration
            [...entitiesSet].forEach((entity) => {
              tagsHtml += `<span class="badge ${entityTypes[type].class} tag-badge" 
                              onclick="highlightEntity('${entity.replace(/'/g, "\\'")}')">${entity}</span>`;
            });
            tagsHtml += "</div>";
          }
        });
      }

      tagsEl.innerHTML = tagsHtml;
    }

    // Set up share links
    const shareTitle = encodeURIComponent(article.title);
    const shareUrl = encodeURIComponent(
      article.slug
        ? `https://newsworld.ofektechnology.com/news/${article.slug}`
        : `https://newsworld.ofektechnology.com/news/${articleId}`,
    );
    const shareText = encodeURIComponent(article.description || "");

    const twitterShare = document.getElementById("share-twitter");
    if (twitterShare) {
      twitterShare.href = `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`;
    }

    const facebookShare = document.getElementById("share-facebook");
    if (facebookShare) {
      facebookShare.href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
    }

    const linkedinShare = document.getElementById("share-linkedin");
    if (linkedinShare) {
      linkedinShare.href = `https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`;
    }

    const emailShare = document.getElementById("share-email");
    if (emailShare) {
      emailShare.href = `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${shareUrl}`;
    }

    // Update JSON-LD data
    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      description: article.description || `Read about ${article.title} on NewsWorld, your global news aggregator`,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
      image:
        article.imageUrl ||
        (result.sentimentImage
          ? result.sentimentImage.largeImageUrl
          : "https://newsworld.ofektechnology.com/favicon/android-chrome-512x512.png"),
      author: {
        "@type": "Person",
        name: article.author || "NewsWorld",
      },
      publisher: {
        "@type": "Organization",
        name: "NewsWorld",
        url: "https://newsworld.ofektechnology.com/",
        logo: {
          "@type": "ImageObject",
          url: "https://newsworld.ofektechnology.com/favicon/android-chrome-512x512.png",
          width: 512,
          height: 512,
        },
        description: "Your trusted source for global news coverage with AI-powered insights",
      },
      articleSection: article.categories?.[0] || "News",
      keywords: [...(article.categories || []), ...(article.entities?.map((e) => e.name) || [])].join(", "),
      wordCount: article.content ? article.content.trim().split(/\s+/).length : 0,
      timeRequired: `PT${estimateReadingTime(article.content || "")}M`,
      isAccessibleForFree: "True",
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".article-title", ".article-content"],
      },
    };

    // Add sentiment data if available
    if (article.sentimentAssessment) {
      schema.sentiment = {
        "@type": "Rating",
        ratingValue: article.sentiment || 0,
        bestRating: 1,
        worstRating: -1,
        ratingExplanation: `This article has a ${article.sentimentAssessment} tone`,
      };
    }

    // Add location data if available
    if (article.entities && article.entities.length > 0) {
      const locationEntities = article.entities.filter(
        (entity) => ["location", "city", "country"].includes(entity.type) && entity.coordinates,
      );

      if (locationEntities.length > 0) {
        schema.contentLocation = locationEntities.map((entity) => ({
          "@type": "Place",
          name: entity.name,
          address: entity.formattedAddress || entity.name,
          geo: entity.coordinates
            ? {
                "@type": "GeoCoordinates",
                latitude: entity.coordinates.lat,
                longitude: entity.coordinates.lng,
              }
            : undefined,
        }));
      } else if (article.countries && article.countries.length > 0) {
        // Use country code if no specific location entities
        schema.contentLocation = {
          "@type": "Country",
          name: countries[article.countries[0]] || article.countries[0],
        };
      }
    }

    // Add image metadata if available
    if (article.imageUrl) {
      const imageObject = {
        "@type": "ImageObject",
        url: article.imageUrl,
        caption: article.title,
        creditText: article.imageSource === "sentiment" ? "AI-generated image based on article sentiment" : undefined,
        keywords: article.imageTags || undefined,
      };

      // Replace simple image URL with ImageObject
      schema.image = imageObject;
    }

    // Add insights data if available
    if (article.insights && article.insights.length > 0) {
      schema.insights = article.insights.map((insight) => ({
        "@type": "Claim",
        name: insight.prediction,
        description: insight.reasoning,
        confidence: insight.confidence,
        about: {
          "@type": "Thing",
          name: insight.entity,
        },
      }));
    }

    // Add breadcrumb schema for better search results
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "NewsWorld",
          item: "https://newsworld.ofektechnology.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "News",
          item: "https://newsworld.ofektechnology.com/news",
        },
        {
          "@type": "ListItem",
          position: 3,
          name:
            article.categories && article.categories.length > 0
              ? article.categories[0].charAt(0).toUpperCase() + article.categories[0].slice(1)
              : "Article",
          item:
            article.categories && article.categories.length > 0
              ? `https://newsworld.ofektechnology.com/news?categories=${article.categories[0]}`
              : canonicalUrl,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: article.title,
          item: canonicalUrl,
        },
      ],
    };

    // Add the breadcrumb schema to the page
    const breadcrumbElement = document.createElement("script");
    breadcrumbElement.type = "application/ld+json";
    breadcrumbElement.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbElement);

    const schemaElement = document.getElementById("article-schema");
    if (schemaElement) {
      schemaElement.textContent = JSON.stringify(schema);
    }

    // Load related articles
    loadRelatedArticles(article);

    // Load trending topics
    loadTrendingTopics();

    // Hide loading spinner
    if (loadingElement) {
      loadingElement.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading article:", error);
    // Instead of redirecting, show an error message
    showArticleError("We encountered an error while preparing the article for display.");
  }
}

// Function to highlight entity mentions in the article text
function highlightEntity(entityName) {
  document.querySelectorAll(`[data-entity="${entityName}"]`).forEach((match) => {
    match.classList.toggle("entity-highlight");
  });
}

async function loadRelatedArticles(article) {
  try {
    // Use a combination of approaches to find related content
    const categories = article.categories || [];
    const keywords = article.entities?.map((e) => e.name).slice(0, 3) || [];

    // Strategy 1: Try to get content by categories and keywords
    let relatedArticles = [];

    if (categories.length > 0 || keywords.length > 0) {
      // Build query params for semantic relevance
      const params = new URLSearchParams();

      // Add a random offset to get different articles each time
      const randomOffset = Math.floor(Math.random() * 20);
      params.append("offset", randomOffset);

      // Only use 1-2 categories max for more diversity
      const randomCategories = categories.sort(() => 0.5 - Math.random()).slice(0, 2);
      randomCategories.forEach((category) => params.append("categories", category));

      // Use fewer but more relevant keywords
      const priorityKeywords = keywords.slice(0, 2);
      priorityKeywords.forEach((keyword) => params.append("keywords", keyword));

      params.append("limit", "3");
      params.append("exclude", article._id);

      // Make the API call
      const response = await fetch(`/api/news/related?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        relatedArticles = result.data;
      }
    }

    // Strategy 2: If we don't have enough articles, add some recent popular ones
    if (relatedArticles.length < 5) {
      const neededCount = 5 - relatedArticles.length;
      const popularParams = new URLSearchParams();
      popularParams.append("limit", neededCount);
      popularParams.append("exclude", article._id);

      // Exclude the IDs of articles we already have
      relatedArticles.forEach((a) => popularParams.append("exclude", a._id));

      const popularResponse = await fetch(`/api/news/top?${popularParams.toString()}`);
      const popularResult = await popularResponse.json();

      if (popularResult.success && popularResult.data && popularResult.data.length > 0) {
        // Add the popular articles to our related articles
        relatedArticles = [...relatedArticles, ...popularResult.data];
      }
    }

    // If we still don't have 5 articles, try to get recent ones
    if (relatedArticles.length < 5) {
      const neededCount = 5 - relatedArticles.length;
      const latestParams = new URLSearchParams();
      latestParams.append("limit", neededCount);
      latestParams.append("exclude", article._id);

      // Exclude the IDs of articles we already have
      relatedArticles.forEach((a) => latestParams.append("exclude", a._id));

      const latestResponse = await fetch(`/api/news/latest?${latestParams.toString()}`);
      const latestResult = await latestResponse.json();

      if (latestResult.success && latestResult.data && latestResult.data.length > 0) {
        // Add the latest articles to our related articles
        relatedArticles = [...relatedArticles, ...latestResult.data];
      }
    }

    // Shuffle the final list of articles for more randomness
    relatedArticles = relatedArticles.sort(() => 0.5 - Math.random());

    // Now display the related articles
    const container = document.getElementById("related-articles");

    if (relatedArticles.length === 0) {
      container.innerHTML = '<div class="no-related-articles">No related articles found</div>';
      return;
    }

    container.innerHTML = "";
    relatedArticles.forEach((related) => {
      const date = new Date(related.publishedAt).toLocaleDateString();

      // Create article link element
      const item = document.createElement("a");

      // Use slug for URL if available
      item.href = related.slug ? `/news/${related.slug}` : `/news/${related._id}`;
      item.className = "related-article-item";

      // Determine sentiment class if available
      let sentimentClass = "";
      if (related.sentimentAssessment) {
        sentimentClass = `sentiment-${related.sentimentAssessment}-badge`;
      }

      // Check if image URL is valid, otherwise use placeholder directly
      const imageUrl =
        related.imageUrl && related.imageUrl.trim() !== "" ? related.imageUrl : "/images/placeholder-news.jpg";

      // HTML structure for the related article item
      item.innerHTML = `
        <div class="related-article-img-container">
          ${
            sentimentClass
              ? `<div class="sentiment-badge ${sentimentClass}" title="${related.sentimentAssessment} sentiment"></div>`
              : ""
          }
          <img src="${imageUrl}" alt="${related.title}" class="related-article-img">
        </div>
        <div class="related-article-content">
          <h6 class="related-article-title">${related.title}</h6>
          <div class="related-article-meta">
            <span class="related-article-source" title="${related.source.name}"><i class="bi bi-newspaper"></i>${
        related.source.name
      }</span>
            <span class="related-article-date"><i class="bi bi-calendar3"></i>${date}</span>
          </div>
        </div>
      `;

      container.appendChild(item);
    });

    // Update the server-side cache to avoid showing the same articles again
    try {
      const cacheUpdate = new URLSearchParams();
      cacheUpdate.append("articleId", article._id);
      relatedArticles.forEach((a) => cacheUpdate.append("shown", a._id));

      // Non-blocking fetch to update shown articles in cache - use a try/catch to handle missing endpoint
      try {
        fetch(`/api/news/${article._id}/viewed-related`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: cacheUpdate,
        }).catch((err) => {
          console.info("Viewed related endpoint not implemented:", err.message);
        });
      } catch (e) {
        // Silently fail if this endpoint doesn't exist
        console.info("Viewed related endpoint error:", e.message);
      }
    } catch (e) {
      // Ignore errors for this enhancement
    }
  } catch (error) {
    console.error("Error loading related articles:", error);
    document.getElementById("related-articles").innerHTML =
      '<div class="no-related-articles">Could not load related articles</div>';
  }
}

async function loadTrendingTopics() {
  try {
    const response = await fetch("/api/trends/keywords?timeframe=daily&limit=10");
    const result = await response.json();

    const container = document.getElementById("trending-topics");

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = '<p class="text-center text-muted py-3">No trending topics found</p>';
      return;
    }

    container.innerHTML = "";
    result.data.forEach((trend) => {
      const item = document.createElement("div");
      item.className = "mb-2";
      item.innerHTML = `
                <a href="/news?search=${encodeURIComponent(
                  trend.keyword,
                )}" class="btn btn-sm btn-outline-primary me-2 mb-2">
                    ${trend.keyword}
                </a>
                <small class="text-muted">(${trend.count})</small>
            `;
      container.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading trending topics:", error);
    document.getElementById("trending-topics").innerHTML =
      '<p class="text-center text-muted py-3">Could not load trending topics</p>';
  }
}

/**
 * Display AI-generated insights for the article
 * @param {Array} insights - Array of insight objects
 */
function displayArticleInsights(insights) {
  if (!insights || insights.length === 0) {
    return;
  }

  const insightsEl = document.getElementById("article-insights");
  if (!insightsEl) return;

  // Clear previous content
  insightsEl.innerHTML = "";
  insightsEl.style.display = "block";

  // Style map for different insight types
  const typeStyles = {
    stock_prediction: {
      icon: "bi-graph-up",
      class: "alert-info",
    },
    market_trend: {
      icon: "bi-currency-dollar",
      class: "alert-primary",
    },
    political_impact: {
      icon: "bi-flag",
      class: "alert-secondary",
    },
    social_impact: {
      icon: "bi-people",
      class: "alert-success",
    },
    technology_impact: {
      icon: "bi-cpu",
      class: "alert-light",
    },
    legal_consequence: {
      icon: "bi-journal-text",
      class: "alert-warning",
    },
    other: {
      icon: "bi-lightbulb",
      class: "alert-secondary",
    },
  };

  // Create header
  const header = document.createElement("h4");
  header.className = "insight-header mb-3";
  header.innerHTML = '<i class="bi bi-graph-up me-2"></i>AI-Generated Insights';
  insightsEl.appendChild(header);

  // Create container for insights
  const insightsContainer = document.createElement("div");
  insightsContainer.className = "insights-container";

  // Add each insight
  insights.forEach((insight) => {
    const style = typeStyles[insight.type] || typeStyles.other;

    const insightEl = document.createElement("div");
    insightEl.className = `alert ${style.class} insight-card`;

    // Format confidence as percentage
    const confidence = Math.round(insight.confidence * 100);

    insightEl.innerHTML = `
      <div class="d-flex">
        <div class="insight-icon me-3">
          <i class="bi ${style.icon} fs-3"></i>
        </div>
        <div class="insight-content">
          <h5 class="mb-1"><strong>${insight.entity}:</strong> ${insight.prediction}</h5>
          <p class="mb-1">${insight.reasoning}</p>
          <div class="d-flex align-items-center">
            <div class="progress flex-grow-1" style="height: 6px;">
              <div class="progress-bar" role="progressbar" style="width: ${confidence}%;" 
                aria-valuenow="${confidence}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <div class="ms-2 confidence-text">
              <small>${confidence}% confidence</small>
            </div>
          </div>
        </div>
      </div>
    `;

    insightsContainer.appendChild(insightEl);
  });

  // Add disclaimer
  const disclaimer = document.createElement("div");
  disclaimer.className = "insight-disclaimer text-muted small mt-2";
  disclaimer.innerHTML = `
    <i class="bi bi-info-circle-fill me-1"></i>
    These AI-generated insights are predictions based on article content and historical patterns. 
    They should not be considered financial or legal advice.
  `;

  insightsEl.appendChild(insightsContainer);
  insightsEl.appendChild(disclaimer);
}

// Helper function to show placeholder image
function showPlaceholderImage(container, alt) {
  container.innerHTML = "";

  const imgWrapper = document.createElement("div");
  imgWrapper.className = "position-relative";

  const img = document.createElement("img");
  img.src = "/images/placeholder-news.jpg";
  img.alt = alt || "News placeholder";
  img.className = "article-image img-fluid";

  imgWrapper.appendChild(img);
  container.appendChild(imgWrapper);
}

// Show a user-friendly error message instead of redirecting
function showArticleError(message) {
  // Hide loading spinner
  document.getElementById("loading").style.display = "none";

  // Set a generic title
  document.title = "Article Not Found - NewsWorld";

  // Update the article content area with an error message
  const contentContainer = document.getElementById("article-content");
  if (contentContainer) {
    contentContainer.innerHTML = `
      <div class="alert alert-warning">
        <h4><i class="bi bi-exclamation-triangle me-2"></i>Oops!</h4>
        <p>${message || "Something went wrong when loading this article."}</p>
        <div class="mt-3">
          <a href="/news" class="btn btn-primary">
            <i class="bi bi-arrow-left me-2"></i>Return to News
          </a>
          <button onclick="location.reload()" class="btn btn-outline-secondary ms-2">
            <i class="bi bi-arrow-clockwise me-2"></i>Try Again
          </button>
        </div>
      </div>
    `;
  }

  // Hide other containers that would be empty
  const elementsToHide = [
    "article-image-container",
    "article-sentiment",
    "article-insights",
    "article-tags",
    "article-attribution",
  ];

  elementsToHide.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.style.display = "none";
  });

  // Update article title with error
  const titleElement = document.getElementById("article-title");
  if (titleElement) {
    titleElement.textContent = "Article Not Found";
  }
}
