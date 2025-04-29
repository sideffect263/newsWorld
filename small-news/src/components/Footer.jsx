'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-dark text-white py-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
            <h5>NewsWorld</h5>
            <p className="text-muted mt-3">
              Your comprehensive global news aggregator providing real-time updates from diverse sources worldwide.
            </p>
            <div className="social-links mt-3">
              <a href="#" className="me-3"><i className="bi bi-twitter"></i></a>
              <a href="#" className="me-3"><i className="bi bi-facebook"></i></a>
              <a href="#" className="me-3"><i className="bi bi-instagram"></i></a>
              <a href="#" className="me-3"><i className="bi bi-linkedin"></i></a>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
            <h5>Quick Links</h5>
            <ul className="list-unstyled footer-links mt-3">
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/">Home</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/news">News</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/stories">Stories</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/trends">Trends</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/sentiment">Sentiment</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/sources">Sources</Link>
              </li>
            </ul>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-4 mb-md-0">
            <h5>Categories</h5>
            <ul className="list-unstyled footer-links mt-3">
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/news?category=politics">Politics</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/news?category=technology">Technology</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/news?category=business">Business</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/news?category=health">Health</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/news?category=science">Science</Link>
              </li>
              <li className="mb-2">
                <i className="bi bi-chevron-right small me-1"></i>
                <Link href="/news?category=entertainment">Entertainment</Link>
              </li>
            </ul>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <h5>Contact Us</h5>
            <ul className="list-unstyled footer-contact mt-3">
              <li className="mb-2">
                <i className="bi bi-geo-alt me-2"></i> 123 News Street, City
              </li>
              <li className="mb-2">
                <i className="bi bi-envelope me-2"></i> <a href="mailto:info@newsworld.com">info@newsworld.com</a>
              </li>
              <li className="mb-2">
                <i className="bi bi-telephone me-2"></i> <a href="tel:+1234567890">+1 (234) 567-890</a>
              </li>
              <li className="mb-2">
                <i className="bi bi-clock me-2"></i> 24/7 News Updates
              </li>
            </ul>
          </div>
        </div>
        
        <hr className="my-4 bg-secondary" />
        
        <div className="row align-items-center">
          <div className="col-md-6 text-center text-md-start mb-3 mb-md-0">
            <p className="text-light-50 mb-0">
              &copy; {currentYear} NewsWorld. All rights reserved.
            </p>
          </div>
          <div className="col-md-6 text-center text-md-end">
            <ul className="list-inline mb-0">
              <li className="list-inline-item">
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li className="list-inline-item">
                <Link href="/terms">Terms of Use</Link>
              </li>
              <li className="list-inline-item">
                <Link href="/sitemap.xml">Sitemap</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
} 