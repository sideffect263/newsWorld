# NewsWorld API

A Node.js backend API for a global news and data aggregation platform. This service collects, processes, and serves news articles from various sources around the world.

## Features

- **News Aggregation**: Collect news from multiple sources (APIs, RSS feeds, web scraping)
- **Data Processing**: Clean, categorize, and enrich news articles
- **RESTful API**: Serve news content through a well-structured API
- **User Management**: Authentication, preferences, and personalization
- **Scheduled Updates**: Automatically fetch news at configurable intervals
- **AI-Generated Insights**: Generate predictions and insights for news articles using LLM integration
- **Multi-LLM Support**: Fallback mechanisms between different LLM providers (Gemini, Together AI, Mistral AI) for improved reliability

## Tech Stack

- **Node.js & Express**: Backend framework
- **MongoDB**: Database for storing articles and user data
- **Redis**: Caching for improved performance
- **JWT**: Authentication and authorization
- **Axios**: HTTP client for API requests
- **RSS Parser**: For processing RSS feeds
- **Node-cron**: For scheduling tasks
- **Gemini API**: Primary AI model for content insights
- **Together AI API**: Secondary fallback AI model
- **Mistral AI API**: Tertiary fallback AI model for maximum reliability

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Redis (optional, for caching)
- API keys for news services (NewsAPI, Mediastack, etc.)
- API keys for AI services:
  - Google Gemini API (primary)
  - Together AI API (secondary fallback)
  - Mistral AI API (tertiary fallback)

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/newsworld.git
   cd newsworld
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/newsworld
   JWT_SECRET=your_jwt_secret_key_change_in_production
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   NEWS_API_KEY=your_newsapi_key
   MEDIASTACK_API_KEY=your_mediastack_key
   REDIS_URL=redis://localhost:6379
   GEMINI_API=your_gemini_api_key
   TOGETHER_API=your_together_api_key
   MISTRAL_API=your_mistral_api_key
   ```

4. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

### News

- `GET /api/news` - Get all articles with pagination and filtering
- `GET /api/news/latest` - Get latest articles
- `GET /api/news/top` - Get top articles by view count
- `GET /api/news/category/:category` - Get articles by category
- `GET /api/news/source/:sourceId` - Get articles by source
- `GET /api/news/country/:countryCode` - Get articles by country
- `GET /api/news/search` - Search articles
- `GET /api/news/:id` - Get single article
- `PUT /api/news/:id/view` - Increment article view count
- `POST /api/news/save/:id` - Save article for user (requires auth)
- `DELETE /api/news/save/:id` - Remove saved article for user (requires auth)

### Sources

- `GET /api/sources` - Get all sources
- `GET /api/sources/category/:category` - Get sources by category
- `GET /api/sources/country/:countryCode` - Get sources by country
- `GET /api/sources/language/:languageCode` - Get sources by language
- `GET /api/sources/:id` - Get single source
- `POST /api/sources` - Create new source (admin only)
- `PUT /api/sources/:id` - Update source (admin only)
- `DELETE /api/sources/:id` - Delete source (admin only)
- `POST /api/sources/:id/test` - Test source fetch (admin only)

### Users

- `POST /api/users/register` - Register user
- `POST /api/users/login` - Login user
- `GET /api/users/logout` - Logout user
- `GET /api/users/me` - Get current user
- `PUT /api/users/details` - Update user details
- `PUT /api/users/password` - Update password
- `POST /api/users/forgot-password` - Forgot password
- `PUT /api/users/reset-password/:resetToken` - Reset password
- `GET /api/users/preferences` - Get user preferences
- `PUT /api/users/preferences` - Update user preferences
- `GET /api/users/saved-articles` - Get saved articles
- `GET /api/users/read-history` - Get read history

## Development

### Running in Development Mode

```
npm run dev
```

### Running Tests

```
npm test
```

### Building for Production

```
npm run build
```

### Running in Production

```
npm start
```

## Project Structure

```
newsworld/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── .env                 # Environment variables
├── .gitignore           # Git ignore file
├── package.json         # Dependencies and scripts
└── README.md            # Project documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [NewsAPI](https://newsapi.org/) - News API service
- [Mediastack](https://mediastack.com/) - News data API
- [MongoDB](https://www.mongodb.com/) - Database
- [Express](https://expressjs.com/) - Web framework
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Google Gemini](https://ai.google.dev/) - AI API for content insights
- [Together AI](https://www.together.ai/) - Fallback LLM provider
- [Mistral AI](https://mistral.ai/) - Additional fallback LLM provider
