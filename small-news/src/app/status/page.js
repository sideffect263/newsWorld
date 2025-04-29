import { fetchStatus, fetchArticleStats } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  BarElement,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const metadata = {
  title: 'System Status | NewsWorld',
  description: 'View the current status of NewsWorld systems, including database and article statistics.',
};

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  seconds -= days * 3600 * 24;
  const hrs = Math.floor(seconds / 3600);
  seconds -= hrs * 3600;
  const mins = Math.floor(seconds / 60);
  seconds -= mins * 60;
  
  return `${days}d ${hrs}h ${mins}m ${Math.floor(seconds)}s`;
}

export default async function StatusPage() {
  // Fetch status data
  const statusResponse = await fetchStatus();
  const statusData = statusResponse.success ? statusResponse.data : null;
  
  // Fetch article statistics
  const statsResponse = await fetchArticleStats();
  const statsData = statsResponse.success ? statsResponse.data : null;
  
  // Prepare article by day chart data
  const articleChartData = {
    labels: statsData?.byDay?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Articles Published',
        data: statsData?.byDay?.map(item => item.count) || [],
        borderColor: 'rgba(13, 110, 253, 1)',
        backgroundColor: 'rgba(13, 110, 253, 0.2)',
        fill: true,
        tension: 0.3
      }
    ]
  };
  
  // Prepare category chart data
  const topCategories = statsData?.byCategory?.slice(0, 5) || [];
  const categoryChartData = {
    labels: topCategories.map(item => item._id),
    datasets: [
      {
        label: 'Article Count',
        data: topCategories.map(item => item.count),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  // Format system memory data
  const memoryUsage = statusData?.system?.memoryUsage;
  const memoryData = {
    labels: ['RSS', 'Heap Total', 'Heap Used', 'External'],
    datasets: [
      {
        label: 'Memory Usage',
        data: [
          memoryUsage?.rss || 0,
          memoryUsage?.heapTotal || 0,
          memoryUsage?.heapUsed || 0,
          memoryUsage?.external || 0
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  const isSystemHealthy = statusData?.database?.connected && statusData?.system?.uptime > 0;
  
  return (
    <>
      <Header />
      
      <main className="container py-5">
        <h1 className="mb-4">System Status</h1>
        
        {statusData ? (
          <>
            <div className="row mb-4">
              <div className="col-lg-12">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Overall System Health</h2>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-md-3">
                        <div className={`alert ${isSystemHealthy ? 'alert-success' : 'alert-danger'}`}>
                          <h3 className="h5">{isSystemHealthy ? 'All Systems Operational' : 'System Issues Detected'}</h3>
                          <p className="mb-0">
                            <i className={`bi ${isSystemHealthy ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                            Updated: {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-md-3">
                        <div className={`alert ${statusData.database.connected ? 'alert-success' : 'alert-danger'}`}>
                          <h3 className="h5">Database</h3>
                          <p className="mb-0">
                            {statusData.database.connected ? 'Connected' : 'Disconnected'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-md-3">
                        <div className={`alert ${statusData.scheduler.running ? 'alert-success' : 'alert-warning'}`}>
                          <h3 className="h5">Scheduler</h3>
                          <p className="mb-0">
                            {statusData.scheduler.running ? 'Running' : 'Stopped'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-md-3">
                        <div className="alert alert-info">
                          <h3 className="h5">Server</h3>
                          <p className="mb-0">
                            Uptime: {formatUptime(statusData.system.uptime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row mb-4">
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Articles Published (Last 30 Days)</h2>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <Line 
                        data={articleChartData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                precision: 0
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Content Distribution</h2>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <Doughnut 
                        data={categoryChartData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row mb-4">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Database Statistics</h2>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Articles
                        <span className="badge bg-primary rounded-pill">{statusData.counts.articles.toLocaleString()}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Sources
                        <span className="badge bg-primary rounded-pill">{statusData.counts.sources.toLocaleString()}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Active Sources
                        <span className="badge bg-success rounded-pill">{statusData.counts.activeSources.toLocaleString()}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">System Information</h2>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Platform
                        <span className="badge bg-secondary">{statusData.system.platform}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Node Version
                        <span className="badge bg-secondary">{statusData.system.nodeVersion}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        CPUs
                        <span className="badge bg-secondary">{statusData.system.cpus}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Memory
                        <span className="badge bg-secondary">{formatBytes(statusData.system.totalMemory)}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Memory Usage</h2>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '200px' }}>
                      <Bar 
                        data={memoryData}
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  return formatBytes(context.raw);
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row mb-4">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Latest Articles</h2>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      {statusData.latestArticles.map((article, index) => (
                        <li key={index} className="list-group-item">
                          <Link href={`/news/${article._id}`} className="text-decoration-none">
                            {article.title}
                          </Link>
                          <div className="d-flex justify-content-between mt-1">
                            <small className="text-muted">{article.source?.name || 'Unknown Source'}</small>
                            <small className="text-muted">
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Most Viewed Articles</h2>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      {statusData.topArticles.map((article, index) => (
                        <li key={index} className="list-group-item">
                          <Link href={`/news/${article._id}`} className="text-decoration-none">
                            {article.title}
                          </Link>
                          <div className="d-flex justify-content-between mt-1">
                            <small className="text-muted">
                              <i className="bi bi-eye me-1"></i> {article.viewCount || 0} views
                            </small>
                            <small className="text-muted">
                              {article.source?.name || 'Unknown Source'}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="d-flex justify-content-between mb-4">
              <Link href="/status/scheduler" className="btn btn-primary">
                View Scheduler Status
              </Link>
              
              <Link href="/sources" className="btn btn-outline-primary">
                View News Sources
              </Link>
            </div>
          </>
        ) : (
          <div className="alert alert-warning">
            <h3 className="h5">Unable to fetch system status</h3>
            <p>There was an error retrieving the current system status. Please try again later.</p>
          </div>
        )}
      </main>
      
      <Footer />
    </>
  );
} 