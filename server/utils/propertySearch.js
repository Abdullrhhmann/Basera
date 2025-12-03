const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const {
  STATUS_MAP,
  TYPE_MAP,
  DEVELOPER_STATUS_MAP,
} = require('./prisma/propertyQueries');

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

/**
 * Extract search criteria from natural language and preferences
 */
function buildSearchCriteria(userPreferences = {}, messageText = '') {
  const propertyBase = {
    isActive: true,
    isArchived: { not: true },
    approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
  };
  const launchBase = {
    isActive: true,
  };
  const propertyConditions = [];
  const launchConditions = [];

  const toDecimal = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    return new Prisma.Decimal(num);
  };

  if (userPreferences.budget) {
    const minDecimal = toDecimal(userPreferences.budget.min);
    const maxDecimal = toDecimal(userPreferences.budget.max);

    if (minDecimal) {
      propertyConditions.push({ price: { gte: minDecimal } });
      launchConditions.push({ startingPrice: { gte: minDecimal } });
    }
    if (maxDecimal) {
      propertyConditions.push({ price: { lte: maxDecimal } });
      launchConditions.push({ startingPrice: { lte: maxDecimal } });
    }

    if (userPreferences.budget.currency) {
      propertyConditions.push({ currency: userPreferences.budget.currency });
      launchConditions.push({ currency: userPreferences.budget.currency });
    }
  }

  if (userPreferences.location) {
    if (userPreferences.location.city) {
      const city = userPreferences.location.city.trim();
      if (city) {
        propertyConditions.push({
          OR: [
            {
              location: {
                path: ['city'],
                string_contains: city,
                mode: 'insensitive',
              },
            },
            {
              city: { name: { contains: city, mode: 'insensitive' } },
            },
            {
              compound: { name: { contains: city, mode: 'insensitive' } },
            },
          ],
        });
        launchConditions.push({
          location: { contains: city, mode: 'insensitive' },
        });
      }
    }

    if (userPreferences.location.state) {
      const state = userPreferences.location.state.trim();
      if (state) {
        propertyConditions.push({
          location: {
            path: ['state'],
            string_contains: state,
            mode: 'insensitive',
          },
        });
      }
    }
  }

  if (userPreferences.propertyType) {
    const typeKey = normalizeString(userPreferences.propertyType);
    const typeEnum = TYPE_MAP[typeKey] || TYPE_MAP[userPreferences.propertyType];
    if (typeEnum) {
      propertyConditions.push({ type: typeEnum });
    }
    const launchTypeMapping = {
      villa: 'Villa',
      'twin-villa': 'Villa',
      apartment: 'Apartment',
      duplex: 'Duplex',
      commercial: 'Commercial',
      land: 'Land',
    };
    const launchType = launchTypeMapping[typeKey] || launchTypeMapping[userPreferences.propertyType];
    if (launchType) {
      launchConditions.push({ propertyType: launchType });
    }
  }

  if (userPreferences.bedrooms) {
    if (userPreferences.bedrooms.min) {
      propertyConditions.push({
        specifications: {
          path: ['bedrooms'],
          gte: userPreferences.bedrooms.min,
        },
      });
      launchConditions.push({ bedrooms: { gte: userPreferences.bedrooms.min } });
    }
    if (userPreferences.bedrooms.max) {
      propertyConditions.push({
        specifications: {
          path: ['bedrooms'],
          lte: userPreferences.bedrooms.max,
        },
      });
      launchConditions.push({ bedrooms: { lte: userPreferences.bedrooms.max } });
    }
  }

  if (userPreferences.bathrooms) {
    if (userPreferences.bathrooms.min) {
      propertyConditions.push({
        specifications: {
          path: ['bathrooms'],
          gte: userPreferences.bathrooms.min,
        },
      });
      launchConditions.push({ bathrooms: { gte: userPreferences.bathrooms.min } });
    }
    if (userPreferences.bathrooms.max) {
      propertyConditions.push({
        specifications: {
          path: ['bathrooms'],
          lte: userPreferences.bathrooms.max,
        },
      });
      launchConditions.push({ bathrooms: { lte: userPreferences.bathrooms.max } });
    }
  }

  if (userPreferences.area) {
    if (userPreferences.area.min) {
      propertyConditions.push({
        specifications: {
          path: ['area'],
          gte: userPreferences.area.min,
        },
      });
      launchConditions.push({ area: { gte: userPreferences.area.min } });
    }
    if (userPreferences.area.max) {
      propertyConditions.push({
        specifications: {
          path: ['area'],
          lte: userPreferences.area.max,
        },
      });
      launchConditions.push({ area: { lte: userPreferences.area.max } });
    }
  }

  if (userPreferences.features?.length) {
    propertyConditions.push({
      features: { hasSome: userPreferences.features },
    });
    launchConditions.push({
      features: { hasSome: userPreferences.features },
    });
  }

  if (userPreferences.amenities?.length) {
    propertyConditions.push({
      amenities: { hasSome: userPreferences.amenities },
    });
    launchConditions.push({
      amenities: { hasSome: userPreferences.amenities },
    });
  }

  if (userPreferences.developerStatus) {
    const statusKey = normalizeString(userPreferences.developerStatus);
    const statusEnum = DEVELOPER_STATUS_MAP[statusKey] || DEVELOPER_STATUS_MAP[userPreferences.developerStatus];
    if (statusEnum) {
      propertyConditions.push({ developerStatus: statusEnum });
    }
  }

  if (!messageText.toLowerCase().includes('sold') && !messageText.toLowerCase().includes('rented')) {
    propertyConditions.push({
      status: { in: [Prisma.PropertyStatus.FOR_SALE, Prisma.PropertyStatus.FOR_RENT] },
    });
  }

  const propertyWhere = { ...propertyBase };
  if (propertyConditions.length) {
    propertyWhere.AND = propertyConditions;
  }

  const launchWhere = { ...launchBase };
  if (launchConditions.length) {
    launchWhere.AND = launchConditions;
  }

  return {
    propertyWhere,
    launchWhere,
  };
}

/**
 * Search for properties based on criteria
 */
async function searchProperties(userPreferences = {}, messageText = '', limit = 10) {
  try {
    const { propertyWhere } = buildSearchCriteria(userPreferences, messageText);
    const properties = await prisma.property.findMany({
      where: propertyWhere,
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        developerStatus: true,
        price: true,
        currency: true,
        location: true,
        specifications: true,
        features: true,
        amenities: true,
        images: true,
        isFeatured: true,
        createdAt: true,
        developer: {
          select: { id: true, name: true, logo: true, slug: true },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return properties.map((property) => ({
      ...property,
      _id: property.id,
    }));
  } catch (error) {
    console.error('Property search error:', error);
    return [];
  }
}

/**
 * Search for launches based on criteria
 */
async function searchLaunches(userPreferences = {}, messageText = '', limit = 5) {
  try {
    const { launchWhere } = buildSearchCriteria(userPreferences, messageText);
    const launches = await prisma.launch.findMany({
      where: launchWhere,
      orderBy: [
        { isFeatured: 'desc' },
        { launchDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return launches.map((launch) => ({
      ...launch,
      _id: launch.id,
    }));
  } catch (error) {
    console.error('Launch search error:', error);
    return [];
  }
}

/**
 * Get featured properties
 */
async function getFeaturedProperties(limit = 5) {
  try {
    const properties = await prisma.property.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        isArchived: { not: true },
        approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
        status: { in: [Prisma.PropertyStatus.FOR_SALE, Prisma.PropertyStatus.FOR_RENT] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        price: true,
        currency: true,
        location: true,
        specifications: true,
        images: true,
        developer: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return properties.map((property) => ({
      ...property,
      _id: property.id,
    }));
  } catch (error) {
    console.error('Featured properties error:', error);
    return [];
  }
}

/**
 * Get recent launches
 */
async function getRecentLaunches(limit = 5) {
  try {
    const launches = await prisma.launch.findMany({
      where: {
        isActive: true,
        status: { in: ['Available', 'Coming Soon', 'Pre-Launch'] },
      },
      orderBy: [
        { launchDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return launches.map((launch) => ({
      ...launch,
      _id: launch.id,
    }));
  } catch (error) {
    console.error('Recent launches error:', error);
    return [];
  }
}

/**
 * Check if message is asking to see properties/listings
 * BALANCED - strict on gibberish, lenient on genuine requests
 */
function isPropertyRequest(messageText) {
  const lowerText = messageText.toLowerCase().trim();
  
  // If message is too short, probably not a property request
  if (lowerText.length < 2) return false;
  
  // GIBBERISH DETECTION - reject obvious nonsense
  const hasVowels = /[aeiou]/i.test(lowerText);
  const hasNumbers = /\d/.test(lowerText);
  const hasSpaces = lowerText.includes(' ');
  
  // If it's short AND has no vowels (like "xyz", "qwrty"), it's gibberish
  if (lowerText.length < 8 && !hasVowels) return false;
  
  // If it's a single random word with no spaces AND no numbers (not "3 bedroom")
  if (lowerText.length < 12 && !hasSpaces && !hasNumbers && /^[a-z]+$/i.test(lowerText)) {
    // Check if it's a common greeting or question word
    const commonWords = ['hello', 'hi', 'hey', 'help', 'thanks', 'thank', 'yes', 'no', 'ok', 'okay'];
    if (commonWords.includes(lowerText)) return false;
    
    // If it's not a property-related word, probably gibberish
    const propertyWords = ['property', 'properties', 'apartment', 'villa', 'house', 'duplex', 'land', 'commercial', 'launch', 'buy', 'rent', 'sell'];
    if (!propertyWords.includes(lowerText)) return false;
  }
  
  // PROPERTY REQUEST DETECTION - be generous here
  const actionWords = ['show', 'find', 'looking', 'want', 'need', 'search', 'get', 'see', 'interested', 'buy', 'rent', 'purchase'];
  const propertyWords = ['property', 'properties', 'apartment', 'villa', 'house', 'duplex', 'land', 'commercial', 'launch', 'home', 'townhouse'];
  const featureWords = ['bedroom', 'bathroom', 'sqm', 'million', 'thousand', 'egp', 'usd', 'aed', 'budget', 'price', 'cheap', 'affordable', 'luxury'];
  const locationWords = ['cairo', 'giza', 'october', 'zayed', 'nasr', 'maadi', 'zamalek', 'heliopolis', 'alexandria'];
  
  const hasActionWord = actionWords.some(word => lowerText.includes(word));
  const hasPropertyWord = propertyWords.some(word => lowerText.includes(word));
  const hasFeatureWord = featureWords.some(word => lowerText.includes(word));
  const hasLocationWord = locationWords.some(word => lowerText.includes(word));
  
  // Return TRUE if any of these combinations:
  return hasPropertyWord || // Just mentioning a property type
         hasActionWord || // Action words like "show", "find", "want"
         hasFeatureWord || // Features like "3 bedroom", "5 million"
         hasLocationWord || // Location like "New Cairo"
         lowerText.includes('available') ||
         lowerText.includes('what do you have') ||
         lowerText.includes('what have you got');
}

/**
 * Smart search that combines properties and launches
 */
async function smartSearch(userPreferences = {}, messageText = '') {
  // Determine if user is asking about new launches specifically
  const isLaunchQuery = messageText.toLowerCase().includes('launch') || 
                        messageText.toLowerCase().includes('new development') ||
                        messageText.toLowerCase().includes('upcoming');
  
  // Determine if user is asking about investment opportunities
  const isInvestmentQuery = messageText.toLowerCase().includes('invest') ||
                           messageText.toLowerCase().includes('roi') ||
                           messageText.toLowerCase().includes('rental yield');
  
  let properties = [];
  let launches = [];
  
  // Check if user has preferences or is asking for properties
  const hasPreferences = Object.keys(userPreferences).length > 0;
  const wantsToSeeProperties = isPropertyRequest(messageText);
  
  // CRITICAL FIX: Only show properties if CURRENT message is asking for them
  // Having old preferences doesn't matter - user must ASK for properties NOW
  if (!wantsToSeeProperties) {
    // Don't show any properties for greetings, questions, or gibberish
    // EVEN IF they have saved preferences from before
    return {
      properties: [],
      launches: [],
      total: 0
    };
  }
  
  // User IS asking for properties in this message
  if (!hasPreferences) {
    // No preferences yet - show featured
    properties = await getFeaturedProperties(3);
    launches = await getRecentLaunches(2);
  } else {
    // Has preferences AND asking for properties - perform targeted search
    const propertyLimit = isLaunchQuery ? 3 : 6;
    const launchLimit = isLaunchQuery ? 5 : 3;
    
    properties = await searchProperties(userPreferences, messageText, propertyLimit);
    launches = await searchLaunches(userPreferences, messageText, launchLimit);
    
    // If investment query, prioritize properties with ROI data
    if (isInvestmentQuery && properties.length > 0) {
      properties = properties.sort((a, b) => {
        const aHasROI = a.investment?.expectedROI || 0;
        const bHasROI = b.investment?.expectedROI || 0;
        return bHasROI - aHasROI;
      });
    }
  }
  
  return {
    properties,
    launches,
    total: properties.length + launches.length
  };
}

/**
 * Extract numerical values from text (e.g., "5 million EGP" -> 5000000)
 */
function extractNumber(text) {
  const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(million|m|thousand|k)?/i);
  if (!match) return null;
  
  let number = parseFloat(match[1].replace(/,/g, ''));
  const multiplier = match[2]?.toLowerCase();
  
  if (multiplier === 'million' || multiplier === 'm') {
    number *= 1000000;
  } else if (multiplier === 'thousand' || multiplier === 'k') {
    number *= 1000;
  }
  
  return number;
}

/**
 * Parse budget from message text
 */
function parseBudget(text) {
  const budget = {};
  
  // Look for patterns like "under 5 million", "below 3M", "less than 2M EGP"
  const underMatch = text.match(/(?:under|below|less than|max|maximum)\s+(\d+(?:,\d+)*(?:\.\d+)?)\s*(million|m|thousand|k)?\s*(egp|usd|aed|eur)?/i);
  if (underMatch) {
    budget.max = extractNumber(underMatch[0]);
    budget.currency = underMatch[3]?.toUpperCase() || 'EGP';
  }
  
  // Look for patterns like "over 1 million", "above 500k", "more than 2M"
  const overMatch = text.match(/(?:over|above|more than|min|minimum)\s+(\d+(?:,\d+)*(?:\.\d+)?)\s*(million|m|thousand|k)?\s*(egp|usd|aed|eur)?/i);
  if (overMatch) {
    budget.min = extractNumber(overMatch[0]);
    budget.currency = overMatch[3]?.toUpperCase() || 'EGP';
  }
  
  // Look for range patterns like "2-5 million EGP", "between 1M and 3M"
  const rangeMatch = text.match(/(?:between\s+)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(million|m|thousand|k)?\s*(?:-|to|and)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(million|m|thousand|k)?\s*(egp|usd|aed|eur)?/i);
  if (rangeMatch) {
    const min = extractNumber(rangeMatch[1] + ' ' + (rangeMatch[2] || ''));
    const max = extractNumber(rangeMatch[3] + ' ' + (rangeMatch[4] || ''));
    budget.min = min;
    budget.max = max;
    budget.currency = rangeMatch[5]?.toUpperCase() || 'EGP';
  }
  
  return Object.keys(budget).length > 0 ? budget : null;
}

module.exports = {
  searchProperties,
  searchLaunches,
  smartSearch,
  getFeaturedProperties,
  getRecentLaunches,
  buildSearchCriteria,
  parseBudget,
  extractNumber
};

