"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { fetchTrendingKeywords, cacheUtils } from "@/lib/api";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import { useRouter } from "next/navigation";

export default function Header() {
  const [showingAllSources, setShowingAllSources] = useState(true);
  const [trendingKeywords, setTrendingKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Set isClient to true on component mount
    setIsClient(true);

    // Load trending keywords only once on client-side mount
    const loadKeywords = async () => {
      setIsLoading(true);
      try {
        const response = await fetchTrendingKeywords();
        if (response.success && response.data && response.data.keywords) {
          setTrendingKeywords(response.data.keywords.slice(0, 5));
        }
      } catch (error) {
        console.error("Error loading trending keywords:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load keywords immediately
    loadKeywords();

    // Set up an interval to refresh the trends cache occasionally
    // This ensures the next components get fresh data when they need it
    const refreshInterval = setInterval(() => {
      // Refresh the trends cache in the background
      cacheUtils.refreshTrendsCache();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const handleToggleSources = () => {
    if (!isClient) return;

    setShowingAllSources(!showingAllSources);

    // Update URL without reloading the page
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.set("filter", showingAllSources ? "mine" : "all");

    const newUrl = `${path}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);

    // Emit event for other components to react to
    const event = new CustomEvent("sourceFilterChanged", {
      detail: { showAll: !showingAllSources },
    });
    document.dispatchEvent(event);
  };

  // Basic navigation for server-side rendering
  const staticNav = (
    <header>
      <nav className="navbar navbar-expand-lg sticky-top">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" href="/">
            <span className="fs-4 fw-bold text-primary">NewsWorld</span>
          </Link>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 flex justify-around flex-1">
              <li className="nav-item">
                <Link className="nav-link" href="/">
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/news">
                  News
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/stories">
                  Stories
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/trends">
                  Trends
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/sentiment">
                  Sentiment
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/sources">
                  Sources
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );

  // If not client-side yet, return a simpler version for SSR
  if (!isClient) {
    return staticNav;
  }

  // Full client-side rendered header
  return (
    <header>
      <nav className="navbar navbar-expand-lg sticky-top">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" href="/">
            <span className="fs-4 fw-bold text-primary">NewsWorld</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 flex justify-around flex-1">
              <li className="nav-item">
                <Link className="nav-link" href="/">
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/news">
                  News
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/stories">
                  Stories
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/trends">
                  Trends
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/sentiment">
                  Sentiment
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/sources">
                  Sources
                </Link>
              </li>
            </ul>

            <form
              className="d-flex"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const searchTerm = e.target.elements.search.value;
                if (searchTerm) {
                  window.location.href = `/news?search=${encodeURIComponent(searchTerm)}`;
                }
              }}
            >
              <input
                className="form-control me-2"
                type="search"
                name="search"
                placeholder="Search news..."
                aria-label="Search"
              />
              <button className="btn btn-primary" type="submit">
                <i className="bi bi-search"></i>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Trending Keywords Ticker */}
      <div className="container-fluid bg-light py-1 mb-4">
        <div className="container d-flex align-items-center">
          <div className="text-primary fw-bold me-3">
            <i className="bi bi-graph-up-arrow me-1"></i> Trending:
          </div>

          <div className="trending-swiper position-relative flex-grow-1">
            {isLoading ? (
              <div className="text-muted">Loading trending topics...</div>
            ) : trendingKeywords.length > 0 ? (
              <Swiper
                modules={[Autoplay]}
                slidesPerView="auto"
                spaceBetween={30}
                loop={true}
                loopAdditionalSlides={5}
                autoplay={{
                  delay: 2000,
                  disableOnInteraction: false,
                }}
                speed={800}
                className="w-100"
                style={{
                  width: "100%",
                  overflow: "visible",
                }}
              >
                {trendingKeywords.map((keyword, index) => (
                  <SwiperSlide key={index} style={{ width: "auto", marginRight: "20px" }}>
                    <Link
                      href={`/news?search=${encodeURIComponent(keyword.word || keyword.keyword || keyword)}`}
                      className="text-decoration-none"
                    >
                      <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                        {keyword.word || keyword.keyword || keyword}
                        {keyword.count ? ` (${keyword.count})` : ""}
                      </span>
                    </Link>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="text-muted">No trending topics available</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
