const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

// Import routes (to be created)
const newsRoutes = require('./routes/news.routes');
const sourcesRoutes = require('./routes/sources.routes');
const userRoutes = require('./routes/user.routes');
const statusRoutes = require('./routes/status.routes');
const scheduler = require('./services/scheduler');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Logging
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Configure Helmet for loading external resources
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "https://cdn.jsdelivr.net"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://picsum.photos", "https://images.unsplash.com", "cdn.jsdelivr.net", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000"],
      fontSrc: ["'self'", "cdn.jsdelivr.net", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  })
);

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

// Public routes (no authentication required)
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/register.html'));
});

// Serve news page
app.get('/news', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/news.html'));
});

// Protected routes
app.use('/api/users', userRoutes); // Removed authenticateToken middleware

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use('/api/news', newsRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/status', statusRoutes);

// Serve source management page
app.get('/sources', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/sources.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
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