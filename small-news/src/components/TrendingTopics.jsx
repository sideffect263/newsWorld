'use client';

import React from 'react';
import Link from 'next/link';

export function TrendingTopics({ trends, isLoading }) {
  if (isLoading) {
    return (
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-0">Trending Topics</h5>
        </div>
        <div className="card-body">
          <div className="placeholder-glow">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="placeholder w-100 mb-3" style={{ height: '16px' }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Prepare trending topics, ensuring we have something to show
  let keywords = [];
  
  if (trends?.keywords && trends.keywords.length > 0) {
    keywords = trends.keywords;
  } else if (trends?.data && trends.data.length > 0) {
    keywords = trends.data;
  } else {
    // Fallback topics if none available
    keywords = [
      { word: 'politics', count: 25 },
      { word: 'technology', count: 18 },
      { word: 'health', count: 15 },
      { word: 'business', count: 12 },
      { word: 'science', count: 10 }
    ];
  }
  
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white">
        <h5 className="mb-0">Trending Topics</h5>
      </div>
      <div className="card-body">
        <div className="mb-3">
          {keywords.slice(0, 6).map((topic, index) => {
            const topicName = topic.word || topic.keyword || `Topic ${index + 1}`;
            const count = topic.count || 0;
            
            // Calculate a percentage for the bar width based on the highest count
            const maxCount = Math.max(...keywords.map(k => k.count || 0));
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 50;
            
            return (
              <div key={index} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Link 
                    href={`/news?search=${encodeURIComponent(topicName)}`}
                    className="text-decoration-none fw-medium"
                  >
                    {topicName}
                  </Link>
                  <span className="badge bg-light text-dark">
                    {count} {count === 1 ? 'article' : 'articles'}
                  </span>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    role="progressbar" 
                    style={{ width: `${percentage}%` }}
                    aria-valuenow={percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        <Link 
          href="/trends" 
          className="btn btn-outline-primary w-100"
        >
          View All Trends
        </Link>
      </div>
    </div>
  );
} 