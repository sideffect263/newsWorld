# NewsWorld Frontend - Next.js Version

This is the new frontend for the NewsWorld application, built with Next.js. This project is part of the migration from the static HTML/Express-based frontend to a modern React-based architecture.

## Getting Started

### Prerequisites

- Node.js 16.14 or later
- NPM or Yarn

### Installation

1. Clone the repository
2. Navigate to the frontend folder: `cd newsworld/small-news`
3. Install dependencies:

```bash
npm install
# or
yarn install
```

### Configuration

Create a `.env.local` file in the root of the project with the following variables:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Adjust the API URL to match your backend server's address.

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
npm run build
# or
yarn build
```

### Running in Production Mode

```bash
npm start
# or
yarn start
```

## Migration Progress

The following pages have been migrated from the Express-based static HTML to Next.js:

- [x] Home page (`/`)
- [x] News page (`/news`)
- [x] Article detail page (`/news/[id]`)
- [ ] Stories page (`/stories`)
- [ ] Story detail page (`/stories/[id]`)
- [ ] Trends page (`/trends`)
- [ ] Sentiment page (`/sentiment`)
- [ ] Sources page (`/sources`)
- [ ] Status page (`/status`)
- [ ] Scheduler status page (`/status/scheduler`)

## Folder Structure

```
/small-news
  /src
    /app             - Next.js pages using App Router
      /news          - News page routes
      /stories       - Story page routes (to be added)
      /...           - Other routes
    /components      - Reusable React components
    /lib             - Utility functions & API library
    /public          - Static assets
```

## Architecture Notes

- The frontend uses Next.js App Router (new in Next.js 13+)
- Server-side rendering (SSR) is used for better SEO
- The application fetches data from the original Express backend API
- Bootstrap is used for styling with custom CSS for additional styling
- Bootstrap Icons are used for icons

## Dependencies

- Next.js - React framework
- Axios - HTTP client for API requests
- Bootstrap - CSS framework
- Chart.js/react-chartjs-2 - For charts on trends/sentiment pages
- Swiper - For carousels/sliders
- Leaflet/react-leaflet - For maps (on news location pages)

## Contact

For questions or support, contact the development team.
