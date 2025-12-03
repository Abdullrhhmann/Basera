/**
 * Google Maps Link Parser Utility
 * Extracts latitude and longitude from various Google Maps URL formats
 */

/**
 * Validates if coordinates are within valid ranges
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
const isValidCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Extract coordinates directly from URL without resolving
 * @param {string} url - Google Maps URL
 * @returns {object|null} - { latitude, longitude } or null if not found
 */
const extractCoordinatesFromUrl = (url) => {
  const patterns = [
    // Pattern 1: Query parameter format (?q=lat,lng)
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Pattern 2: @ format (/@lat,lng,zoom)
    /\/@(-?\d+\.?\d*),(-?\d+\.?\d*),?(\d+\.?\d*)?z?/,
    // Pattern 3: /place/ format
    /\/place\/[^/]*?(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Pattern 4: Search format (/search/lat,lng) - handles spaces and + signs after comma
    /\/search\/(-?\d+\.?\d*)\s*,\s*\+?(-?\d+\.?\d*)/,
    // Pattern 5: ll parameter (ll=lat,lng)
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Pattern 6: data parameter (!3d and !4d)
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    // Pattern 7: Meta tags with coordinates (center=lat%2Clng)
    /center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/,
    // Pattern 8: Meta tags with coordinates (center=lat,lng)
    /center=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Pattern 9: Direct coordinates in URL path (high precision)
    /(-?\d+\.?\d{4,}),(-?\d+\.?\d{4,})/,
    // Pattern 10: Shortened URL patterns
    /maps\.app\.goo\.gl\/[A-Za-z0-9_-]+.*?(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /goo\.gl\/[A-Za-z0-9_-]+.*?(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Pattern 11: Any coordinates in the URL (lower precision fallback)
    /(-?\d+\.?\d{3,}),(-?\d+\.?\d{3,})/,
    // Pattern 12: Coordinates with spaces or other separators
    /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/,
    // Pattern 13: Coordinates in different formats
    /lat[=:](-?\d+\.?\d*).*?lng[=:](-?\d+\.?\d*)/i,
    /lng[=:](-?\d+\.?\d*).*?lat[=:](-?\d+\.?\d*)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidCoordinates(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
};

/**
 * Resolve shortened Google Maps URLs to their full form
 * @param {string} shortUrl - Shortened URL (e.g., maps.app.goo.gl/...)
 * @returns {Promise<string>} - Full URL or original URL if not shortened
 */
const resolveShortUrl = async (shortUrl) => {
  if (!shortUrl.includes('goo.gl') && !shortUrl.includes('maps.app.goo.gl')) {
    return shortUrl;
  }

  try {
    console.log('Resolving short URL:', shortUrl);
    
    // Try multiple CORS proxies for better reliability
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(shortUrl)}`,
      `https://cors-anywhere.herokuapp.com/${shortUrl}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(shortUrl)}`,
      `https://thingproxy.freeboard.io/fetch/${shortUrl}`
    ];

    for (const proxyUrl of proxies) {
      try {
        console.log('Trying proxy:', proxyUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const resolvedUrl = data.contents || data;
          if (resolvedUrl && resolvedUrl !== shortUrl && (resolvedUrl.includes('google.com') || resolvedUrl.includes('maps'))) {
            console.log('Successfully resolved short URL:', resolvedUrl);
            return resolvedUrl;
          }
        }
      } catch (proxyError) {
        console.warn('Proxy failed:', proxyError);
        continue;
      }
    }
    
    // If all proxies fail, try a different approach - use a server-side resolver
    try {
      const serverProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(shortUrl)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(serverProxyUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const resolvedUrl = await response.text();
        if (resolvedUrl && resolvedUrl !== shortUrl && (resolvedUrl.includes('google.com') || resolvedUrl.includes('maps'))) {
          console.log('Successfully resolved short URL via raw proxy:', resolvedUrl);
          return resolvedUrl;
        }
      }
    } catch (rawError) {
      console.warn('Raw proxy also failed:', rawError);
    }
    
    console.warn('All proxies failed, returning original URL');
    return shortUrl;
  } catch (error) {
    console.warn('Could not resolve short URL:', error);
    return shortUrl;
  }
};

/**
 * Parse Google Maps URL and extract coordinates
 * Supports various URL formats:
 * - https://maps.google.com/?q=30.0444,31.2357
 * - https://www.google.com/maps/place/30.0444,31.2357
 * - https://www.google.com/maps/@30.0444,31.2357,15z
 * - https://maps.app.goo.gl/... (shortened links)
 * - https://www.google.com/maps/search/30.0444,31.2357
 * 
 * @param {string} url - Google Maps URL
 * @returns {Promise<object|null>} - { latitude, longitude } or null if parsing fails
 */
export const parseGoogleMapsLink = async (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    console.log('Parsing URL:', url);
    
    // First try to extract coordinates directly from the URL (for some shortened URLs)
    const directResult = extractCoordinatesFromUrl(url.trim());
    if (directResult) {
      console.log('Found coordinates directly in URL');
      return directResult;
    }

    // Enhanced pattern matching for shortened URLs
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.log('Detected shortened URL, attempting enhanced extraction');
      
      // Try to extract coordinates from the URL path itself
      const shortUrlPatterns = [
        // Pattern for maps.app.goo.gl with coordinates in path
        /maps\.app\.goo\.gl\/[A-Za-z0-9_-]+.*?(-?\d+\.?\d{3,}),(-?\d+\.?\d{3,})/,
        // Pattern for goo.gl with coordinates
        /goo\.gl\/[A-Za-z0-9_-]+.*?(-?\d+\.?\d{3,}),(-?\d+\.?\d{3,})/,
        // General pattern for any coordinates in shortened URLs
        /(-?\d+\.?\d{3,}),(-?\d+\.?\d{3,})/
      ];
      
      for (const pattern of shortUrlPatterns) {
        const match = url.match(pattern);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (isValidCoordinates(lat, lng)) {
            console.log('Found coordinates in shortened URL:', { lat, lng });
            return { latitude: lat, longitude: lng };
          }
        }
      }
    }

    // If direct extraction failed and it's a shortened URL, try to resolve it
    const resolvedUrl = await resolveShortUrl(url);
    const cleanUrl = resolvedUrl.trim();
    
    console.log('Resolved URL:', cleanUrl);
    
    // Try to extract coordinates from the resolved URL
    const resolvedResult = extractCoordinatesFromUrl(cleanUrl);
    if (resolvedResult) {
      console.log('Found coordinates in resolved URL');
      return resolvedResult;
    }

    console.log('No coordinates found in any method');
    return null;
  } catch (error) {
    console.error('Error parsing Google Maps link:', error);
    return null;
  }
};

/**
 * Check if a string looks like a Google Maps URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export const isGoogleMapsLink = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const cleanUrl = url.toLowerCase().trim();
  return (
    cleanUrl.includes('google.com/maps') ||
    cleanUrl.includes('maps.google.com') ||
    cleanUrl.includes('maps.app.goo.gl') ||
    cleanUrl.includes('goo.gl/maps')
  );
};

/**
 * Format coordinates as a Google Maps URL
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {string} - Google Maps URL
 */
export const coordinatesToMapsLink = (latitude, longitude) => {
  if (!isValidCoordinates(latitude, longitude)) {
    return '';
  }
  
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

const mapsLinkParser = {
  parseGoogleMapsLink,
  isGoogleMapsLink,
  coordinatesToMapsLink,
  isValidCoordinates
};

export default mapsLinkParser;

