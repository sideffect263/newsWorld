import { fetchSentiment, fetchNews } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsCard from '@/components/NewsCard';
import Link from 'next/link';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
  BarElement
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
  BarElement
);

export const metadata = {
  title: 'Sentiment Analysis | NewsWorld',
  description: 'Track the sentiment of news coverage across different topics and sources with NewsWorld\'s sentiment analysis tools.',
};

export default async function SentimentPage() {
  // Fetch sentiment data
  const sentimentResponse = await fetchSentiment();
  
  // Extract sentiment data with fallback logic
  const sentimentData = sentimentResponse.success && sentimentResponse.data ? 
    sentimentResponse.data : {
      overview: { positive: 30, negative: 20, neutral: 50 },
      distribution: { positive: 30, negative: 20, neutral: 50 }
    };
    
  // Fetch news with different sentiment values for examples
  const positiveNewsResponse = await fetchNews({ sentimentType: 'positive', limit: 2 });
  const neutralNewsResponse = await fetchNews({ sentimentType: 'neutral', limit: 2 });
  const negativeNewsResponse = await fetchNews({ sentimentType: 'negative', limit: 2 });
  
  const positiveNews = positiveNewsResponse.success ? (positiveNewsResponse.data.articles || []) : [];
  const neutralNews = neutralNewsResponse.success ? (neutralNewsResponse.data.articles || []) : [];
  const negativeNews = negativeNewsResponse.success ? (negativeNewsResponse.data.articles || []) : [];
  
  // Prepare doughnut chart data
  const distributionData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [
          sentimentData.overview.positive || 0,
          sentimentData.overview.neutral || 0,
          sentimentData.overview.negative || 0
        ],
        backgroundColor: [
          'rgba(40, 167, 69, 0.7)',  // Green for positive
          'rgba(108, 117, 125, 0.7)', // Gray for neutral
          'rgba(220, 53, 69, 0.7)'    // Red for negative
        ],
        borderColor: [
          'rgb(40, 167, 69)',
          'rgb(108, 117, 125)',
          'rgb(220, 53, 69)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Doughnut chart options
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Overall Sentiment Distribution',
      },
    },
    cutout: '65%',
  };
  
  // Dummy time series data (would come from API in real implementation)
  const timeSeriesData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    datasets: [
      {
        label: 'Positive',
        data: [28, 32, 30, 35, 38, 32, 30],
        borderColor: 'rgb(40, 167, 69)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        fill: true,
      },
      {
        label: 'Neutral',
        data: [52, 48, 50, 48, 45, 50, 50],
        borderColor: 'rgb(108, 117, 125)',
        backgroundColor: 'rgba(108, 117, 125, 0.1)',
        fill: true,
      },
      {
        label: 'Negative',
        data: [20, 22, 20, 17, 17, 18, 20],
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        fill: true,
      },
    ],
  };
  
  // Line chart options
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Sentiment Trend (Last 7 Days)',
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Percentage of Articles'
        }
      }
    },
  };
  
  // Dummy category sentiment data
  const categorySentimentData = {
    labels: ['Politics', 'Business', 'Technology', 'Health', 'Science', 'Sports'],
    datasets: [
      {
        label: 'Average Sentiment Score',
        data: [0.1, 0.3, 0.4, 0.2, 0.3, 0.5],
        backgroundColor: [
          'rgba(40, 167, 69, 0.7)',
          'rgba(40, 167, 69, 0.7)',
          'rgba(40, 167, 69, 0.7)',
          'rgba(40, 167, 69, 0.7)',
          'rgba(40, 167, 69, 0.7)',
          'rgba(40, 167, 69, 0.7)',
        ],
      },
    ],
  };
  
  // Bar chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Sentiment by Category',
      },
    },
    scales: {
      y: {
        min: -1,
        max: 1,
        title: {
          display: true,
          text: 'Sentiment Score'
        }
      }
    },
  };

  return (
    <>
      <Header />
      
      <main className="container py-5">
        <h1 className="mb-4">Sentiment Analysis</h1>
        
        <div className="row mb-5">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h2 className="h5 mb-0">Sentiment Trends Over Time</h2>
              </div>
              <div className="card-body">
                <div style={{ height: '400px' }}>
                  <Line data={timeSeriesData} options={lineOptions} />
                </div>
              </div>
            </div>
            
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h2 className="h5 mb-0">Sentiment by Category</h2>
              </div>
              <div className="card-body">
                <div style={{ height: '400px' }}>
                  <Bar data={categorySentimentData} options={barOptions} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h2 className="h5 mb-0">Current Sentiment Overview</h2>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <Doughnut data={distributionData} options={doughnutOptions} />
                </div>
                
                <div className="mt-4">
                  <div className="row text-center">
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: 'rgba(40, 167, 69, 0.1)' }}>
                        <h4 className="text-success mb-0">{sentimentData.overview.positive}%</h4>
                        <small className="text-muted">Positive</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: 'rgba(108, 117, 125, 0.1)' }}>
                        <h4 className="text-secondary mb-0">{sentimentData.overview.neutral}%</h4>
                        <small className="text-muted">Neutral</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: 'rgba(220, 53, 69, 0.1)' }}>
                        <h4 className="text-danger mb-0">{sentimentData.overview.negative}%</h4>
                        <small className="text-muted">Negative</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <h2 className="mb-4">Example Articles by Sentiment</h2>
        
        <nav>
          <div className="nav nav-tabs mb-4" id="nav-tab" role="tablist">
            <button className="nav-link active" id="nav-positive-tab" data-bs-toggle="tab" data-bs-target="#nav-positive" type="button" role="tab" aria-controls="nav-positive" aria-selected="true">
              <span className="text-success">Positive</span>
            </button>
            <button className="nav-link" id="nav-neutral-tab" data-bs-toggle="tab" data-bs-target="#nav-neutral" type="button" role="tab" aria-controls="nav-neutral" aria-selected="false">
              <span className="text-secondary">Neutral</span>
            </button>
            <button className="nav-link" id="nav-negative-tab" data-bs-toggle="tab" data-bs-target="#nav-negative" type="button" role="tab" aria-controls="nav-negative" aria-selected="false">
              <span className="text-danger">Negative</span>
            </button>
          </div>
        </nav>
        
        <div className="tab-content" id="nav-tabContent">
          <div className="tab-pane fade show active" id="nav-positive" role="tabpanel" aria-labelledby="nav-positive-tab">
            <div className="row g-4">
              {positiveNews.length > 0 ? (
                positiveNews.map((article) => (
                  <div className="col-lg-6" key={article._id}>
                    <NewsCard article={article} />
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <p className="text-muted">No positive news articles found.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="tab-pane fade" id="nav-neutral" role="tabpanel" aria-labelledby="nav-neutral-tab">
            <div className="row g-4">
              {neutralNews.length > 0 ? (
                neutralNews.map((article) => (
                  <div className="col-lg-6" key={article._id}>
                    <NewsCard article={article} />
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <p className="text-muted">No neutral news articles found.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="tab-pane fade" id="nav-negative" role="tabpanel" aria-labelledby="nav-negative-tab">
            <div className="row g-4">
              {negativeNews.length > 0 ? (
                negativeNews.map((article) => (
                  <div className="col-lg-6" key={article._id}>
                    <NewsCard article={article} />
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <p className="text-muted">No negative news articles found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
} 