'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsCard from '@/components/NewsCard';
import Link from 'next/link';
import Image from 'next/image';
import { getArticleImage } from '@/lib/imageService';

export default function StoryContent({ story }) {
  // Add state to handle hydration
  const [isClient, setIsClient] = useState(false);

  // This effect runs only on the client after hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Format dates
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get a contextual image based on story properties
  const heroImage = getArticleImage({
    title: story.title,
    _id: story._id,
    category: story.categories?.[0],
    sentiment: story.sentiment || 0
  }, 1200, 600);
  
  // Create a timeline from article dates if available
  const timelineEvents = story.articles?.map(article => ({
    date: new Date(article.publishedAt),
    title: article.title,
    description: article.description,
    source: article.source?.name,
    url: `/news/${article._id}`
  })) || [];
  
  // Sort timeline events by date
  timelineEvents.sort((a, b) => a.date - b.date);
  
  // Fallback timeline if none available
  if (timelineEvents.length === 0) {
    timelineEvents.push(
      {
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        title: 'Story Begins',
        description: `First reports emerge about ${story.title.split(':')[0]}`,
        source: 'Various Sources'
      },
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        title: 'Developments Unfold',
        description: 'New information and perspectives emerge as the story develops',
        source: 'Multiple Publications'
      },
      {
        date: new Date(),
        title: 'Latest Updates',
        description: 'The story continues to evolve with new developments',
        source: 'Recent Coverage'
      }
    );
  }
  
  // Get related articles or use articles from story if available
  const relatedArticles = story.articles || [];
  
  // If not yet hydrated, show a simplified version to avoid hydration mismatch
  if (!isClient) {
    return (
      <>
        <Header />
        <main>
          <div className="container py-5">
            <div className="row">
              <div className="col-12">
                <h1 className="mb-4">{story.title}</h1>
                <p className="lead">{story.description}</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  return (
    <>
      <Header />
      
      <main>
        {/* Hero Section */}
        <section 
          className="story-hero py-5"
          style={{ 
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white'
          }}
        >
          <div className="container py-4">
            <div className="row">
              <div className="col-lg-8">
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {story.categories?.map((category, idx) => (
                    <Link 
                      key={idx} 
                      href={`/stories?category=${encodeURIComponent(category)}`}
                      className="badge bg-primary text-decoration-none"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
                
                <h1 className="display-4 fw-bold mb-3">{story.title}</h1>
                
                <p className="lead mb-4">{story.description}</p>
                
                <div className="d-flex flex-wrap align-items-center gap-3 text-white-50">
                  <div>
                    <i className="bi bi-calendar-event me-1"></i> 
                    Updated: {formatDate(story.updatedAt || new Date())}
                  </div>
                  
                  <div>
                    <i className="bi bi-newspaper me-1"></i> 
                    {story.articleCount || relatedArticles.length || 0} articles
                  </div>
                  
                  {story.impact && (
                    <div>
                      <i className="bi bi-graph-up me-1"></i> 
                      {story.impact.charAt(0).toUpperCase() + story.impact.slice(1)} Impact
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Main Content */}
        <div className="container py-5">
          <div className="row">
            {/* Story Content */}
            <div className="col-lg-8">
              {/* Summary Section */}
              <section className="mb-5">
                <h2>Summary</h2>
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <p className="lead">{story.summary || story.description}</p>
                    
                    {story.content && (
                      <div className="mt-4" dangerouslySetInnerHTML={{ __html: story.content }}></div>
                    )}
                    
                    {!story.content && story.summary !== story.description && (
                      <p>{story.description}</p>
                    )}
                    
                    {/* Keywords/tags */}
                    {story.keywords && story.keywords.length > 0 && (
                      <div className="mt-4">
                        <h3 className="h6">Related Topics:</h3>
                        <div className="d-flex flex-wrap gap-2">
                          {story.keywords.map((keyword, index) => (
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
                  </div>
                </div>
              </section>
              
              {/* Timeline Section */}
              <section className="mb-5">
                <h2>Timeline</h2>
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="timeline">
                      {timelineEvents.map((event, index) => (
                        <div key={index} className={`timeline-item ${index % 2 === 0 ? 'left' : 'right'}`}>
                          <div className="timeline-dot"></div>
                          <div className="timeline-date">{formatDate(event.date)}</div>
                          <div className="timeline-content">
                            <h3 className="h5">{event.title}</h3>
                            <p>{event.description}</p>
                            <div className="text-muted small">
                              <span>{event.source}</span>
                              {event.url && (
                                <Link href={event.url} className="ms-2">
                                  Read More
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Related Articles Section */}
              <section className="mb-5">
                <h2>Related Articles</h2>
                <div className="row g-4">
                  {relatedArticles.length > 0 ? (
                    relatedArticles.slice(0, 6).map((article) => (
                      <div className="col-md-6" key={article._id}>
                        <NewsCard article={article} />
                      </div>
                    ))
                  ) : (
                    <div className="col">
                      <p className="text-muted">No related articles available yet.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
            
            {/* Sidebar */}
            <div className="col-lg-4">
              {/* Key Facts */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h3 className="h5 mb-0">Key Facts</h3>
                </div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    {story.keyFacts && story.keyFacts.length > 0 ? (
                      story.keyFacts.map((fact, index) => (
                        <li key={index} className="list-group-item">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          {fact}
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="list-group-item">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          This story contains {story.articleCount || relatedArticles.length || 'multiple'} related articles
                        </li>
                        <li className="list-group-item">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          Last updated on {formatDate(story.updatedAt || new Date())}
                        </li>
                        <li className="list-group-item">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          Related categories: {story.categories?.join(', ') || 'Various'}
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              
              {/* Entities Mentioned */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h3 className="h5 mb-0">Related Topics</h3>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-wrap gap-2">
                    {story.entities && story.entities.length > 0 ? (
                      story.entities.map((entity, index) => (
                        <Link 
                          key={index}
                          href={`/news?search=${encodeURIComponent(entity.name || entity)}`}
                          className="badge bg-light text-dark text-decoration-none p-2"
                        >
                          {entity.name || entity}
                        </Link>
                      ))
                    ) : story.keywords && story.keywords.length > 0 ? (
                      story.keywords.map((keyword, index) => (
                        <Link 
                          key={index}
                          href={`/news?search=${encodeURIComponent(keyword)}`}
                          className="badge bg-light text-dark text-decoration-none p-2"
                        >
                          {keyword}
                        </Link>
                      ))
                    ) : (
                      <p className="text-muted">No related topics available.</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Sources */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h3 className="h5 mb-0">Sources</h3>
                </div>
                <div className="card-body">
                  {story.sources && story.sources.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {story.sources.map((source, index) => (
                        <li key={index} className="list-group-item d-flex align-items-center">
                          <span className="me-auto">{source.name}</span>
                          <span className="badge bg-primary rounded-pill">{source.count || 1}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">Source information not available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
} 