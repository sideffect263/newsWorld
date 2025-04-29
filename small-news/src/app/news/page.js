import { fetchNews } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsCard from '@/components/NewsCard';
import Link from 'next/link';

export const metadata = {
  title: 'Latest News | NewsWorld',
  description: 'Stay updated with the latest news from NewsWorld. Browse our comprehensive collection of news articles from diverse sources worldwide.',
};

export default async function NewsPage({ searchParams }) {
  // Get search parameters from URL
  const category = searchParams?.category || '';
  const search = searchParams?.search || '';
  const page = parseInt(searchParams?.page || '1');
  const limit = parseInt(searchParams?.limit || '12');
  const filter = searchParams?.filter || 'all';
  
  // Fetch news with parameters
  const newsData = await fetchNews({
    category,
    search,
    page,
    limit,
    filter
  });
  
  console.log('News page - API response:', newsData);
  
  // Extract articles from the response
  const articles = newsData.success && newsData.data ? newsData.data.articles || [] : [];
  const totalArticles = newsData.success && newsData.data ? newsData.data.totalArticles || 0 : 0;
  const totalPages = newsData.success && newsData.data ? newsData.data.totalPages || 1 : 1;
  const currentPage = newsData.success && newsData.data ? newsData.data.currentPage || page : page;
  
  // Generate pagination array (limited to prevent excessive links)
  const createPaginationArray = (currentPage, totalPages) => {
    // Always show first and last page, and a window around current page
    const pageWindow = 2; // Number of pages before and after current page
    const paginationItems = [];
    
    // Always add page 1
    paginationItems.push(1);
    
    // Start window (add ellipsis if needed)
    if (currentPage - pageWindow > 2) {
      paginationItems.push('...');
    }
    
    // Add pages around current page
    for (let i = Math.max(2, currentPage - pageWindow); i <= Math.min(totalPages - 1, currentPage + pageWindow); i++) {
      paginationItems.push(i);
    }
    
    // End window (add ellipsis if needed)
    if (currentPage + pageWindow < totalPages - 1) {
      paginationItems.push('...');
    }
    
    // Always add last page if there is more than one page
    if (totalPages > 1 && !paginationItems.includes(totalPages)) {
      paginationItems.push(totalPages);
    }
    
    return paginationItems;
  };

  // Create pagination array
  const paginationItems = totalPages <= 1 ? [] : createPaginationArray(currentPage, totalPages);
  
  // Build query params for pagination links
  const buildQueryString = (pageNum) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (filter) params.append('filter', filter);
    if (limit !== 12) params.append('limit', limit.toString());
    params.append('page', pageNum.toString());
    return params.toString();
  };
  
  return (
    <>
      <Header />
      
      <main className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="mb-0">
            {search ? `Search: "${search}"` : category ? `${category} News` : 'Latest News'}
          </h1>
          
          <div className="d-flex gap-2">
            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle" type="button" id="categoryDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                {category || 'All Categories'}
              </button>
              <ul className="dropdown-menu" aria-labelledby="categoryDropdown">
                <li>
                  <Link className="dropdown-item" href="/news">All Categories</Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link className="dropdown-item" href="/news?category=politics">Politics</Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/news?category=business">Business</Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/news?category=technology">Technology</Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/news?category=health">Health</Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/news?category=science">Science</Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/news?category=entertainment">Entertainment</Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/news?category=sports">Sports</Link>
                </li>
              </ul>
            </div>
            
            <form action="/news" method="get" className="d-flex">
              <input 
                type="text" 
                name="search" 
                className="form-control me-2" 
                placeholder="Search news..."
                defaultValue={search}
              />
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-search"></i>
              </button>
            </form>
          </div>
        </div>
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <p className="text-muted mb-0">
            {articles.length > 0 
              ? `Showing ${(currentPage - 1) * limit + 1} - ${Math.min(currentPage * limit, totalArticles)} of ${totalArticles} articles`
              : 'No articles found'
            }
          </p>
          
          <div className="d-flex gap-2 align-items-center">
            <span className="text-muted">Show:</span>
            <div className="dropdown">
              <button 
                className="btn btn-sm btn-outline-secondary dropdown-toggle" 
                type="button" 
                id="pageSizeDropdown" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
              >
                {limit} per page
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="pageSizeDropdown">
                {[12, 24, 48, 96].map(size => (
                  <li key={size}>
                    <Link
                      className={`dropdown-item ${limit === size ? 'active' : ''}`}
                      href={`/news?${new URLSearchParams({
                        category,
                        search,
                        filter,
                        limit: size,
                        page: 1
                      }).toString()}`}
                    >
                      {size} per page
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* News grid */}
        <div className="row g-4 mb-4">
          {articles.map(article => (
            <div className="col-lg-4 col-md-6" key={article._id}>
              <NewsCard article={article} />
            </div>
          ))}
          
          {articles.length === 0 && (
            <div className="col-12 text-center py-5">
              <i className="bi bi-newspaper display-1 text-muted"></i>
              <h3 className="mt-4">No News Articles Found</h3>
              <p className="text-muted">
                {search ? `No results for "${search}". Try different keywords.` : 'No articles are available with the current filters.'}
              </p>
              
              {/* Demo Article Links - displayed when no real articles are found */}
              <div className="mt-4">
                <p>You can view our demo articles:</p>
                <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                  <Link href="/news/demo-article-1" className="btn btn-outline-primary">
                    Climate Summit Demo
                  </Link>
                  <Link href="/news/demo-article-2" className="btn btn-outline-primary">
                    AI Technology Demo
                  </Link>
                  <Link href="/news/demo-article-3" className="btn btn-outline-primary">
                    Economy News Demo
                  </Link>
                </div>
              </div>
              
              <Link href="/news" className="btn btn-primary mt-4">
                View All News
              </Link>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {articles.length > 0 && totalPages > 1 && (
          <nav aria-label="News pagination">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                <Link 
                  className="page-link" 
                  href={`/news?${buildQueryString(currentPage - 1)}`}
                  aria-label="Previous"
                >
                  <span aria-hidden="true">&laquo;</span>
                </Link>
              </li>
              
              {paginationItems.map((item, index) => (
                item === '...' ? (
                  <li className="page-item disabled" key={`ellipsis-${index}`}>
                    <span className="page-link">...</span>
                  </li>
                ) : (
                  <li 
                    className={`page-item ${item === currentPage ? 'active' : ''}`} 
                    key={item}
                  >
                    <Link 
                      className="page-link" 
                      href={`/news?${buildQueryString(item)}`}
                    >
                      {item}
                    </Link>
                  </li>
                )
              ))}
              
              <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                <Link 
                  className="page-link" 
                  href={`/news?${buildQueryString(currentPage + 1)}`}
                  aria-label="Next"
                >
                  <span aria-hidden="true">&raquo;</span>
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </main>
      
      <Footer />
    </>
  );
} 