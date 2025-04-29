"use client";

import Link from 'next/link';
import Image from 'next/image';
import { getArticleImage } from '@/lib/imageService';

export default function NewsCard({ article }) {
  if (!article) return null;
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Calculate estimated reading time
  const calculateReadingTime = (content) => {
    if (!content) return '2 min read';
    
    // Count words in content (rough estimate)
    const wordCount = content.split(/\s+/).length;
    // Average reading speed: 200 words per minute
    const readingTimeMinutes = Math.ceil(wordCount / 200);
    return `${readingTimeMinutes} min read`;
  };
  
  // Get sentiment class based on score
  const getSentimentClass = (score) => {
    if (score > 0.2) return 'sentiment-positive';
    if (score < -0.2) return 'sentiment-negative';
    return 'sentiment-neutral';
  };
  
  // Get sentiment text based on score
  const getSentimentText = (score) => {
    if (score > 0.2) return 'Positive';
    if (score < -0.2) return 'Negative';
    return 'Neutral';
  };
  
  // Get a contextually relevant image based on article properties
  const imageSrc = getArticleImage(article, 500, 300);
  
  // Extract categories (could be in article.categories or article.category)
  const categories = article.categories || (article.category ? [article.category] : []);
  
  return (
    <div className="news-preview position-relative h-100 shadow-sm border rounded">
      {categories.length > 0 && (
        <span className="category-badge badge bg-primary position-absolute top-0 start-0 m-2 z-1">
          {categories[0]}
        </span>
      )}
      
      <div className="position-relative overflow-hidden" style={{ height: '200px' }}>
        <Image 
          src={imageSrc}
          alt={article.title}
          fill
          style={{ objectFit: 'cover' }}
          className="transition-transform hover-zoom"
          unoptimized // Needed for external image URLs
        />
      </div>
      
      <div className="p-3 d-flex flex-column h-100">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted fw-medium">
            {article.source?.name || 'Unknown Source'}
          </small>
          
          <small className="text-muted">
            {formatDate(article.publishedAt)}
          </small>
        </div>
        
        <h5 className="card-title mb-2 fw-bold">
          <Link href={`/news/${article._id}`} className="text-decoration-none text-dark stretched-link">
            {article.title}
          </Link>
        </h5>
        
        <p className="card-text text-secondary mb-3 flex-grow-1">
          {article.description?.substring(0, 120)}
          {article.description?.length > 120 ? '...' : ''}
        </p>
        
        <div className="d-flex justify-content-between align-items-center mt-auto">
          <div className="d-flex align-items-center gap-2">
            {article.author && (
              <small className="text-muted">
                <i className="bi bi-person me-1"></i> {article.author.split(' ')[0]}
              </small>
            )}
            <small className="text-muted">
              <i className="bi bi-clock me-1"></i> {calculateReadingTime(article.content)}
            </small>
          </div>
          
          {article.sentimentScore !== undefined && (
            <span className={`badge ${getSentimentClass(article.sentimentScore)} rounded-pill`}>
              {getSentimentText(article.sentimentScore)}
            </span>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .hover-zoom {
          transition: transform 0.3s ease;
        }
        .news-preview:hover .hover-zoom {
          transform: scale(1.05);
        }
        .sentiment-positive {
          background-color: rgba(25, 135, 84, 0.1);
          color: #198754;
        }
        .sentiment-negative {
          background-color: rgba(220, 53, 69, 0.1);
          color: #dc3545;
        }
        .sentiment-neutral {
          background-color: rgba(108, 117, 125, 0.1);
          color: #6c757d;
        }
      `}</style>
    </div>
  );
} 