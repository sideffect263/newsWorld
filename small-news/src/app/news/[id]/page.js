import { fetchArticle, fetchNews } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsCard from '@/components/NewsCard';
import Image from 'next/image';
import Link from 'next/link';
import { getArticleImage } from '@/lib/imageService';

// Generate metadata for the article page
export async function generateMetadata({ params }) {
  const articleId = params.id;
  
  try {
    // Properly extract article from the response
    const articleResponse = await fetchArticle(articleId);
    
    if (!articleResponse.success || !articleResponse.data || !articleResponse.data.article) {
      throw new Error('Article not found for metadata');
    }
    
    const article = articleResponse.data.article;
    
    return {
      title: `${article.title} | NewsWorld`,
      description: article.description || 'Read this article on NewsWorld',
      openGraph: {
        title: article.title,
        description: article.description,
        url: `https://newsworld.com/news/${articleId}`,
        type: 'article',
        images: article.imageUrl ? [{ url: article.imageUrl }] : [],
        publishedTime: article.publishedAt,
        section: article.category,
        tags: article.keywords || [],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.description,
        images: article.imageUrl ? [article.imageUrl] : [],
      },
    };
  } catch (error) {
    console.error('Error generating article metadata:', error);
    return {
      title: 'Article Not Found | NewsWorld',
      description: 'The requested article could not be found.',
    };
  }
}

export default async function ArticlePage({ params }) {
  const articleId = params.id;
  
  try {
    console.log(`Attempting to fetch article with ID: ${articleId}`);
    
    // Fetch the article data
    const articleResponse = await fetchArticle(articleId);
    console.log('Article API response:', JSON.stringify(articleResponse, null, 2));
    
    // Check if article was found - handle different error conditions
    if (!articleResponse.success || articleResponse.error) {
      console.error('Article fetch error:', articleResponse.error);
      throw new Error('Article not found');
    }
    
    if (!articleResponse.data || !articleResponse.data.article) {
      console.error('No article data in response:', JSON.stringify(articleResponse.data));
      throw new Error('Article data missing');
    }
    
    const article = articleResponse.data.article;
    console.log('Successfully extracted article:', article.title);
    
    // Validate essential article fields
    if (!article.title) {
      console.error('Invalid article data (missing title):', article);
      throw new Error('Invalid article data');
    }
    
    // Format date
    const formattedDate = article.publishedAt 
      ? new Date(article.publishedAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Publication date unknown';
    
    // Fetch related articles
    const relatedNewsResponse = await fetchNews({
      category: article.category,
      limit: 3,
      excludeIds: [articleId],
    }).catch(err => {
      console.error('Error fetching related articles:', err);
      return { success: false, data: { articles: [] } };
    });
    
    const relatedArticles = relatedNewsResponse.success && relatedNewsResponse.data ? 
      (relatedNewsResponse.data.articles || []) : [];
    
    // Get contextually relevant image based on article properties
    const imageSrc = getArticleImage(article, 1200, 600);
    
    // Get sentiment class and text
    const getSentimentClass = (score) => {
      if (score > 0.2) return 'text-success';
      if (score < -0.2) return 'text-danger';
      return 'text-secondary';
    };
    
    const getSentimentText = (score) => {
      if (score > 0.2) return 'Positive';
      if (score < -0.2) return 'Negative';
      return 'Neutral';
    };

    // Calculate estimated reading time
    const calculateReadingTime = (content) => {
      if (!content) return '< 1 min';
      const wordsPerMinute = 200;
      const textLength = content.split(/\s+/).length;
      const readingTime = Math.ceil(textLength / wordsPerMinute);
      return `${readingTime} min read`;
    };
    
    const readingTime = calculateReadingTime(article.content);
    
    // Get entity counts by type
    const getEntityCounts = (entities = []) => {
      return entities.reduce((acc, entity) => {
        if (!acc[entity.type]) acc[entity.type] = [];
        // Only add unique entities
        if (!acc[entity.type].find(e => e.name === entity.name)) {
          acc[entity.type].push(entity);
        }
        return acc;
      }, {});
    };
    
    const entityCounts = getEntityCounts(article.entities);
    
    // Check if article has location data
    const hasLocationData = article.entities && article.entities.some(e => 
      e.type === 'location' && e.coordinates && e.coordinates.lat && e.coordinates.lng
    );
    
    return (
      <>
        <Header />
        
        <main className="container py-5">
          <div className="row">
            {/* Article Content */}
            <div className="col-lg-8">
              {/* Breadcrumb navigation */}
              <nav aria-label="breadcrumb" className="mb-4">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link href="/">Home</Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link href="/news">News</Link>
                  </li>
                  {article.category && (
                    <li className="breadcrumb-item">
                      <Link href={`/news?category=${article.category}`}>
                        {article.category}
                      </Link>
                    </li>
                  )}
                  <li className="breadcrumb-item active" aria-current="page">
                    Article
                  </li>
                </ol>
              </nav>
              
              {/* Breaking News Alert */}
              {article.isBreakingNews && (
                <div className="alert alert-danger mb-4" role="alert">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle-fill fs-4 me-2"></i>
                    <strong>BREAKING NEWS</strong>
                  </div>
                </div>
              )}
              
              {/* Article title and metadata */}
              <h1 className="mb-3">{article.title}</h1>
              
              <div className="d-flex flex-wrap align-items-center text-muted mb-4">
                <div className="me-4">
                  <i className="bi bi-calendar-event me-1"></i> {formattedDate}
                </div>
                <div className="me-4">
                  <i className="bi bi-building me-1"></i> {article.source?.name || 'Unknown Source'}
                </div>
                {article.author && (
                  <div className="me-4">
                    <i className="bi bi-person me-1"></i> {article.author}
                  </div>
                )}
                {article.category && (
                  <div className="me-4">
                    <i className="bi bi-bookmark me-1"></i> 
                    <Link href={`/news?category=${article.category}`} className="text-decoration-none text-muted">
                      {article.category}
                    </Link>
                  </div>
                )}
                {article.viewCount !== undefined && (
                  <div className="me-4">
                    <i className="bi bi-eye me-1"></i> {article.viewCount.toLocaleString()} views
                  </div>
                )}
                <div className="me-4">
                  <i className="bi bi-clock me-1"></i> {readingTime}
                </div>
                {article.sentimentScore !== undefined && (
                  <div className={getSentimentClass(article.sentimentScore)}>
                    <i className="bi bi-emoji-smile me-1"></i> {getSentimentText(article.sentimentScore)}
                  </div>
                )}
              </div>
              
              {/* Country flags if available */}
              {article.countries && article.countries.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="text-muted">Coverage: </span>
                    {article.countries.map(country => (
                      <span 
                        key={country} 
                        className="badge bg-light text-dark border"
                        title={country}
                      >
                        <span className={`flag-icon flag-icon-${country.toLowerCase()}`}></span>
                        {' '}{country}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Article image */}
              <div className="article-image mb-4 rounded overflow-hidden">
                <Image 
                  src={imageSrc}
                  alt={article.title}
                  width={800}
                  height={450}
                  className="img-fluid w-100"
                  style={{ objectFit: 'cover' }}
                  priority
                />
                {article.imageCaption && (
                  <div className="bg-light p-2 text-center">
                    <small>{article.imageCaption}</small>
                  </div>
                )}
              </div>
              
              {/* Article description */}
              {article.description && (
                <div className="lead mb-4">
                  {article.description}
                </div>
              )}
              
              {/* Article content */}
              <div className="article-content mb-5">
                {article.content ? (
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                ) : (
                  <p>
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      Read Full Article at Source <i className="bi bi-box-arrow-up-right ms-1"></i>
                    </a>
                  </p>
                )}
              </div>
              
              {/* Entity Information */}
              {article.entities && article.entities.length > 0 && (
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h5 className="mb-0">Key Entities Mentioned</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      {/* People Mentioned */}
                      {entityCounts.person && entityCounts.person.length > 0 && (
                        <div className="col-md-4">
                          <h6 className="fw-bold"><i className="bi bi-people me-2"></i>People</h6>
                          <ul className="list-unstyled mb-0">
                            {entityCounts.person.slice(0, 5).map((entity, idx) => (
                              <li key={`person-${idx}`} className="mb-1">
                                <Link 
                                  href={`/news?search=${encodeURIComponent(entity.name)}`}
                                  className="text-decoration-none"
                                >
                                  {entity.name}
                                </Link>
                                {entity.count > 1 && <span className="text-muted ms-1">({entity.count})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Organizations Mentioned */}
                      {entityCounts.organization && entityCounts.organization.length > 0 && (
                        <div className="col-md-4">
                          <h6 className="fw-bold"><i className="bi bi-building me-2"></i>Organizations</h6>
                          <ul className="list-unstyled mb-0">
                            {entityCounts.organization.slice(0, 5).map((entity, idx) => (
                              <li key={`org-${idx}`} className="mb-1">
                                <Link 
                                  href={`/news?search=${encodeURIComponent(entity.name)}`}
                                  className="text-decoration-none"
                                >
                                  {entity.name}
                                </Link>
                                {entity.count > 1 && <span className="text-muted ms-1">({entity.count})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Locations Mentioned */}
                      {(entityCounts.location || entityCounts.city || entityCounts.country) && (
                        <div className="col-md-4">
                          <h6 className="fw-bold"><i className="bi bi-geo-alt me-2"></i>Locations</h6>
                          <ul className="list-unstyled mb-0">
                            {[...(entityCounts.location || []), ...(entityCounts.city || []), ...(entityCounts.country || [])].slice(0, 5).map((entity, idx) => (
                              <li key={`location-${idx}`} className="mb-1">
                                <Link 
                                  href={`/news?search=${encodeURIComponent(entity.name)}`}
                                  className="text-decoration-none"
                                >
                                  {entity.name}
                                </Link>
                                {entity.formattedAddress && <small className="text-muted ms-1">({entity.formattedAddress})</small>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {/* Map if location data available */}
                    {hasLocationData && (
                      <div className="mt-3">
                        <h6 className="fw-bold"><i className="bi bi-map me-2"></i>Mentioned Locations</h6>
                        <div className="bg-light rounded" style={{ height: '200px' }}>
                          {/* Interactive map would be implemented here */}
                          <div className="d-flex align-items-center justify-content-center h-100">
                            <p className="text-muted mb-0">Location map would be displayed here</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Story References - if article is part of a larger story */}
              {article.storyReferences && article.storyReferences.length > 0 && (
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="bi bi-collection me-2"></i>
                      Part of a Larger Story
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="timeline">
                      {/* Timeline visualization would be implemented here */}
                      <p className="text-muted">
                        This article is part of a developing story. 
                        <Link href={`/stories/${article.storyReferences[0]}`} className="ms-2">
                          View Full Timeline <i className="bi bi-arrow-right"></i>
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Keywords/tags */}
              {article.keywords && article.keywords.length > 0 && (
                <div className="mb-4">
                  <h5>Related Topics:</h5>
                  <div className="d-flex flex-wrap gap-2">
                    {article.keywords.map((keyword, index) => (
                      <Link 
                        key={index}
                        href={`/news?search=${encodeURIComponent(keyword)}`}
                        className="badge rounded-pill bg-light text-dark text-decoration-none"
                      >
                        {keyword}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Source link */}
              {article.url && (
                <div className="alert alert-secondary" role="alert">
                  <strong>Original Source:</strong>{' '}
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="alert-link"
                  >
                    {article.url} <i className="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
              )}
              
              {/* Share links */}
              <div className="mt-4 mb-5">
                <h5>Share This Article:</h5>
                <div className="d-flex gap-2">
                  <a 
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                      `https://newsworld.com/news/${articleId}`
                    )}&text=${encodeURIComponent(article.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-twitter"></i> Twitter
                  </a>
                  <a 
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      `https://newsworld.com/news/${articleId}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-facebook"></i> Facebook
                  </a>
                  <a 
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
                      `https://newsworld.com/news/${articleId}`
                    )}&title=${encodeURIComponent(article.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-linkedin"></i> LinkedIn
                  </a>
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="col-lg-4">
              {/* Article Metrics */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="mb-0">Article Metrics</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-3">
                    <span>Views</span>
                    <span className="fw-bold">{article.viewCount?.toLocaleString() || 0}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Published</span>
                    <span className="fw-bold">{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Reading Time</span>
                    <span className="fw-bold">{readingTime}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Sentiment</span>
                    <span className={`fw-bold ${getSentimentClass(article.sentimentScore)}`}>
                      {getSentimentText(article.sentimentScore)}
                    </span>
                  </div>
                  {article.source?.url && (
                    <div className="d-grid mt-3">
                      <a 
                        href={article.source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-secondary"
                      >
                        Visit Source <i className="bi bi-box-arrow-up-right ms-1"></i>
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Related Articles */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="mb-0">Related Articles</h5>
                </div>
                <div className="card-body">
                  {relatedArticles.length > 0 ? (
                    relatedArticles.map(relatedArticle => (
                      <NewsCard key={relatedArticle._id} article={relatedArticle} />
                    ))
                  ) : (
                    <p className="text-muted">No related articles found.</p>
                  )}
                </div>
              </div>
              
              {/* Categories */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="mb-0">Categories</h5>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <Link href="/news?category=politics" className="btn btn-outline-secondary text-start">
                      Politics
                    </Link>
                    <Link href="/news?category=business" className="btn btn-outline-secondary text-start">
                      Business
                    </Link>
                    <Link href="/news?category=technology" className="btn btn-outline-secondary text-start">
                      Technology
                    </Link>
                    <Link href="/news?category=health" className="btn btn-outline-secondary text-start">
                      Health
                    </Link>
                    <Link href="/news?category=science" className="btn btn-outline-secondary text-start">
                      Science
                    </Link>
                    <Link href="/news?category=entertainment" className="btn btn-outline-secondary text-start">
                      Entertainment
                    </Link>
                    <Link href="/news?category=sports" className="btn btn-outline-secondary text-start">
                      Sports
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </>
    );
  } catch (error) {
    // Handle article not found
    return (
      <>
        <Header />
        
        <main className="container py-5 text-center">
          <div className="py-5">
            <i className="bi bi-exclamation-triangle display-1 text-warning"></i>
            <h1 className="mt-4">Article Not Found</h1>
            <p className="lead text-muted">
              The article you're looking for doesn't exist or has been removed.
            </p>
            
            {/* Demo Articles - provide some content even when API fails */}
            <div className="mt-5">
              <h5>Try our demo articles instead:</h5>
              <div className="d-flex flex-wrap justify-content-center gap-3 mt-3">
                <Link href="/news/demo-article-1" className="btn btn-outline-primary">
                  Climate Summit Demo
                </Link>
                <Link href="/news/demo-article-2" className="btn btn-outline-primary">
                  AI Technology Demo
                </Link>
                <Link href="/news/demo-article-3" className="btn btn-outline-primary">
                  Economy News Demo
                </Link>
              </div>
            </div>
            
            <Link href="/news" className="btn btn-primary mt-4">
              Browse All News
            </Link>
          </div>
        </main>
        
        <Footer />
      </>
    );
  }
} 