/**
 * Submit Sitemap to Google Search Console
 * 
 * This script helps you submit your sitemap to Google Search Console.
 * You need to have Google Search Console API enabled and proper authentication.
 * 
 * Usage:
 * 1. Install required dependencies: npm install googleapis
 * 2. Set up Google API credentials (service account or OAuth)
 * 3. Run this script: node submit-sitemap.js
 */

const { google } = require('googleapis');
const path = require('path');

// Site URL including protocol (e.g., https://www.example.com)
const SITE_URL = 'https://newsworld.com';

// Sitemap URLs to submit (relative to SITE_URL)
const SITEMAPS = [
  '/sitemap.xml',
  '/news-sitemap.xml',
  '/sitemaps' // Sitemap index file
];

// Setup authentication
async function authenticate() {
  try {
    // Method 1: Using API key (limited functionality)
    // const auth = new google.auth.GoogleAuth({
    //   keyFile: path.join(__dirname, '../config/google-api-key.json'),
    //   scopes: ['https://www.googleapis.com/auth/webmasters']
    // });
    
    // Method 2: Using OAuth2 (requires browser auth flow)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Set credentials (you need to obtain these separately)
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
    
    return oauth2Client;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Submit sitemaps to Google Search Console
async function submitSitemaps() {
  try {
    console.log('Starting sitemap submission process...');
    
    // Authenticate
    const auth = await authenticate();
    
    // Create Search Console API client
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth
    });
    
    // Submit each sitemap
    for (const sitemap of SITEMAPS) {
      const sitemapUrl = sitemap.startsWith('http') ? sitemap : `${SITE_URL}${sitemap}`;
      
      try {
        console.log(`Submitting sitemap: ${sitemapUrl}`);
        
        // Submit sitemap
        await searchconsole.sitemaps.submit({
          siteUrl: SITE_URL,
          feedpath: sitemapUrl
        });
        
        console.log(`Successfully submitted: ${sitemapUrl}`);
      } catch (error) {
        console.error(`Error submitting sitemap ${sitemapUrl}:`, error.message);
      }
    }
    
    // List all sitemaps to verify submission
    const res = await searchconsole.sitemaps.list({
      siteUrl: SITE_URL
    });
    
    console.log('\nCurrent sitemaps in Google Search Console:');
    if (res.data.sitemap && res.data.sitemap.length > 0) {
      res.data.sitemap.forEach(sitemap => {
        console.log(`- ${sitemap.path} (Status: ${sitemap.lastSubmitted ? 'Submitted' : 'Not submitted'})`);
      });
    } else {
      console.log('No sitemaps found.');
    }
    
    console.log('\nSitemap submission process completed.');
  } catch (error) {
    console.error('Error in submitSitemaps:', error);
  }
}

// Manual execution when running this script directly
if (require.main === module) {
  submitSitemaps()
    .then(() => console.log('Done!'))
    .catch(error => console.error('Error:', error));
}

module.exports = { submitSitemaps }; 