'use client';

import { useState, useEffect } from 'react';
import { fetchNews, fetchTrends, fetchSentiment } from '@/lib/api';
import { Grid } from '@/components/Grid';
import { TopStories } from '@/components/TopStories';
import { SentimentChart } from '@/components/SentimentChart';
import { TrendingTopics } from '@/components/TrendingTopics';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function HomePage() {
  const [news, setNews] = useState([]);
  const [trends, setTrends] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data once on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load data in parallel
        const [newsResponse, trendsResponse, sentimentResponse] = await Promise.all([
          fetchNews({ limit: 8 }),
          fetchTrends(),
          fetchSentiment()
        ]);

        if (newsResponse.success && newsResponse.data) {
          setNews(newsResponse.data);
        }

        if (trendsResponse.success && trendsResponse.data) {
          setTrends(trendsResponse.data);
        }

        if (sentimentResponse.success && sentimentResponse.data) {
          setSentiment(sentimentResponse.data);
        }
      } catch (error) {
        console.error('Error loading homepage data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  return (
    <>
      <Header />
      <main className="py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <h1 className="fs-2 fw-bold mb-4">Top Stories</h1>
              <TopStories news={news} isLoading={isLoading} />
              <h2 className="fs-3 fw-bold my-4">Latest News</h2>
              <Grid news={news} isLoading={isLoading} />
            </div>
            <div className="col-lg-4">
              <div className="sticky-top pt-3">
                <TrendingTopics trends={trends} isLoading={isLoading} />
                <div className="mt-4">
                  <SentimentChart sentiment={sentiment} isLoading={isLoading} />
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