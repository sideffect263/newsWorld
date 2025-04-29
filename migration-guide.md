# NewsWorld Migration Guide: Express to Next.js

## Overview

This guide outlines the process of migrating the NewsWorld application's frontend from static HTML pages served by Express to a modern Next.js application. Next.js offers several advantages:

- Server-side rendering (SSR) for improved SEO
- Improved developer experience with React components
- Built-in routing and API routes
- Automatic code splitting and performance optimization
- Static site generation capabilities

## Project Structure

### Current Structure

```
/src
  /public            - Static HTML, CSS, JS files
    /js              - Client-side JavaScript
    /styles          - CSS files
    /scripts         - Additional JS utilities
    /components      - Reusable HTML components
    news.html        - Individual page templates
    index.html
    article.html
    ...
  /routes            - Express route handlers
  /controllers       - Express controllers
  /models            - Mongoose models
  /services          - Backend services
  server.js          - Main Express application
```

### Next.js Structure

```
/small-news (or rename to /frontend)
  /src
    /app             - App Router (newer Next.js approach)
      /api           - API routes (can proxy to backend)
      /news          - News page routes
      /stories       - Story page routes
      /trends        - Trends page routes
      /sentiment     - Sentiment page routes
      /sources       - Sources page routes
      layout.js      - Root layout
      page.js        - Home page
    /components      - Reusable React components
    /lib             - Utility functions
    /styles          - Global styles
    /public          - Static assets
```

## Migration Strategy

1. **Incremental Migration**: Convert one page at a time, starting with simpler pages
2. **Proxy API Requests**: Initially keep the Express backend and proxy requests from Next.js
3. **Maintain Compatibility**: Ensure URLs remain consistent for SEO purposes
4. **Component Extraction**: Extract reusable components from existing HTML templates
5. **Feature Parity**: Ensure all existing functionality is maintained during migration

## Step-by-Step Migration Process

### 1. Set Up Next.js Project Structure

The `small-news` directory already contains a basic Next.js setup. You can:

- Rename it to something more appropriate (e.g., `frontend`)
- Install necessary dependencies

```bash
cd small-news
npm install axios swr react-chartjs-2 chart.js leaflet react-leaflet
```

### 2. Create Page Templates

For each HTML page in your current `/public` directory, create a corresponding Next.js page:

Example migration of the news page:

Current: `/src/public/news.html` → New: `/small-news/src/app/news/page.js`

```jsx
// Example: /small-news/src/app/news/page.js
export const metadata = {
  title: 'Latest News | NewsWorld',
  description: 'Stay updated with the latest news from NewsWorld',
}

export default function NewsPage() {
  return (
    <main>
      <h1>Latest News</h1>
      {/* Content migrated from news.html */}
    </main>
  )
}
```

### 3. Create Reusable Components

Identify repeating patterns in your HTML templates and extract them as React components:

- Header/Navigation
- Footer
- News Article Card
- Sidebar
- Search Box
- Filter Controls

Example:

```jsx
// /small-news/src/components/ArticleCard.jsx
export default function ArticleCard({ article }) {
  return (
    <div className="article-card">
      <h2>{article.title}</h2>
      <p>{article.description}</p>
      {/* More content */}
    </div>
  )
}
```

### 4. Create API Integration Layer

Set up API integration to fetch data from your existing Express backend:

```jsx
// /small-news/src/lib/api.js
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const fetchNews = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/news`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
};

// Add more API methods for stories, trends, etc.
```

### 5. Set Up Data Fetching in Pages

Implement data fetching in your Next.js pages:

```jsx
// Example with server-side rendering
// /small-news/src/app/news/page.js
import { fetchNews } from '@/lib/api';
import ArticleCard from '@/components/ArticleCard';

// This function runs on the server
export async function generateMetadata() {
  return {
    title: 'Latest News | NewsWorld',
    description: 'Stay updated with the latest news from NewsWorld',
  };
}

export default async function NewsPage() {
  const news = await fetchNews();
  
  return (
    <main>
      <h1>Latest News</h1>
      <div className="articles-grid">
        {news.articles.map(article => (
          <ArticleCard key={article._id} article={article} />
        ))}
      </div>
    </main>
  );
}
```

### 6. Dynamic Routes for Individual Articles/Stories

Create dynamic routes for individual content:

```jsx
// /small-news/src/app/news/[id]/page.js
import { fetchArticle } from '@/lib/api';

export async function generateMetadata({ params }) {
  const article = await fetchArticle(params.id);
  
  return {
    title: `${article.title} | NewsWorld`,
    description: article.description || 'Read this article on NewsWorld',
  };
}

export default async function ArticlePage({ params }) {
  const article = await fetchArticle(params.id);
  
  return (
    <article>
      <h1>{article.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: article.content }} />
      {/* More content */}
    </article>
  );
}
```

### 7. Migrate CSS and Assets

1. Copy global CSS to `/small-news/src/app/globals.css`
2. Use CSS Modules for component-specific styles
3. Move static assets (images, fonts) to `/small-news/public/`

### 8. Address SEO Requirements

Ensure SEO-friendly features are maintained:

1. Use appropriate metadata in each page
2. Implement dynamic metadata for article/story pages
3. Add a robots.txt file in the public directory
4. Generate a sitemap.xml (Next.js has packages for this)

```jsx
// Example sitemap configuration using next-sitemap
// next-sitemap.config.js
module.exports = {
  siteUrl: 'https://newsworld.com',
  generateRobotsTxt: true,
  additionalSitemaps: [
    'https://newsworld.com/news-sitemap.xml',
    'https://newsworld.com/stories-sitemap.xml',
  ],
};
```

### 9. Implement User Authentication (if needed)

If your app requires authentication, implement it using Next.js authentication solutions like NextAuth.js.

### 10. Testing and Deployment

1. Test the migrated application thoroughly
2. Set up CI/CD for the Next.js application
3. Deploy to Vercel or other hosting platforms

## Migration Checklist

- [x] Home page (index.html → src/app/page.js)
- [x] News page (news.html → src/app/news/page.js)
- [x] Article page (article.html → src/app/news/[id]/page.js)
- [x] Stories page (story.html → src/app/stories/page.js)
- [x] Story view page (story-view.html → src/app/stories/[id]/page.js)
- [x] Trends page (trends.html → src/app/trends/page.js)
- [x] Sentiment page (sentiment.html → src/app/sentiment/page.js)
- [x] Sources page (sources.html → src/app/sources/page.js)
- [x] Status page (status.html → src/app/status/page.js)
- [x] Scheduler status page (scheduler-status.html → src/app/status/scheduler/page.js)

## Deployment Strategy

### Option 1: Standalone Next.js with API Proxy

Deploy Next.js application separately from your Express backend and use Next.js API routes to proxy requests to your backend.

### Option 2: Next.js Integrated with Express

Mount your Next.js application within your Express app using next-express.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Next.js SEO](https://nextjs.org/learn/seo/introduction-to-seo)
- [Next.js with Express](https://github.com/vercel/next.js/tree/canary/examples/custom-server-express)
