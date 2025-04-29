'use client';

import React from 'react';
import NewsCard from './NewsCard';
import Link from 'next/link';

export function Grid({ news, isLoading }) {
  if (isLoading) {
    return (
      <div className="row g-4">
        {[1, 2, 3, 4, 5, 6].map((skeleton) => (
          <div key={skeleton} className="col-md-6 col-lg-4">
            <div className="bg-light rounded p-4 h-100 placeholder-glow"></div>
          </div>
        ))}
      </div>
    );
  }

  // Check if news exists and has articles
  if (!news || !news.articles || news.articles.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted mb-4">No news articles found</p>
        <div className="mt-4">
          <p>Try our demo articles:</p>
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
            <Link href="/news/demo-article-1" className="btn btn-outline-primary">
              Climate Summit
            </Link>
            <Link href="/news/demo-article-2" className="btn btn-outline-primary">
              AI Technology
            </Link>
            <Link href="/news/demo-article-3" className="btn btn-outline-primary">
              Economy News
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {news.articles.map((article) => (
        <div key={article._id} className="col-md-6 col-lg-4">
          <NewsCard article={article} />
        </div>
      ))}
    </div>
  );
} 