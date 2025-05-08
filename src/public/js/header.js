// Handle sources toggle
let showingAllSources = true;
let trendingSwiper = null; // Track the swiper instance

document.addEventListener("load", function () {
  console.log("Header.js:kjhkhjkh DOM Content Loaded");
  const mainNavbar = document.getElementById("mainNavbar");
  console.log(mainNavbar);
  if (mainNavbar) {
    console.log("Found mainNavbar element, setting initial opacity");
    const pathname = window.location.pathname;
    if (pathname != "/" || pathname != "/news") {
      mainNavbar.style.setProperty("--bs-bg-opacity", 0.8);
    }
  } else {
    console.error("mainNavbar element not found in DOM!");
  }
});

window.addEventListener("scroll", () => {
  const navbar = document.getElementById("mainNavbar");
  const maxOpacity = 0.95;
  const minOpacity = 0.1;
  const maxScroll = 100; // pixels
  const pathname = window.location.pathname;

  const scrollY = window.scrollY;
  var opacity = Math.min(maxOpacity, minOpacity + (scrollY / maxScroll) * (maxOpacity - minOpacity)).toFixed(2);

  navbar.style.setProperty("--bs-bg-opacity", opacity);
});

// Immediately make updateTrendingKeywords globally available
window.updateTrendingKeywords = function (keywords) {
  console.log("updateTrendingKeywords called with", keywords.length, "keywords");
  const keywordsContainer = document.getElementById("trending-keywords");
  if (!keywordsContainer) {
    console.error("trending-keywords container not found in DOM!");
    return;
  }

  // Clear existing content
  keywordsContainer.innerHTML = "";

  // Add new slides
  if (keywords && keywords.length) {
    keywords.forEach((keyword) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";

      const link = document.createElement("a");
      link.href = `/news?search=${encodeURIComponent(keyword.word || keyword.keyword)}`;
      link.textContent = `${keyword.word || keyword.keyword} (${keyword.count})`;

      slide.appendChild(link);
      keywordsContainer.appendChild(slide);
    });
  } else {
    // If no keywords available, show a message
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.textContent = "No trending topics available";
    keywordsContainer.appendChild(slide);
  }

  // Initialize or reinitialize swiper after content has been added
  console.log("Initializing Swiper after updating keywords");
  setTimeout(() => {
    initTrendingSwiper();
  }, 100);
};

document.addEventListener("DOMContentLoaded", function () {
  console.log("Header.js: DOM Content Loaded");

  const toggleBtn = document.getElementById("toggleSourcesBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      showingAllSources = !showingAllSources;
      const icon = document.getElementById("toggleSourcesIcon");
      const text = document.getElementById("toggleSourcesText");

      if (showingAllSources) {
        icon.classList.remove("bi-toggle-on");
        icon.classList.add("bi-toggle-off");
        text.textContent = "All Sources";
      } else {
        icon.classList.remove("bi-toggle-off");
        icon.classList.add("bi-toggle-on");
        text.textContent = "My Sources";
      }

      // Update the current page based on the toggle state
      updatePageContent(showingAllSources);
    });
  }

  // Initialize Trending Keywords Swiper if it exists on page load
  if (document.querySelector(".trending-swiper")) {
    console.log("Found trending-swiper element, initializing Swiper");
    // We'll initialize swiper after fetching data
    // Let the trending-keywords.js fetch the data first
    setTimeout(() => {
      if (!trendingSwiper) {
        console.log("No Swiper instance found after delay, initializing");
        initTrendingSwiper();
      }
    }, 1000); // Fallback initialization if for some reason data wasn't fetched
  } else {
    console.warn("No trending-swiper element found in DOM");
  }
});

// Function to update page content based on toggle state
function updatePageContent(showAll) {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  params.set("filter", showAll ? "all" : "mine");

  // Update URL without reloading the page
  const newUrl = `${path}?${params.toString()}`;
  window.history.pushState({}, "", newUrl);

  // Trigger page-specific content update
  const event = new CustomEvent("sourceFilterChanged", {
    detail: { showAll },
  });
  document.dispatchEvent(event);
}

// Initialize Trending Keywords Swiper
function initTrendingSwiper() {
  console.log("Initializing trending swiper");
  const swiperElement = document.querySelector(".trending-swiper");
  if (!swiperElement) {
    console.error("Could not find trending-swiper element!");
    return;
  }

  // Destroy existing swiper instance if it exists
  if (trendingSwiper && trendingSwiper.destroy) {
    console.log("Destroying existing swiper instance");
    trendingSwiper.destroy(true, true);
    trendingSwiper = null;
  }

  // Ensure Swiper is available
  if (typeof Swiper === "undefined") {
    console.error("Swiper library not loaded!");
    return;
  }

  // Create new swiper instance
  try {
    console.log("Creating new Swiper instance");
    trendingSwiper = new Swiper(".trending-swiper", {
      slidesPerView: "auto",
      spaceBetween: 30,
      loop: true,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
      speed: 1000,
      breakpoints: {
        320: {
          slidesPerView: 1,
        },
        640: {
          slidesPerView: 2,
        },
        992: {
          slidesPerView: 3,
        },
        1200: {
          slidesPerView: 4,
        },
      },
    });
    console.log("Swiper successfully initialized");
  } catch (error) {
    console.error("Error initializing Swiper:", error);
  }
}
