'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getArticleImage } from '@/lib/imageService';

export function TopStories({ news, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-light rounded mb-4 ratio ratio-16x9 placeholder-glow"></div>
    );
  }

  // Check if we have articles to display
  if (!news || !news.articles || news.articles.length === 0) {
    return null; // Hide this section if no articles
  }

  // Get the first article for the main feature
  const mainArticle = news.articles[0];
  const imageSrc = mainArticle.imageUrl || getArticleImage(mainArticle, 1200, 600);

  return (
    <div className="card shadow-sm mb-4 overflow-hidden">
      <div className="position-relative">
        <div className="ratio ratio-16x9">
          <Image 
            src={imageSrc}
            alt={mainArticle.title}
            layout="fill"
            objectFit="cover"
            className="card-img-top"
            priority
          />
        </div>
        <div className="position-absolute bottom-0 start-0 w-100 p-4 bg-dark bg-opacity-75 text-white">
          <div className="mb-2">
            {mainArticle.category && (
              <span className="badge bg-primary me-2">
                {mainArticle.category}
              </span>
            )}
            <span className="text-light small">
              {new Date(mainArticle.publishedAt).toLocaleDateString()}
            </span>
          </div>
          <h3 className="fs-4 fw-bold mb-2">{mainArticle.title}</h3>
          <p className="text-light mb-3 d-none d-md-block">
            {mainArticle.description}
          </p>
          <Link 
            href={`/news/${mainArticle._id}`}
            className="btn btn-light"
          >
            Read Story
          </Link>
        </div>
      </div>
    </div>
  );
} 