'use client';

import React from 'react';
import Link from 'next/link';

export function SentimentChart({ sentiment, isLoading }) {
  if (isLoading) {
    return (
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-0">Sentiment Analysis</h5>
        </div>
        <div className="card-body">
          <div className="placeholder-glow">
            <div className="placeholder w-100 mb-3" style={{ height: '20px' }}></div>
            <div className="placeholder w-100 mb-3" style={{ height: '20px' }}></div>
            <div className="placeholder w-100 mb-3" style={{ height: '20px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle missing sentiment data
  const overview = sentiment?.overview || { positive: 30, negative: 20, neutral: 50 };
  
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white">
        <h5 className="mb-0">Sentiment Overview</h5>
      </div>
      <div className="card-body">
        <div className="row text-center mb-3">
          <div className="col-4">
            <div className="p-3 rounded" style={{ background: 'rgba(40, 167, 69, 0.1)' }}>
              <h5 className="text-success mb-0">{overview.positive}%</h5>
              <small className="text-muted">Positive</small>
            </div>
          </div>
          <div className="col-4">
            <div className="p-3 rounded" style={{ background: 'rgba(108, 117, 125, 0.1)' }}>
              <h5 className="text-secondary mb-0">{overview.neutral}%</h5>
              <small className="text-muted">Neutral</small>
            </div>
          </div>
          <div className="col-4">
            <div className="p-3 rounded" style={{ background: 'rgba(220, 53, 69, 0.1)' }}>
              <h5 className="text-danger mb-0">{overview.negative}%</h5>
              <small className="text-muted">Negative</small>
            </div>
          </div>
        </div>
        
        <Link href="/sentiment" className="btn btn-outline-primary w-100">
          Full Sentiment Analysis
        </Link>
      </div>
    </div>
  );
} 