const compromise = require('compromise');
const countries = require('../data/countries.json');

// Create a map for quick country name to code lookup
const countryNameToCode = {};
countries.forEach(country => {
  countryNameToCode[country.name.toLowerCase()] = country.code;
  if (country.alternateNames && country.alternateNames.length) {
    country.alternateNames.forEach(altName => {
      countryNameToCode[altName.toLowerCase()] = country.code;
    });
  }
});

/**
 * Extract locations from text using NLP
 * @param {String} text - The text to extract locations from
 * @returns {Array} - Array of extracted locations with confidence scores
 */
exports.extractLocations = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  try {
    const doc = compromise(text);
    const locations = [];
    
    // Extract places from text using compromise
    const places = doc.places();
    
    places.forEach(place => {
      const name = place.text().trim();
      if (name && name.length > 2) {
        // Check if it's already in our array
        const existing = locations.find(loc => loc.name.toLowerCase() === name.toLowerCase());
        
        if (existing) {
          existing.count += 1;
          existing.confidence = Math.min(0.9, existing.confidence + 0.1); // Increase confidence with repetition
        } else {
          locations.push({
            name,
            type: 'location',
            count: 1,
            confidence: 0.6, // Base confidence for NER
            source: 'compromise'
          });
        }
      }
    });
    
    // Enhanced extraction for countries
    extractCountries(text, locations);
    
    // Extract cities using pattern matching
    extractCities(text, locations);
    
    return locations.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('Error extracting locations:', error);
    return [];
  }
};

/**
 * Extract country names from text
 * @param {String} text - The text to extract countries from
 * @param {Array} locations - Array to add extracted countries to
 */
const extractCountries = (text, locations) => {
  if (!countries || !countries.length) return;
  
  const lowerText = text.toLowerCase();
  
  countries.forEach(country => {
    // Check for the country name
    if (country.name && containsWord(lowerText, country.name.toLowerCase())) {
      addLocation(locations, country.name, 'country', 0.8, 'dictionary', country.code);
    }
    
    // Check for country code mentions (less confidence)
    if (country.code && new RegExp(`\\b${country.code.toLowerCase()}\\b`).test(lowerText)) {
      addLocation(locations, country.name, 'country', 0.7, 'country_code', country.code);
    }
    
    // Check alternate names
    if (country.alternateNames && Array.isArray(country.alternateNames)) {
      country.alternateNames.forEach(altName => {
        if (containsWord(lowerText, altName.toLowerCase())) {
          addLocation(locations, country.name, 'country', 0.75, 'alt_name', country.code);
        }
      });
    }
  });
};

/**
 * Extract cities using pattern matching
 * @param {String} text - The text to extract cities from
 * @param {Array} locations - Array to add extracted cities to
 */
const extractCities = (text, locations) => {
  // Simple pattern matching for city mentions
  // Look for patterns like "in City", "at City", etc.
  const cityPatterns = [
    /\bin\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g,
    /\bat\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g,
    /\bfrom\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g,
    /\bto\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g,
    /\bcity\s+of\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/gi,
  ];
  
  cityPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const cityName = match[1].trim();
      
      // Avoid dates and other common false positives
      if (isLikelyCityName(cityName)) {
        // Use 'location' type for cities since 'city' isn't a valid entity type in the schema
        addLocation(locations, cityName, 'location', 0.6, 'pattern');
      }
    }
  });
};

/**
 * Add a location to the locations array or update if it exists
 * @param {Array} locations - Array of locations
 * @param {String} name - Location name
 * @param {String} locationType - Type of location (country, city, etc)
 * @param {Number} confidence - Confidence score
 * @param {String} source - Source of the extraction
 * @param {String} countryCode - ISO country code (for countries only)
 */
const addLocation = (locations, name, locationType, confidence, source, countryCode = null) => {
  const existing = locations.find(loc => loc.name.toLowerCase() === name.toLowerCase());
  
  if (existing) {
    existing.count += 1;
    
    // Take the higher confidence value
    if (confidence > existing.confidence) {
      existing.confidence = confidence;
      existing.type = locationType;
      existing.source = source;
      if (countryCode) {
        existing.countryCode = countryCode;
      }
    }
  } else {
    const location = {
      name,
      type: locationType,
      count: 1,
      confidence,
      source
    };
    
    if (countryCode) {
      location.countryCode = countryCode;
    }
    
    locations.push(location);
  }
};

/**
 * Check if text contains a whole word match
 * @param {String} text - Text to search in
 * @param {String} word - Word to search for
 * @returns {Boolean} - Whether the word is found
 */
const containsWord = (text, word) => {
  return new RegExp(`\\b${word}\\b`, 'i').test(text);
};

/**
 * Check if a name is likely to be a city
 * @param {String} name - Name to check
 * @returns {Boolean} - Whether the name is likely a city
 */
const isLikelyCityName = (name) => {
  // Avoid common false positives
  const notCities = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 
    'August', 'September', 'October', 'November', 'December',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'The', 'This', 'That', 'These', 'Those', 'I', 'We', 'You', 'They'
  ];
  
  if (notCities.includes(name)) {
    return false;
  }
  
  // Check if looks like a date
  if (/^\d+$/.test(name) || /^\d+\s+\w+$/.test(name)) {
    return false;
  }
  
  return true;
};

/**
 * Extract locations from RSS feed metadata
 * @param {Object} feedItem - RSS feed item
 * @returns {Array} - Array of locations
 */
exports.extractLocationsFromFeedMetadata = (feedItem) => {
  const locations = [];
  
  if (!feedItem) return locations;
  
  // Extract from geo tags if available
  if (feedItem.geo && feedItem.geo.point) {
    locations.push({
      name: `Location at ${feedItem.geo.point}`,
      type: 'location',
      count: 1,
      confidence: 0.9,
      source: 'geo_tag',
      coordinates: feedItem.geo.point
    });
  }
  
  // Extract from lat/long if available
  if (feedItem.lat && feedItem.long) {
    locations.push({
      name: `Location at ${feedItem.lat},${feedItem.long}`,
      type: 'location',
      count: 1,
      confidence: 0.9,
      source: 'lat_long',
      coordinates: {
        lat: feedItem.lat,
        long: feedItem.long
      }
    });
  }
  
  // Look for location in categories
  if (feedItem.categories && Array.isArray(feedItem.categories)) {
    feedItem.categories.forEach(category => {
      // If category is an object (some RSS feeds use this format)
      const categoryText = typeof category === 'object' ? category._ : category;
      
      if (categoryText && typeof categoryText === 'string') {
        // Check if category is a location
        const doc = compromise(categoryText);
        const places = doc.places();
        
        places.forEach(place => {
          const name = place.text().trim();
          if (name && name.length > 2) {
            addLocation(locations, name, 'location', 0.7, 'rss_category');
          }
        });
      }
    });
  }
  
  return locations;
};

/**
 * Normalize locations by resolving duplicates and ambiguities
 * @param {Array} locations - Array of extracted locations
 * @returns {Array} - Normalized locations
 */
exports.normalizeLocations = (locations) => {
  if (!locations || !locations.length) return [];
  
  // Group by normalized name
  const locationMap = {};
  
  locations.forEach(location => {
    const normalizedName = location.name.toLowerCase();
    
    if (!locationMap[normalizedName]) {
      locationMap[normalizedName] = {
        name: location.name,
        type: location.type,
        count: location.count,
        confidence: location.confidence,
        sources: [location.source]
      };
      
      // Add country code if available
      if (location.countryCode) {
        locationMap[normalizedName].countryCode = location.countryCode;
      }
      // Try to find country code by name
      else if (location.type === 'country' && countryNameToCode[normalizedName]) {
        locationMap[normalizedName].countryCode = countryNameToCode[normalizedName];
      }
    } else {
      // Combine info
      locationMap[normalizedName].count += location.count;
      locationMap[normalizedName].confidence = Math.max(
        locationMap[normalizedName].confidence,
        location.confidence
      );
      
      // Use the type with higher confidence
      if (location.confidence > locationMap[normalizedName].confidence) {
        locationMap[normalizedName].type = location.type;
      }
      
      // Track all sources
      if (!locationMap[normalizedName].sources.includes(location.source)) {
        locationMap[normalizedName].sources.push(location.source);
      }
      
      // Add country code if available
      if (location.countryCode && !locationMap[normalizedName].countryCode) {
        locationMap[normalizedName].countryCode = location.countryCode;
      }
    }
    
    // Ensure city type is converted to location type for compatibility with schema
    if (locationMap[normalizedName].type === 'city') {
      locationMap[normalizedName].type = 'location';
    }
  });
  
  // Convert back to array and sort by confidence
  return Object.values(locationMap)
    .sort((a, b) => b.confidence - a.confidence);
}; 