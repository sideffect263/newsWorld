import { fetchStories } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { getArticleImage } from '@/lib/imageService';

export const metadata = {
  title: 'Stories | NewsWorld',
  description: 'Explore curated news stories and narratives that connect related events and provide context to the headlines.',
};

export default async function StoriesPage() {
  // Fetch stories data
  const storiesResponse = await fetchStories();
  const stories = storiesResponse.success && storiesResponse.data ? 
    (storiesResponse.data.stories || []) : [];
  
  // Fallback stories if none returned by the API
  const fallbackStories = [
    {
      _id: 'climate-summit-2023',
      title: 'Climate Summit 2023: Global Leaders Tackle Environmental Challenges',
      description: 'Follow the developments from the 2023 United Nations Climate Change Conference as world leaders negotiate new environmental policies.',
      categories: ['Environment', 'Politics', 'Global'],
      keywords: ['climate change', 'global warming', 'sustainability', 'carbon emissions'],
      articleCount: 12,
      updatedAt: new Date().toISOString(),
      impact: 'high',
      relevancyScore: 85
    },
    {
      _id: 'tech-innovation-race',
      title: 'The AI Revolution: Tech Giants Compete for Dominance',
      description: 'Explore how major technology companies are competing to lead the artificial intelligence revolution and how it\'s transforming industries.',
      categories: ['Technology', 'Business', 'Innovation'],
      keywords: ['artificial intelligence', 'machine learning', 'tech industry', 'innovation'],
      articleCount: 8,
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      impact: 'medium',
      relevancyScore: 78
    },
    {
      _id: 'global-health-pandemic',
      title: 'Global Health: Tackling the Next Pandemic',
      description: 'Investigating how nations are preparing for future health crises and what lessons have been learned from recent global pandemics.',
      categories: ['Health', 'Science', 'Global'],
      keywords: ['pandemic', 'public health', 'disease prevention', 'WHO'],
      articleCount: 10,
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      impact: 'high',
      relevancyScore: 82
    }
  ];
  
  // Use fallback if no stories available
  const displayStories = stories.length > 0 ? stories : fallbackStories;
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get impact badge color
  const getImpactColor = (impact) => {
    switch(impact?.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };
  
  return (
    <>
      <Header />
      
      <main className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Stories</h1>
          
          <div className="d-flex gap-2">
            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle" type="button" id="sortDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                Sort by
              </button>
              <ul className="dropdown-menu" aria-labelledby="sortDropdown">
                <li><a className="dropdown-item" href="#">Latest Updates</a></li>
                <li><a className="dropdown-item" href="#">Relevance</a></li>
                <li><a className="dropdown-item" href="#">Most Articles</a></li>
              </ul>
            </div>
            
            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle" type="button" id="filterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                Filter
              </button>
              <ul className="dropdown-menu" aria-labelledby="filterDropdown">
                <li><a className="dropdown-item" href="#">All Categories</a></li>
                <li><a className="dropdown-item" href="#">Politics</a></li>
                <li><a className="dropdown-item" href="#">Business</a></li>
                <li><a className="dropdown-item" href="#">Technology</a></li>
                <li><a className="dropdown-item" href="#">Health</a></li>
                <li><a className="dropdown-item" href="#">Environment</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <p className="lead mb-5">
          Stories connect related news articles into cohesive narratives, providing context and deeper insights into complex topics.
        </p>
        
        <div className="row g-4">
          {displayStories.map((story) => {
            // Generate a contextual image based on story properties
            const storyImage = getArticleImage({
              title: story.title,
              _id: story._id,
              category: story.categories?.[0],
              sentiment: 0
            }, 600, 400);
            
            return (
              <div className="col-lg-4 col-md-6" key={story._id}>
                <div className="card h-100 shadow-sm">
                  <div className="position-relative">
                    <Image 
                      src={storyImage} 
                      className="card-img-top"
                      alt={story.title}
                      width={600}
                      height={300}
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                    {story.impact && (
                      <span className={`position-absolute top-0 end-0 badge bg-${getImpactColor(story.impact)} m-2`}>
                        {story.impact.charAt(0).toUpperCase() + story.impact.slice(1)} Impact
                      </span>
                    )}
                  </div>
                  
                  <div className="card-body">
                    <h2 className="h5 card-title">{story.title}</h2>
                    <p className="card-text">{story.description}</p>
                    
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {story.categories?.map((category, idx) => (
                        <span key={idx} className="badge bg-light text-dark">
                          {category}
                        </span>
                      ))}
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        <i className="bi bi-newspaper me-1"></i> {story.articleCount || 0} articles
                      </small>
                      <small className="text-muted">
                        Updated: {formatDate(story.updatedAt)}
                      </small>
                    </div>
                  </div>
                  
                  <div className="card-footer bg-white border-top-0">
                    <Link href={`/stories/${story._id}`} className="btn btn-primary d-block">
                      Read Full Story
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          
          {displayStories.length === 0 && (
            <div className="col-12 text-center py-5">
              <i className="bi bi-journal-x display-4 text-muted"></i>
              <h2 className="mt-3">No Stories Found</h2>
              <p className="text-muted">
                We couldn't find any stories matching your criteria.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-5 text-center">
          <h2 className="h4 mb-4">What Are Stories?</h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <i className="bi bi-diagram-3 text-primary display-5 mb-3"></i>
                  <h3 className="h5">Connected Events</h3>
                  <p className="card-text">
                    Stories connect related news articles into a narrative, showing how events relate and evolve over time.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <i className="bi bi-layers text-primary display-5 mb-3"></i>
                  <h3 className="h5">Multiple Perspectives</h3>
                  <p className="card-text">
                    We aggregate coverage from multiple sources to provide a comprehensive view of complex issues.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <i className="bi bi-lightbulb text-primary display-5 mb-3"></i>
                  <h3 className="h5">Context & Analysis</h3>
                  <p className="card-text">
                    Stories provide background information, expert opinions, and analysis to help you understand the bigger picture.
                  </p>
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