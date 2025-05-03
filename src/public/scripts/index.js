// Load header
fetch("/components/header.html")
  .then((response) => response.text())
  .then((html) => {
    document.getElementById("header").innerHTML = html;
  });

// Load latest news preview
async function loadLatestNews() {
  try {
    const response = await fetch("/api/news/latest?limit=3");
    const result = await response.json();

    if (result.success) {
      const newsContainer = document.getElementById("latestNewsPreview");
      newsContainer.innerHTML = result.data
        .map(
          (article) => `
                <div class="col-md-4">
                    <div class="card news-preview">
                        <div class="">
                            <div class="col-md-4" style="width: 100%;">
                                <img src="${article.imageUrl || "https://via.placeholder.com/300x200?text=No+Image"}" 
                                     class="img-fluid rounded-start h-100" 
                                     alt="${article.title}"
                                     style="object-fit: cover;">
                            </div>
                            <div class="col-md-8">
                                <div class="card-body">
                                    <div class="category-badge">${article.categories[0]}</div>
                                    <h5 class="card-title">${article.title}</h5>
                                    <div class="sentiment-indicator sentiment-${
                                      article.sentimentAssessment || "neutral"
                                    } mb-2">
                                        <i class="bi bi-emoji-${
                                          article.sentimentAssessment === "positive"
                                            ? "smile"
                                            : article.sentimentAssessment === "negative"
                                            ? "frown"
                                            : "neutral"
                                        }"></i>
                                        ${
                                          article.sentimentAssessment
                                            ? article.sentimentAssessment.charAt(0).toUpperCase() +
                                              article.sentimentAssessment.slice(1)
                                            : "Neutral"
                                        } Sentiment
                                    </div>
                                    <p class="card-text">${article.description || ""}</p>
                                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
                                        <small class="text-muted">${new Date(
                                          article.publishedAt,
                                        ).toLocaleDateString()}</small>
                                        <div class="d-flex gap-2">
                                            <a href="/news/${article._id}" class="btn btn-sm btn-primary">
                                                <i class="bi bi-newspaper me-1"></i> Read on NewsWorld
                                            </a>
                                            <a href="${
                                              article.url
                                            }" target="_blank" class="btn btn-sm btn-outline-secondary">
                                                <i class="bi bi-box-arrow-up-right me-1"></i> Source
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
        )
        .join("");
    }
  } catch (error) {
    console.error("Error loading latest news:", error);
    // Provide fallback news data with images
    const fallbackNews = [
      {
        _id: "news1",
        title: "Global Climate Summit Reaches Historic Agreement",
        description:
          "After intense negotiations, world leaders have agreed to ambitious climate goals including significant carbon reduction targets by 2030.",
        categories: ["Politics"],
        sentimentAssessment: "positive",
        publishedAt: new Date(),
        url: "#",
        imageUrl: "https://picsum.photos/300/200?random=1",
      },
      {
        _id: "news2",
        title: "Technology Giants Face New Antitrust Regulations",
        description:
          "Major tech companies are preparing for stricter oversight as legislators introduce comprehensive antitrust legislation.",
        categories: ["Technology"],
        sentimentAssessment: "neutral",
        publishedAt: new Date(),
        url: "#",
        imageUrl: "https://picsum.photos/300/200?random=2",
      },
      {
        _id: "news3",
        title: "Economic Downturn Feared as Markets Show Volatility",
        description:
          "Financial analysts warn of potential recession as global markets experience significant fluctuations amid geopolitical tensions.",
        categories: ["Business"],
        sentimentAssessment: "negative",
        publishedAt: new Date(),
        url: "#",
        imageUrl: "https://picsum.photos/300/200?random=3",
      },
    ];

    const newsContainer = document.getElementById("latestNewsPreview");
    newsContainer.innerHTML = fallbackNews
      .map(
        (article) => `
            <div class="col-md-4">
                <div class="card news-preview">
                    <div class="">
                        <div class="col-md-4" style="width: 100%;">
                            <img src="${article.imageUrl}" 
                                 class="img-fluid rounded-start h-100" 
                                 alt="${article.title}"
                                 style="object-fit: cover;">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <div class="category-badge">${article.categories[0]}</div>
                                <h5 class="card-title">${article.title}</h5>
                                <div class="sentiment-indicator sentiment-${
                                  article.sentimentAssessment || "neutral"
                                } mb-2">
                                    <i class="bi bi-emoji-${
                                      article.sentimentAssessment === "positive"
                                        ? "smile"
                                        : article.sentimentAssessment === "negative"
                                        ? "frown"
                                        : "neutral"
                                    }"></i>
                                    ${
                                      article.sentimentAssessment
                                        ? article.sentimentAssessment.charAt(0).toUpperCase() +
                                          article.sentimentAssessment.slice(1)
                                        : "Neutral"
                                    } Sentiment
                                </div>
                                <p class="card-text">${article.description || ""}</p>
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
                                    <small class="text-muted">${new Date(
                                      article.publishedAt,
                                    ).toLocaleDateString()}</small>
                                    <div class="d-flex gap-2">
                                        <a href="#" class="btn btn-sm btn-primary">
                                            <i class="bi bi-newspaper me-1"></i> Read on NewsWorld
                                        </a>
                                        <a href="#" target="_blank" class="btn btn-sm btn-outline-secondary">
                                            <i class="bi bi-box-arrow-up-right me-1"></i> Source
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  }
}

// Load latest news when page loads
document.addEventListener("DOMContentLoaded", loadLatestNews);
