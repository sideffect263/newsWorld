const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const Article = require('./models/article.model');

// Import routes (to be created)
const newsRoutes = require('./routes/news.routes');
const sourcesRoutes = require('./routes/sources.routes');
const statusRoutes = require('./routes/status.routes');
const trendsRoutes = require('./routes/trends.routes');
const sentimentRoutes = require('./routes/sentiment.routes');
const storyRoutes = require('./routes/story.routes'); // New story routes
const scheduler = require('./services/scheduler');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply middleware
// app.use(helmet()); // Remove default security headers since we're customizing below
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Logging

// Apply a more permissive Content Security Policy to allow inline scripts
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com; " +
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net https://cdn.jsdelivr.net; " +
    "img-src 'self' data: https://picsum.photos https://images.unsplash.com cdn.jsdelivr.net https://cdn.jsdelivr.net *.openstreetmap.org *.tile.openstreetmap.org https://www.google-analytics.com; " +
    "connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 nominatim.openstreetmap.org https://nominatim.openstreetmap.org https://www.google-analytics.com https://www.googletagmanager.com; " +
    "font-src 'self' cdn.jsdelivr.net https://cdn.jsdelivr.net; " +
    "object-src 'none'; " +
    "media-src 'none'; " +
    "frame-src 'none';"
  );
  next();
});

// SEO optimizations
app.use((req, res, next) => {
  // Add X-Robots-Tag header to allow indexing on all pages
  res.setHeader('X-Robots-Tag', 'index, follow');
  
  // Add Link header with sitemap URL for search engines
  res.setHeader('Link', '</sitemaps>; rel="sitemap"');
  
  next();
});

// Apply other security headers using helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP from helmet since we're using our custom one
  })
);

// Serve static files after all security headers are applied
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Serve static files with authentication
app.use(express.static(path.join(__dirname, 'public'), {
  index: false // Disable automatic serving of index.html
}));

// Serve favicon
app.use('/favicon', express.static(path.join(__dirname, 'public/favicon')));

// Explicitly serve robots.txt
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/robots.txt'));
});

// Serve static sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/sitemap.xml'));
});

// Dynamically generate news sitemap with articles
app.get('/news-sitemap.xml', async (req, res) => {
  try {
    const articles = await Article.find({})
      .sort({ publishedAt: -1 })
      .limit(1000)
      .select('_id title publishedAt categories');

    res.header('Content-Type', 'application/xml');
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';
    
    articles.forEach(article => {
      const pubDate = new Date(article.publishedAt).toISOString();
      xml += '  <url>\n';
      xml += `    <loc>https://newsworld.com/news/${article._id}</loc>\n`;
      xml += `    <lastmod>${pubDate}</lastmod>\n`;
      xml += '    <news:news>\n';
      xml += '      <news:publication>\n';
      xml += '        <news:name>NewsWorld</news:name>\n';
      xml += '        <news:language>en</news:language>\n';
      xml += '      </news:publication>\n';
      xml += `      <news:publication_date>${pubDate}</news:publication_date>\n`;
      xml += `      <news:title>${article.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</news:title>\n`;
      if (article.categories && article.categories.length > 0) {
        xml += `      <news:keywords>${article.categories.join(',')}</news:keywords>\n`;
      }
      xml += '    </news:news>\n';
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    res.send(xml);
  } catch (error) {
    console.error('Error generating news sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Generate a stories sitemap
app.get('/stories-sitemap.xml', async (req, res) => {
  try {
    const Story = require('./models/story.model');
    const stories = await Story.find({})
      .sort({ updatedAt: -1 })
      .limit(1000)
      .select('_id title updatedAt timeline categories keywords relevancyScore');

    res.header('Content-Type', 'application/xml');
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';
    
    stories.forEach(story => {
      const lastMod = new Date(story.updatedAt).toISOString();
      // Calculate priority based on relevancy score (scale 0-1)
      const priority = Math.min(1, Math.max(0.1, (story.relevancyScore || 0) / 1000)).toFixed(1);
      
      xml += '  <url>\n';
      xml += `    <loc>https://newsworld.com/stories/${story._id}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      
      // Add changefreq based on whether the story is ongoing
      if (story.timeline && story.timeline.ongoing) {
        xml += '    <changefreq>daily</changefreq>\n';
      } else {
        xml += '    <changefreq>weekly</changefreq>\n';
      }
      
      // Add priority
      xml += `    <priority>${priority}</priority>\n`;
      
      // Add news-specific tags
      xml += '    <news:news>\n';
      xml += '      <news:publication>\n';
      xml += '        <news:name>NewsWorld</news:name>\n';
      xml += '        <news:language>en</news:language>\n';
      xml += '      </news:publication>\n';
      xml += `      <news:publication_date>${lastMod}</news:publication_date>\n`;
      xml += `      <news:title>${story.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</news:title>\n`;
      
      // Add keywords from categories and keywords
      const allKeywords = [
        ...(story.categories || []),
        ...(story.keywords || [])
      ];
      
      if (allKeywords.length > 0) {
        xml += `      <news:keywords>${allKeywords.join(',')}</news:keywords>\n`;
      }
      
      xml += '    </news:news>\n';
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    res.send(xml);
  } catch (error) {
    console.error('Error generating stories sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Public routes (no authentication required)

// Serve news page
app.get('/news', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/news.html'));
});

// Serve stories page (new)
app.get('/stories', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/story.html'));
});

// Serve individual story page (new)
app.get('/stories/:id', async (req, res) => {
  try {
    // Check if story exists (for SEO purposes)
    const Story = require('./models/story.model');
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.redirect('/stories');
    }
    
    // Track view count
    story.viewCount = (story.viewCount || 0) + 1;
    await story.save();
    
    res.sendFile(path.join(__dirname, 'public/story-view.html'));
  } catch (error) {
    console.error('Error serving story page:', error);
    res.redirect('/stories');
  }
});

// Removed protect middleware from routes
app.use('/api/sources', sourcesRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use('/api/news', newsRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/stories', storyRoutes); // New route
app.use('/status', statusRoutes);

// Removed reference to /api/users route

// Serve source management page
app.get('/sources', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/sources.html'));
});

// Serve trends page
app.get('/trends', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/trends.html'));
});

// Serve sentiment page
app.get('/sentiment', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/sentiment.html'));
});

// Individual news article pages for SEO
app.get('/news/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.redirect('/news');
    }
    
    // Track view count
    article.viewCount = (article.viewCount || 0) + 1;
    await article.save();
    
    res.sendFile(path.join(__dirname, 'public/article.html'));
  } catch (error) {
    console.error('Error serving article page:', error);
    res.redirect('/news');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.get('/sitemaps', (req, res) => {
  res.header('Content-Type', 'application/xml');

  const lastMod = new Date().toISOString(); // Use a single timestamp

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://newsworld.com/sitemap.xml</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://newsworld.com/news-sitemap.xml</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://newsworld.com/stories-sitemap.xml</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.send(xml);
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong on the server',
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI not found in environment variables. Using default connection string.');
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsworld');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  // Start the news fetching scheduler
  scheduler.startNewsScheduler();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();