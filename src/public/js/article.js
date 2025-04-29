document.addEventListener("DOMContentLoaded", () => {
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

  // Replace entity mentions with highlighted spans
  sortedEntities.forEach((entity) => {
    if (!entity.name || entity.name.length < 3) return;

    const className = entityClasses[entity.type] || "entity-other";
    const regex = new RegExp(`\\b${entity.name}\\b`, "gi");
    content = content.replace(
      regex,
      `<span class="${className}" title="${entity.type}" data-entity="${entity.name.replace(/"/g, "&quot;")}">${
        entity.name
      }</span>`,
    );
  });

  return content;
}

async function loadArticle(articleId) {
  try {
    const response = await fetch(`/api/news/${articleId}`);
    const result = await response.json();

    if (!result.success || !result.data) {
      window.location.href = "/news";
      return;
    }

    const article = result.data;

    // Update page title and meta tags
    document.title = `${article.title} - NewsWorld`;

    // Update meta description
    const description = article.description || `Read about ${article.title} on NewsWorld, your global news aggregator`;
    document.getElementById("meta-description").setAttribute("content", description);

    // Update meta keywords
    const keywords = [...(article.categories || []), ...(article.entities?.map((e) => e.name) || [])].join(", ");
    document.getElementById("meta-keywords").setAttribute("content", `${keywords}, news, global news`);

    // Update Open Graph tags
    document.getElementById("og-title").setAttribute("content", article.title);
    document.getElementById("og-description").setAttribute("content", description);
    if (article.imageUrl) {
      document.getElementById("og-image").setAttribute("content", article.imageUrl);
    }

    // Use slug for canonical URL if available
    const canonicalUrl = article.slug
      ? `https://newsworld.com/news/${article.slug}`
      : `https://newsworld.com/news/${articleId}`;

    document.getElementById("og-url").setAttribute("content", canonicalUrl);

    // Set canonical URL for SEO
    document.getElementById("canonical-link").setAttribute("href", canonicalUrl);

    // Update Twitter Card tags
    document.getElementById("twitter-title").setAttribute("content", article.title);
    document.getElementById("twitter-description").setAttribute("content", description);
    if (article.imageUrl) {
      document.getElementById("twitter-image").setAttribute("content", article.imageUrl);
    }

    // Update article content
    document.getElementById("article-title").textContent = article.title;
    document.getElementById("article-date").textContent = new Date(article.publishedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (article.author) {
      document.getElementById("article-author").textContent = article.author;
    }

    document.getElementById("article-source").textContent = article.source.name;

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

    if (article.countries && article.countries.length > 0) {
      document.getElementById("article-country").textContent = countries[article.countries[0]] || article.countries[0];
    }

    if (article.language) {
      document.getElementById("article-language").textContent = languages[article.language] || article.language;
    }

    if (article.viewCount) {
      document.getElementById("article-views").textContent = article.viewCount;
    }
    console.log(article);

    // Article image
    if (article.imageUrl) {
      const imgContainer = document.getElementById("article-image-container");
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
    } else if (result.sentimentImage) {
      // Use sentiment-based image if no image in article (fallback to API call)
      const imgContainer = document.getElementById("article-image-container");
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "position-relative";

      const img = document.createElement("img");
      // Use proxied URLs to avoid CSP issues
      img.src = result.sentimentImage.largeImageUrl || result.sentimentImage.imageUrl;
      img.alt = article.title;
      img.className = `article-image img-fluid sentiment-${result.sentimentImage.sentiment}`;
      img.loading = "lazy";

      // Add caption with attribution
      const caption = document.createElement("div");
      caption.className = "image-caption text-muted small mt-2";
      caption.innerHTML = `Image based on article sentiment: ${result.sentimentImage.sentiment}. 
                           Keywords: ${result.sentimentImage.searchTerm}. 
                           Source: <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a>`;

      imgWrapper.appendChild(img);
      imgContainer.appendChild(imgWrapper);
      imgContainer.appendChild(caption);
    } else {
      // Try to get a fallback image based on article category
      const imgContainer = document.getElementById("article-image-container");

      // Get the first category, or default to 'general'
      const category = article.categories && article.categories.length > 0 ? article.categories[0] : "general";

      // Show loading indicator
      imgContainer.innerHTML =
        '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';

      try {
        const fallbackResponse = await fetch(`/api/proxy/fallback-image?category=${encodeURIComponent(category)}`);
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
          // No fallback image found, remove the container
          imgContainer.style.display = "none";
        }
      } catch (error) {
        console.error("Error loading fallback image:", error);
        // No fallback image found, remove the container
        imgContainer.style.display = "none";
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
      metaContainer.insertAdjacentHTML("beforeend", readingTimeText);
    }

    // Article sentiment
    const sentimentEl = document.getElementById("article-sentiment");
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

    // Article content with entity highlighting
    const contentEl = document.getElementById("article-content");
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

    // Add source attribution section
    const attributionEl = document.getElementById("article-attribution");
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

    // Article tags/categories
    const tagsEl = document.getElementById("article-tags");
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

    // Set up share links
    const shareTitle = encodeURIComponent(article.title);
    const shareUrl = encodeURIComponent(
      article.slug ? `https://newsworld.com/news/${article.slug}` : `https://newsworld.com/news/${articleId}`,
    );
    const shareText = encodeURIComponent(article.description || "");

    document.getElementById(
      "share-twitter",
    ).href = `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`;
    document.getElementById("share-facebook").href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
    document.getElementById(
      "share-linkedin",
    ).href = `https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`;
    document.getElementById("share-email").href = `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${shareUrl}`;

    // Update JSON-LD data
    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      description: description,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
      image:
        article.imageUrl ||
        (result.sentimentImage
          ? result.sentimentImage.largeImageUrl
          : "https://newsworld.com/favicon/android-chrome-512x512.png"),
      author: {
        "@type": "Person",
        name: article.author || "NewsWorld",
      },
      publisher: {
        "@type": "Organization",
        name: "NewsWorld",
        logo: {
          "@type": "ImageObject",
          url: "https://newsworld.com/favicon/android-chrome-512x512.png",
          width: 512,
          height: 512,
        },
      },
      articleSection: article.categories?.[0] || "News",
      keywords: keywords,
      wordCount: article.content ? article.content.trim().split(/\s+/).length : 0,
      timeRequired: `PT${estimateReadingTime(article.content || "")}M`,
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

    document.getElementById("article-schema").textContent = JSON.stringify(schema);

    // Load related articles
    loadRelatedArticles(article);

    // Load trending topics
    loadTrendingTopics();

    // Hide loading spinner
    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("Error loading article:", error);
    window.location.href = "/news";
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
    // Use categories and entities to find related content
    const categories = article.categories || [];
    const keywords = article.entities?.map((e) => e.name).slice(0, 3) || [];

    // Build query params
    const params = new URLSearchParams();
    categories.forEach((category) => params.append("categories", category));
    keywords.forEach((keyword) => params.append("keywords", keyword));
    params.append("limit", "5");
    params.append("exclude", article._id);

    const response = await fetch(`/api/news/related?${params.toString()}`);
    const result = await response.json();

    const container = document.getElementById("related-articles");

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = '<p class="text-center text-muted py-3">No related articles found</p>';
      return;
    }

    container.innerHTML = "";
    result.data.forEach((related) => {
      const date = new Date(related.publishedAt).toLocaleDateString();
      const item = document.createElement("a");

      // Use slug for URL if available
      item.href = related.slug ? `/news/${related.slug}` : `/news/${related._id}`;

      item.className = "list-group-item list-group-item-action";
      item.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${related.title}</h6>
                </div>
                <small class="text-muted">${related.source.name} - ${date}</small>
            `;
      container.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading related articles:", error);
    document.getElementById("related-articles").innerHTML =
      '<p class="text-center text-muted py-3">Could not load related articles</p>';
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
