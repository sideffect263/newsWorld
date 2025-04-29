import { fetchSources } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'News Sources | NewsWorld',
  description: 'Browse the comprehensive list of news sources available on NewsWorld, covering a wide range of topics and regions.',
};

export default async function SourcesPage() {
  // Fetch sources data
  const sourcesResponse = await fetchSources();
  const sources = sourcesResponse.success && sourcesResponse.data ? 
    (sourcesResponse.data.sources || []) : [];
  
  // Group sources by category
  const sourcesByCategory = {};
  sources.forEach(source => {
    const category = source.category || 'General';
    if (!sourcesByCategory[category]) {
      sourcesByCategory[category] = [];
    }
    sourcesByCategory[category].push(source);
  });
  
  // Define default categories if we don't have any sources
  const categories = Object.keys(sourcesByCategory).length > 0 ? 
    Object.keys(sourcesByCategory) : 
    ['General', 'Business', 'Technology', 'Entertainment', 'Sports', 'Science', 'Health'];
  
  // Fallback sources if none returned
  const fallbackSources = {
    'General': [
      { _id: 'abc-news', name: 'ABC News', description: 'Your trusted source for breaking news, analysis, exclusive interviews, headlines, and videos.', url: 'https://abcnews.go.com' },
      { _id: 'bbc-news', name: 'BBC News', description: 'The BBC is the world\'s leading public service broadcaster.', url: 'https://www.bbc.com/news' },
      { _id: 'cnn', name: 'CNN', description: 'Cable News Network, CNN is a news-based pay television channel.', url: 'https://www.cnn.com' },
    ],
    'Business': [
      { _id: 'bloomberg', name: 'Bloomberg', description: 'Bloomberg delivers business and markets news, data, analysis, and video to the world.', url: 'https://www.bloomberg.com' },
      { _id: 'financial-times', name: 'Financial Times', description: 'The Financial Times provides news, analysis, and comment on business and economic issues.', url: 'https://www.ft.com' },
    ],
    'Technology': [
      { _id: 'wired', name: 'Wired', description: 'Wired is a monthly American magazine, published in print and online editions, that focuses on how emerging technologies affect culture, the economy, and politics.', url: 'https://www.wired.com' },
      { _id: 'techcrunch', name: 'TechCrunch', description: 'TechCrunch is an American online newspaper focusing on high tech and startup companies.', url: 'https://techcrunch.com' },
    ]
  };
  
  // Use fallback if no sources available
  if (sources.length === 0) {
    categories.forEach(category => {
      if (fallbackSources[category]) {
        sourcesByCategory[category] = fallbackSources[category];
      } else {
        sourcesByCategory[category] = [];
      }
    });
  }
  
  return (
    <>
      <Header />
      
      <main className="container py-5">
        <h1 className="mb-4">News Sources</h1>
        <p className="lead mb-5">
          We aggregate news from a variety of reputable sources to provide comprehensive coverage. 
          Click on any source to view articles from that publication.
        </p>
        
        <div className="row mb-4">
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h2 className="h5 mb-0">Sources by Category</h2>
              </div>
              <div className="card-body">
                <div className="nav flex-column nav-pills" id="sources-tab" role="tablist" aria-orientation="vertical">
                  {categories.map((category, index) => (
                    <button 
                      key={category}
                      className={`nav-link text-start ${index === 0 ? 'active' : ''}`} 
                      id={`${category.toLowerCase()}-tab`}
                      data-bs-toggle="pill" 
                      data-bs-target={`#${category.toLowerCase()}`} 
                      type="button" 
                      role="tab" 
                      aria-controls={category.toLowerCase()} 
                      aria-selected={index === 0}
                    >
                      {category}
                      <span className="badge bg-light text-dark float-end">
                        {sourcesByCategory[category]?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-8">
            <div className="tab-content" id="sources-tabContent">
              {categories.map((category, index) => (
                <div 
                  key={category} 
                  className={`tab-pane fade ${index === 0 ? 'show active' : ''}`} 
                  id={category.toLowerCase()} 
                  role="tabpanel" 
                  aria-labelledby={`${category.toLowerCase()}-tab`}
                >
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white">
                      <h3 className="h5 mb-0">{category} News Sources</h3>
                    </div>
                    <div className="card-body">
                      {sourcesByCategory[category]?.length > 0 ? (
                        <div className="list-group">
                          {sourcesByCategory[category].map(source => (
                            <Link 
                              key={source._id}
                              href={`/news?source=${encodeURIComponent(source._id)}`} 
                              className="list-group-item list-group-item-action"
                            >
                              <div className="d-flex w-100 justify-content-between align-items-center">
                                <div>
                                  <h5 className="mb-1">{source.name}</h5>
                                  <p className="mb-1 text-muted">{source.description}</p>
                                  {source.url && (
                                    <small>
                                      <a 
                                        href={source.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-decoration-none"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Visit Website <i className="bi bi-box-arrow-up-right"></i>
                                      </a>
                                    </small>
                                  )}
                                </div>
                                {source.logoUrl && (
                                  <div className="source-logo">
                                    <Image 
                                      src={source.logoUrl} 
                                      width={40} 
                                      height={40}
                                      alt={`${source.name} logo`}
                                      className="rounded"
                                      unoptimized
                                    />
                                  </div>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted">No sources available in this category.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="card border-0 shadow-sm mb-5">
          <div className="card-header bg-white">
            <h2 className="h5 mb-0">About Our Sources</h2>
          </div>
          <div className="card-body">
            <p>
              NewsWorld aggregates content from a diverse range of reputable news sources to provide a comprehensive view of world events.
              We strive to include sources with different perspectives while maintaining high standards for accuracy and credibility.
            </p>
            <p>
              Our sources are carefully selected based on the following criteria:
            </p>
            <ul>
              <li><strong>Credibility:</strong> Sources with established fact-checking processes and journalistic standards</li>
              <li><strong>Diversity:</strong> Sources representing different regions, perspectives, and areas of expertise</li>
              <li><strong>Timeliness:</strong> Sources that provide up-to-date coverage of current events</li>
              <li><strong>Transparency:</strong> Sources that disclose their ownership, funding, and potential conflicts of interest</li>
            </ul>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
} 