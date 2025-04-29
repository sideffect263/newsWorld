import { fetchSchedulerStatus, fetchSourcesStatus } from '@/lib/api';
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
  TimeScale
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export const metadata = {
  title: 'Scheduler Status | NewsWorld',
  description: 'View the current status of the NewsWorld article fetching scheduler and task execution history.',
};

export default async function SchedulerStatusPage() {
  // Fetch scheduler status data
  const schedulerResponse = await fetchSchedulerStatus();
  const schedulerData = schedulerResponse.success ? schedulerResponse.data : null;
  
  // Fetch sources status data
  const sourcesResponse = await fetchSourcesStatus();
  const sourcesData = sourcesResponse.success ? sourcesResponse.data : null;
  
  // Format sources data by status
  const sourcesByStatus = {
    active: [],
    inactive: [],
    error: []
  };
  
  if (sourcesData) {
    sourcesData.forEach(source => {
      if (!source.isActive) {
        sourcesByStatus.inactive.push(source);
      } else if (source.fetchStatus === 'error') {
        sourcesByStatus.error.push(source);
      } else {
        sourcesByStatus.active.push(source);
      }
    });
  }
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'success': return 'success';
      case 'running': return 'info';
      case 'idle': return 'secondary';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };
  
  // Prepare source fetch frequency chart data
  const fetchFrequencyData = {
    labels: ['5m', '15m', '30m', '1h', '3h', '6h', '12h', '24h'],
    datasets: [
      {
        label: 'Sources by Fetch Frequency',
        data: [0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1
      }
    ]
  };
  
  // Count sources by fetch frequency
  if (sourcesData) {
    sourcesData.forEach(source => {
      if (!source.isActive) return;
      
      const freqMap = {
        '5m': 0,
        '15m': 1,
        '30m': 2,
        '1h': 3,
        '3h': 4,
        '6h': 5,
        '12h': 6,
        '24h': 7
      };
      
      const freqIndex = freqMap[source.fetchFrequency] || 3; // Default to 1h
      fetchFrequencyData.datasets[0].data[freqIndex]++;
    });
  }
  
  // Extract scheduler jobs
  const schedulerJobs = schedulerData?.detailedInfo?.jobs || [];
  
  // Extract scheduler history
  const schedulerHistory = schedulerData?.detailedInfo?.history || [];
  // Sort history by date in descending order
  schedulerHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return (
    <>
      <Header />
      
      <main className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Scheduler Status</h1>
          <Link href="/status" className="btn btn-outline-primary">
            Back to System Status
          </Link>
        </div>
        
        <div className="d-flex justify-content-between mb-4">
          <Link href="/status" className="btn btn-outline-primary">
            Back to System Status
          </Link>
          
          <form action={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/status/fetch`} method="post">
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-arrow-repeat me-2"></i>
              Trigger Manual Fetch
            </button>
          </form>
        </div>
        
        {schedulerData ? (
          <>
            <div className="row mb-4">
              <div className="col-lg-12">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Scheduler Overview</h2>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-md-4">
                        <div className={`alert ${schedulerData.running ? 'alert-success' : 'alert-warning'}`}>
                          <h3 className="h5">Scheduler Status</h3>
                          <p className="mb-0">
                            <i className={`bi ${schedulerData.running ? 'bi-play-circle' : 'bi-pause-circle'} me-2`}></i>
                            {schedulerData.running ? 'Running' : 'Stopped'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="alert alert-info">
                          <h3 className="h5">Active Jobs</h3>
                          <p className="mb-0">
                            <i className="bi bi-calendar-check me-2"></i>
                            {schedulerJobs.length} configured jobs
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="alert alert-info">
                          <h3 className="h5">Sources</h3>
                          <p className="mb-0">
                            <i className="bi bi-rss me-2"></i>
                            {sourcesByStatus.active.length} active / {sourcesByStatus.error.length} error
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
                    <h2 className="h5 mb-0">Scheduled Jobs</h2>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Job Name</th>
                            <th>Schedule</th>
                            <th>Last Run</th>
                            <th>Next Run</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedulerJobs.length > 0 ? (
                            schedulerJobs.map((job, index) => (
                              <tr key={index}>
                                <td>{job.name}</td>
                                <td><code>{job.schedule}</code></td>
                                <td>{formatDate(job.lastRun)}</td>
                                <td>{formatDate(job.nextRun)}</td>
                                <td>
                                  <span className={`badge bg-${getStatusBadgeColor(job.status)}`}>
                                    {job.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="text-center">No scheduled jobs configured</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Source Fetch Frequency</h2>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <Bar 
                        data={fetchFrequencyData} 
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
                          },
                          plugins: {
                            legend: {
                              display: false
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
              <div className="col-lg-12">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Execution History</h2>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Job</th>
                            <th>Time</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedulerHistory.length > 0 ? (
                            schedulerHistory.slice(0, 10).map((entry, index) => (
                              <tr key={index}>
                                <td>{entry.job}</td>
                                <td>{formatDate(entry.timestamp)}</td>
                                <td>{formatDuration(entry.duration)}</td>
                                <td>
                                  <span className={`badge bg-${getStatusBadgeColor(entry.status)}`}>
                                    {entry.status}
                                  </span>
                                </td>
                                <td>
                                  {entry.result ? (
                                    <span>
                                      {typeof entry.result === 'object' ? JSON.stringify(entry.result) : entry.result}
                                    </span>
                                  ) : (
                                    <span className="text-muted">No result</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="text-center">No execution history available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row mb-4">
              <div className="col-lg-12">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h2 className="h5 mb-0">Sources with Issues</h2>
                  </div>
                  <div className="card-body">
                    {sourcesByStatus.error.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Source</th>
                              <th>Last Fetched</th>
                              <th>Fetch Method</th>
                              <th>Frequency</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sourcesByStatus.error.map((source, index) => (
                              <tr key={index}>
                                <td>{source.name}</td>
                                <td>{formatDate(source.lastFetchedAt)}</td>
                                <td>{source.fetchMethod || 'RSS'}</td>
                                <td>{source.fetchFrequency || '1h'}</td>
                                <td>
                                  <span className="badge bg-danger">Error</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-success">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        No sources with issues at the moment
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="alert alert-warning">
            <h3 className="h5">Unable to fetch scheduler status</h3>
            <p>There was an error retrieving the current scheduler status. Please try again later.</p>
          </div>
        )}
      </main>
      
      <Footer />
    </>
  );
} 