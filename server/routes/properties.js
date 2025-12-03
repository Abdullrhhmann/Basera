const express = require('express');
const { body, validationResult, query } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const {
  normalizePagination,
  buildPropertyOrderBy,
  buildPropertyListWhere,
  getPropertyListSelect,
  getPropertyDetailSelect,
  serializeProperty,
  STATUS_MAP,
  TYPE_MAP,
  STATUS_REVERSE_MAP,
  TYPE_REVERSE_MAP,
  APPROVAL_STATUS_MAP,
  DEVELOPER_STATUS_MAP,
  toDecimal,
  ensureArray,
} = require('../utils/prisma/propertyQueries');
const { authMiddleware, adminMiddleware, optionalAuth, hierarchyMiddleware, permissionMiddleware } = require('../middleware/auth');
const { PERMISSIONS, hasPermission, getUserHierarchy } = require('../utils/permissions');

// Simple in-memory cache for better performance
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const DETAIL_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const STATS_CACHE_TTL = 60 * 1000; // 1 minute

const propertyDetailCache = new Map();
let propertyStatsCache = { data: null, timestamp: 0 };

const router = express.Router();

const allowPropertyCreation = (req, res, next) => {
  if (hasPermission(req.user, PERMISSIONS.CREATE_PROPERTIES)) {
    req.isUserGeneratedProperty = false;
    return next();
  }

  if (req.user?.role === 'user') {
    req.isUserGeneratedProperty = true;
    return next();
  }

  return res.status(403).json({ message: 'Access denied. You cannot submit properties.' });
};

const deleteCloudinaryImages = async (images = []) => {
  const targets = images.filter((img) => img?.publicId);
  if (!targets.length) {
    return;
  }

  await Promise.all(
    targets.map(async (image) => {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch (error) {
        console.error('Cloudinary delete error:', error?.message || error);
      }
    })
  );
};

const isCacheEntryValid = (entry, ttl) => {
  return entry && (Date.now() - entry.timestamp) < ttl;
};

const setPropertyDetailCache = (key, payload) => {
  propertyDetailCache.set(String(key), {
    data: payload,
    timestamp: Date.now()
  });
};

const clearPropertyCaches = (propertyId, { clearList = true } = {}) => {
  if (propertyId) {
    const idStr = String(propertyId);
    propertyDetailCache.delete(idStr);
    propertyDetailCache.delete(`${idStr}:admin`);
    propertyDetailCache.delete(`${idStr}:public`);
  }
  propertyStatsCache = { data: null, timestamp: 0 };
  if (clearList) {
    cache.clear();
  }
};

const clearAllPropertyCaches = () => {
  cache.clear();
  propertyDetailCache.clear();
  propertyStatsCache = { data: null, timestamp: 0 };
};

const trackPropertyView = async ({ propertyId, user }) => {
  try {
    await prisma.property.update({
      where: { id: propertyId },
      data: { views: { increment: 1 } }
    });

    if (user?.id) {
      const now = new Date();
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { activityStats: true }
      });

      const activityStats = userRecord?.activityStats || {};
      const nextStats = {
        ...activityStats,
        propertiesViewed: (activityStats?.propertiesViewed || 0) + 1,
        lastPropertyView: now.toISOString()
      };

      await prisma.user.update({
        where: { id: user.id },
        data: { activityStats: nextStats }
      });

      await prisma.propertyView.upsert({
        where: {
          userId_propertyId: {
            userId: user.id,
            propertyId
          }
        },
        update: {
          viewCount: { increment: 1 },
          lastViewedAt: now
        },
        create: {
          userId: user.id,
          propertyId,
          viewCount: 1,
          lastViewedAt: now
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error incrementing views or tracking user activity:', error);
    return false;
  }
};
const parseBooleanFlag = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return Boolean(value);
};

const normalizeImagesPayload = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  const cleaned = images
    .filter((img) => img && (img.url || img.secure_url))
    .map((img, idx) => {
      const url = img.url || img.secure_url;
      const publicId = img.publicId || img.public_id;
      const caption = img.caption;
      const order = typeof img.order === 'number' ? img.order : idx;

      return {
        url,
        ...(publicId ? { publicId } : {}),
        ...(caption ? { caption } : {}),
        isHero: parseBooleanFlag(img.isHero),
        order,
      };
    });

  let heroAssigned = false;

  const normalized = cleaned.map((img, index) => {
    const isHero = img.isHero && !heroAssigned;
    if (isHero) {
      heroAssigned = true;
    }

    return {
      ...img,
      isHero,
      order: index,
    };
  });

  if (!heroAssigned && normalized.length > 0) {
    normalized[0].isHero = true;
  }

  return normalized;
};

const VALID_CURRENCIES = new Set(['EGP', 'AED', 'USD', 'EUR']);

const isValidIdFormat = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{8,}$/.test(trimmed);
};

const validateIdField = (fieldLabel) => (value) => {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (!isValidIdFormat(value)) {
    throw new Error(`${fieldLabel} must be a valid ID`);
  }
  return true;
};

const normalizeCurrencyCode = (value) => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  const code = value.trim().toUpperCase();
  return VALID_CURRENCIES.has(code) ? code : undefined;
};

const assignIfDefined = (target, key, value) => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const mapEnumValue = (map, value) => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  return map[value.toLowerCase()];
};

const buildPropertyWriteData = ({ payload, useNewLocationStructure }) => {
  const data = {};

  assignIfDefined(data, 'title', payload.title);
  assignIfDefined(data, 'description', payload.description);

  const typeEnum = mapEnumValue(TYPE_MAP, payload.type);
  assignIfDefined(data, 'type', typeEnum);

  const statusEnum = mapEnumValue(STATUS_MAP, payload.status);
  assignIfDefined(data, 'status', statusEnum);

  if (payload.developerStatus !== undefined) {
    const developerStatusEnum = mapEnumValue(DEVELOPER_STATUS_MAP, payload.developerStatus);
    data.developerStatus = developerStatusEnum || null;
  }

  assignIfDefined(data, 'developerId', payload.developer);
  assignIfDefined(data, 'compoundId', payload.compound);

  if (payload.isCompound !== undefined) {
    data.isCompound = parseBooleanFlag(payload.isCompound);
  }

  if (payload.price !== undefined) {
    const decimalPrice = toDecimal(payload.price);
    assignIfDefined(data, 'price', decimalPrice);
  }

  if (payload.currency !== undefined) {
    data.currency = normalizeCurrencyCode(payload.currency) || 'EGP';
  }

  assignIfDefined(data, 'location', payload.location);
  assignIfDefined(data, 'governorateId', payload.governorate_ref);
  assignIfDefined(data, 'cityId', payload.city_ref);
  assignIfDefined(data, 'areaId', payload.area_ref);

  if (useNewLocationStructure !== undefined) {
    data.useNewLocationStructure = useNewLocationStructure;
  }

  assignIfDefined(data, 'specifications', payload.specifications);
  if (payload.features !== undefined) {
    data.features = Array.isArray(payload.features) ? payload.features : [];
  }
  assignIfDefined(data, 'images', payload.images);
  assignIfDefined(data, 'video', payload.video);
  assignIfDefined(data, 'virtualTour', payload.virtualTour);
  assignIfDefined(data, 'floorPlan', payload.floorPlan);
  assignIfDefined(data, 'masterPlan', payload.masterPlan);
  if (payload.amenities !== undefined) {
    data.amenities = Array.isArray(payload.amenities) ? payload.amenities : [];
  }
  assignIfDefined(data, 'nearbyFacilities', payload.nearbyFacilities);
  assignIfDefined(data, 'investment', payload.investment);
  assignIfDefined(data, 'documents', payload.documents);

  if (payload.isFeatured !== undefined) {
    data.isFeatured = parseBooleanFlag(payload.isFeatured);
  }
  if (payload.isActive !== undefined) {
    data.isActive = parseBooleanFlag(payload.isActive);
  }

  return data;
};

// Health check endpoint 
router.get('/health', (req , res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Properties API is running'
  });
});

// cache invalidation endpoint
router.post('/cache/clear', (req, res) => {
  try {
    clearAllPropertyCaches();
    res.json({ 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ message: 'Failed to clear cache' });
  }
});

// Debug endpoint to test property retrieval
router.get('/debug/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        message: 'Invalid property ID format',
        providedId: id
      });
    }

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isActive: true,
        createdById: true,
        approvalStatus: true,
        _count: {
          select: { inquiries: true }
        }
      }
    });
    
    if (!property) {
      return res.status(404).json({ 
        message: 'Property not found',
        id: id
      });
    }

    res.json({ 
      message: 'Property found successfully',
      property: {
        id: property.id,
        title: property.title,
        isActive: property.isActive,
        createdBy: property.createdById,
        approvalStatus: property.approvalStatus?.toLowerCase?.() || property.approvalStatus,
        inquiriesCount: property._count?.inquiries || 0
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      message: 'Debug endpoint error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @route   GET /api/properties
// @desc    Get all properties with filtering and pagination
// @access  Public (with optional auth for admin features)
router.get('/', optionalAuth, [
  query('page').optional().custom((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0)).withMessage('Page must be a positive integer'),
  query('limit').optional().custom((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 1000)).withMessage('Limit must be between 1 and 1000'),
  query('type').optional().custom((value) => !value || ['villa', 'twin-villa', 'duplex', 'apartment', 'land', 'commercial'].includes(value)),
  query('status').optional().custom((value) => !value || ['for-sale', 'for-rent', 'sold', 'rented'].includes(value)),
  query('minPrice').optional().custom((value) => !value || (Number(value) >= 0)).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().custom((value) => !value || (Number(value) >= 0)).withMessage('Max price must be a positive number'),
  query('city').optional(),
  query('governorate').optional(),
  query('city_ref').optional(),
  query('area_ref').optional(),
  query('developer').optional(),
  query('compound').optional(),
  query('featured').optional().custom((value) => !value || ['true', 'false'].includes(value)).withMessage('Featured must be true or false'),
  query('sortBy').optional(),
  query('sortOrder').optional().custom((value) => !value || ['asc', 'desc'].includes(value)).withMessage('Sort order must be asc or desc'),
  query('search').optional(),
  query('furnished').optional().custom((value) => !value || ['unfurnished', 'semi-furnished', 'furnished'].includes(value)).withMessage('Furnished value is invalid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userRole = req.user?.role || 'public';
    const cacheKey = JSON.stringify({ ...req.query, userRole });
    const cached = cache.get(cacheKey);
    const isCacheBusting = typeof req.query._t !== 'undefined';

    if (cached && isCacheEntryValid(cached, CACHE_TTL) && !isCacheBusting) {
      return res.json(cached.data);
    }

    const isAdminUser = req.user && ['admin', 'sales_manager', 'sales_team_leader', 'sales_agent'].includes(req.user.role);
    const { pageNumber, limitNumber, skip } = normalizePagination(req.query, isAdminUser);
    const { where, searchTerm } = buildPropertyListWhere({ query: req.query, isAdminUser });
    const orderBy = buildPropertyOrderBy(req.query.sortBy, req.query.sortOrder);

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select: getPropertyListSelect(),
        orderBy,
        skip,
        take: limitNumber
      }),
      (!isAdminUser && req.query.archived !== 'true')
        ? prisma.property.count({ where: { isActive: true } })
        : prisma.property.count({ where })
    ]);

    const optimizedProperties = properties.map((property) =>
      serializeProperty(property, { optimizeImageUrls: true })
    );

    const responseData = {
      properties: optimizedProperties,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.max(1, Math.ceil(total / limitNumber)),
        totalProperties: total,
        hasNext: skip + limitNumber < total,
        hasPrev: pageNumber > 1
      }
    };

    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    if (searchTerm && searchTerm.length >= 2) {
      const hasOtherFilters = req.query.type || req.query.status || req.query.minPrice || req.query.maxPrice || req.query.city || req.query.featured;

      if (hasOtherFilters || searchTerm.length >= 3) {
        prisma.search.create({
          data: {
            query: searchTerm.toLowerCase(),
            userId: req.user?.id || null,
            ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || '',
            resultsCount: optimizedProperties.length,
            filters: {
              type: req.query.type || '',
              status: req.query.status || '',
              city: req.query.city || '',
              minPrice: req.query.minPrice ? Number(req.query.minPrice) : null,
              maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : null
            }
          }
        }).catch((saveError) => {
          console.error('Error saving search record:', saveError);
        });
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error while fetching properties' });
  }
});

// @route   GET /api/properties/pending
// @desc    Get all pending properties (Team Leader+ only)
// @access  Private (Sales Team Leader+)
router.get('/pending', authMiddleware, hierarchyMiddleware(3), async (req, res) => {
  try {
    const pageNumber = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNumber = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (pageNumber - 1) * limitNumber;

    const pendingSelect = {
      ...getPropertyListSelect(),
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where: { approvalStatus: Prisma.PropertyApprovalStatus.PENDING },
        select: pendingSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber
      }),
      prisma.property.count({ where: { approvalStatus: Prisma.PropertyApprovalStatus.PENDING } })
    ]);

    res.json({
      properties: properties.map((property) => serializeProperty(property)),
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.max(1, Math.ceil(total / limitNumber)),
        totalProperties: total
      }
    });
  } catch (error) {
    console.error('Get pending properties error:', error);
    res.status(500).json({ message: 'Server error while fetching pending properties' });
  }
});

// @route   GET /api/properties/sold-archive
// @desc    Get all sold/rented properties (Admin only)
// @access  Private (Admin only)
router.get('/sold-archive', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pageNumber = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNumber = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const skip = (pageNumber - 1) * limitNumber;

    const { where } = buildPropertyListWhere({
      query: { ...req.query, archived: 'false' },
      isAdminUser: true
    });

    where.status = { in: [Prisma.PropertyStatus.SOLD, Prisma.PropertyStatus.RENTED] };
    where.isActive = true;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select: getPropertyListSelect(),
        orderBy: [
          { soldDate: 'desc' },
          { rentedDate: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip,
        take: limitNumber
      }),
      prisma.property.count({ where })
    ]);

    res.json({
      properties: properties.map((property) => serializeProperty(property)),
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.max(1, Math.ceil(total / limitNumber)),
        totalProperties: total,
        hasNext: skip + limitNumber < total,
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('Get sold archive error:', error);
    res.status(500).json({ message: 'Server error while fetching sold properties' });
  }
});

// @route   GET /api/properties/my-submissions
// @desc    Get properties submitted by the logged-in user
// @access  Private (Authenticated users only)
router.get('/my-submissions', authMiddleware, [
  query('page').optional().custom((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0)).withMessage('Page must be a positive integer'),
  query('limit').optional().custom((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 100)).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const pageNumber = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNumber = Math.min(parseInt(req.query.limit, 10) || 12, 100);
    const skip = (pageNumber - 1) * limitNumber;

    const where = { submittedById: req.user.id };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select: getPropertyListSelect(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber
      }),
      prisma.property.count({ where })
    ]);

    res.json({
      properties: properties.map((property) => serializeProperty(property)),
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.max(1, Math.ceil(total / limitNumber)),
        totalProperties: total,
        hasNext: skip + limitNumber < total,
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({ message: 'Server error while fetching your submissions' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get single property by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ message: 'Invalid property ID format' });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const shouldBypassCache = typeof req.query._t !== 'undefined';
    const detailCacheKey = `${id}:${isAdmin ? 'admin' : 'public'}`;

    if (!shouldBypassCache) {
      const cachedDetail = propertyDetailCache.get(detailCacheKey);
      if (isCacheEntryValid(cachedDetail, DETAIL_CACHE_TTL)) {
        const cachedProperty = cachedDetail.data?.property;
        let cachedPayload = cachedDetail.data;

        if (!isAdmin && cachedProperty) {
          const tracked = await trackPropertyView({ propertyId: cachedProperty._id, user: req.user });
          if (tracked) {
            cachedPayload = {
              property: {
                ...cachedProperty,
                views: (cachedProperty.views || 0) + 1,
              },
            };
            setPropertyDetailCache(detailCacheKey, cachedPayload);
          }
        }

        return res.json(cachedPayload);
      }
    }

    const propertyRecord = await prisma.property.findUnique({
      where: { id },
      select: getPropertyDetailSelect(),
    });

    if (!propertyRecord) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (!propertyRecord.isActive) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const serialized = serializeProperty(propertyRecord);

    if (!isAdmin && (serialized.status === 'sold' || serialized.status === 'rented')) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (!isAdmin) {
      const viewTracked = await trackPropertyView({ propertyId: propertyRecord.id, user: req.user });
      if (viewTracked) {
        serialized.views = (serialized.views || 0) + 1;
      }
    }

    const responsePayload = { property: serialized };

    if (!shouldBypassCache) {
      setPropertyDetailCache(detailCacheKey, responsePayload);
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error while fetching property' });
  }
});

// @route   POST /api/properties
// @desc    Create new property
// @access  Private (Admin only)
router.post('/', authMiddleware, allowPropertyCreation, [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters'),
  body('type').isIn(['villa', 'twin-villa', 'duplex', 'apartment', 'land', 'commercial']).withMessage('Invalid property type'),
  body('status').isIn(['for-sale', 'for-rent', 'sold', 'rented']).withMessage('Invalid property status'),
  body('developerStatus').optional().isIn(['off-plan', 'on-plan', 'secondary', 'rental']).withMessage('Invalid developer status'),
  body('developer').optional({ checkFalsy: true }).custom(validateIdField('Developer')),
  body('price').custom((value) => {
    // Handle both numbers and strings for large numbers
    const numValue = typeof value === 'string' ? Number(value) : value;
    if (value === null || value === undefined || value === '') {
      throw new Error('Price is required');
    }
    if (isNaN(numValue) || numValue < 0) {
      throw new Error('Price must be a positive number');
    }
    // JavaScript safe integer limit: 9,007,199,254,740,991
    // Set max to 999 billion EGP for reasonable property prices
    if (numValue > 999000000000) {
      throw new Error('Price exceeds maximum allowed value (999 billion EGP)');
    }
    return true;
  }).withMessage('Price must be a valid positive number'),
  body('currency').optional().isIn(['EGP', 'AED', 'USD', 'EUR']).withMessage('Invalid currency'),
  body('location.address').optional().notEmpty().withMessage('Address is required'),
  body('location.city').optional().isString().withMessage('City must be a string'),
  body('location.state').optional().isString().withMessage('State must be a string'),
  body('location.country').optional().isString().withMessage('Country must be a string'),
  body('governorate_ref').optional({ checkFalsy: true }).custom(validateIdField('Governorate')),
  body('city_ref').optional({ checkFalsy: true }).custom(validateIdField('City')),
  body('area_ref').optional({ checkFalsy: true }).custom(validateIdField('Area')),
  body('specifications.area').isFloat({ min: 0 }).withMessage('Area must be a positive number'),
  body('specifications.areaUnit').optional().isIn(['sqm']).withMessage('Invalid area unit'),
  body('specifications.bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('specifications.bathrooms').optional().isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
  body('specifications.floors').optional().isInt({ min: 1 }).withMessage('Floors must be at least 1'),
  body('specifications.parking').optional().isInt({ min: 0 }).withMessage('Parking spaces must be a non-negative integer'),
  body('specifications.furnished').optional().isIn(['furnished', 'semi-furnished', 'unfurnished']).withMessage('Invalid furnished status'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('nearbyFacilities').optional().isArray().withMessage('Nearby facilities must be an array'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('compound').optional({ checkFalsy: true }).custom(validateIdField('Compound')),
  body('isCompound').optional().isBoolean().withMessage('isCompound must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean')
], async (req, res) => {
  try {
    console.log('POST /api/properties - User:', req.user?.email, 'Role:', req.user?.role);
    console.log('POST /api/properties - Payload:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Property validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const sanitizedBody = { ...req.body };

    if (sanitizedBody.specifications) {
      sanitizedBody.specifications = {
        ...sanitizedBody.specifications,
        floors:
          sanitizedBody.specifications.floors !== undefined && sanitizedBody.specifications.floors !== null && sanitizedBody.specifications.floors !== ''
            ? parseInt(sanitizedBody.specifications.floors, 10)
            : 1,
        parking:
          sanitizedBody.specifications.parking !== undefined && sanitizedBody.specifications.parking !== null && sanitizedBody.specifications.parking !== ''
            ? parseInt(sanitizedBody.specifications.parking, 10)
            : 0,
        bedrooms:
          sanitizedBody.specifications.bedrooms !== undefined && sanitizedBody.specifications.bedrooms !== null && sanitizedBody.specifications.bedrooms !== ''
            ? parseInt(sanitizedBody.specifications.bedrooms, 10)
            : 0,
        bathrooms:
          sanitizedBody.specifications.bathrooms !== undefined && sanitizedBody.specifications.bathrooms !== null && sanitizedBody.specifications.bathrooms !== ''
            ? parseInt(sanitizedBody.specifications.bathrooms, 10)
            : 0,
        area:
          sanitizedBody.specifications.area !== undefined && sanitizedBody.specifications.area !== null && sanitizedBody.specifications.area !== ''
            ? parseFloat(sanitizedBody.specifications.area)
            : sanitizedBody.specifications.area,
      };
    }

    if (sanitizedBody.images !== undefined) {
      sanitizedBody.images = normalizeImagesPayload(sanitizedBody.images);
    }

    if (sanitizedBody.nearbyFacilities !== undefined) {
      if (typeof sanitizedBody.nearbyFacilities === 'string') {
        try {
          sanitizedBody.nearbyFacilities = JSON.parse(sanitizedBody.nearbyFacilities);
        } catch (error) {
          console.error('Error parsing nearbyFacilities:', error);
          sanitizedBody.nearbyFacilities = [];
        }
      }

      if (Array.isArray(sanitizedBody.nearbyFacilities)) {
        sanitizedBody.nearbyFacilities = sanitizedBody.nearbyFacilities
          .map((facility) => {
            if (typeof facility === 'object' && facility !== null) {
              return {
                name: facility.name || '',
                type: facility.type || 'other',
                distance: typeof facility.distance === 'number' ? facility.distance : 0,
              };
            }
            return null;
          })
          .filter(Boolean);
      } else {
        sanitizedBody.nearbyFacilities = [];
      }
    }

    if (sanitizedBody.isCompound !== undefined) {
      sanitizedBody.isCompound = parseBooleanFlag(sanitizedBody.isCompound);
    }

    if (sanitizedBody.compound !== undefined) {
      const rawCompound = typeof sanitizedBody.compound === 'string' ? sanitizedBody.compound.trim() : sanitizedBody.compound;
      if (!rawCompound || rawCompound === 'null' || rawCompound === 'undefined') {
        sanitizedBody.compound = undefined;
        if (sanitizedBody.isCompound === undefined) {
          sanitizedBody.isCompound = false;
        }
      } else {
        sanitizedBody.compound = rawCompound;
      }
    }

    const cleanSanitizedBody = sanitizedBody;

    if (cleanSanitizedBody.compound) {
      const compoundExists = await prisma.compound.findUnique({
        where: { id: cleanSanitizedBody.compound },
        select: { id: true },
      });
      if (!compoundExists) {
        return res.status(400).json({ message: 'Selected compound could not be found' });
      }
    }

    if (cleanSanitizedBody.isCompound && !cleanSanitizedBody.compound) {
      return res.status(400).json({
        message: 'Compound selection is required when marking a property as a compound',
      });
    }

    const userHierarchy = getUserHierarchy(req.user);
    let canAutoApprove = false;
    if (req.user.role === 'admin' || userHierarchy === 1) {
      canAutoApprove = true;
    } else if (userHierarchy <= 3) {
      canAutoApprove = req.user.permissions?.canApproveProperties === true;
    }

    const approvalStatus = canAutoApprove ? Prisma.PropertyApprovalStatus.APPROVED : Prisma.PropertyApprovalStatus.PENDING;

    const useNewLocationStructure = Boolean(
      cleanSanitizedBody.governorate_ref || cleanSanitizedBody.city_ref || cleanSanitizedBody.area_ref
    );

    if (useNewLocationStructure && cleanSanitizedBody.location) {
      delete cleanSanitizedBody.location.city;
      delete cleanSanitizedBody.location.state;
    }

    const propertyData = buildPropertyWriteData({
      payload: cleanSanitizedBody,
      useNewLocationStructure,
    });

    if (!propertyData.currency) {
      propertyData.currency = 'EGP';
    }

    propertyData.createdById = req.user.id;
    propertyData.submittedById = req.user.id;
    propertyData.approvalStatus = approvalStatus;
    propertyData.approvedById = canAutoApprove ? req.user.id : null;
    propertyData.approvalDate = canAutoApprove ? new Date() : null;
    propertyData.rejectionReason = null;

    const property = await prisma.property.create({
      data: propertyData,
      select: getPropertyDetailSelect(),
    });

    clearPropertyCaches(property.id);
    
    console.log('Property created successfully:', {
      id: property.id,
      title: property.title,
      approvalStatus: property.approvalStatus,
      submittedBy: req.user.email,
    });

    res.status(201).json({
      message: canAutoApprove 
        ? 'Property created and approved successfully' 
        : 'Property submitted successfully. It will be reviewed by our team.',
      property: serializeProperty(property),
      approvalStatus: property.approvalStatus,
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error while creating property' });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private (Admin only)
router.put('/:id', authMiddleware, permissionMiddleware(PERMISSIONS.EDIT_PROPERTIES), [
  body('title').optional().trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').optional().isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters'),
  body('type').optional().isIn(['villa', 'twin-villa', 'duplex', 'apartment', 'land', 'commercial']).withMessage('Invalid property type'),
  body('status').optional().isIn(['for-sale', 'for-rent', 'sold', 'rented']).withMessage('Invalid property status'),
  body('developerStatus').optional().isIn(['off-plan', 'on-plan', 'secondary', 'rental']).withMessage('Invalid developer status'),
  body('developer').optional({ checkFalsy: true }).custom(validateIdField('Developer')),
  body('price').optional().custom((value) => {
    // Handle both numbers and strings for large numbers
    const numValue = typeof value === 'string' ? Number(value) : value;
    if (isNaN(numValue) || numValue < 0) {
      throw new Error('Price must be a positive number');
    }
    // JavaScript safe integer limit: 9,007,199,254,740,991
    // Set max to 999 billion EGP for reasonable property prices
    if (numValue > 999000000000) {
      throw new Error('Price exceeds maximum allowed value (999 billion EGP)');
    }
    return true;
  }).withMessage('Price must be a valid positive number'),
  body('currency').optional().isIn(['EGP', 'AED', 'USD', 'EUR']).withMessage('Invalid currency'),
  body('location.address').optional().notEmpty().withMessage('Address cannot be empty'),
  body('location.city').optional().isString().withMessage('City must be a string'),
  body('location.state').optional().isString().withMessage('State must be a string'),
  body('location.country').optional().isString().withMessage('Country must be a string'),
  body('governorate_ref').optional({ checkFalsy: true }).custom(validateIdField('Governorate')),
  body('city_ref').optional({ checkFalsy: true }).custom(validateIdField('City')),
  body('area_ref').optional({ checkFalsy: true }).custom(validateIdField('Area')),
  body('specifications.area').optional().isFloat({ min: 0 }).withMessage('Area must be a positive number'),
  body('specifications.areaUnit').optional().isIn(['sqm']).withMessage('Invalid area unit'),
  body('specifications.bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('specifications.bathrooms').optional().isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
  body('specifications.floors').optional().isInt({ min: 1 }).withMessage('Floors must be at least 1'),
  body('specifications.parking').optional().isInt({ min: 0 }).withMessage('Parking spaces must be a non-negative integer'),
  body('specifications.furnished').optional().isIn(['furnished', 'semi-furnished', 'unfurnished']).withMessage('Invalid furnished status'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('nearbyFacilities').optional().isArray().withMessage('Nearby facilities must be an array'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('compound').optional({ checkFalsy: true }).custom(validateIdField('Compound')),
  body('isCompound').optional().isBoolean().withMessage('isCompound must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const propertyRecord = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: getPropertyDetailSelect(),
    });

    if (!propertyRecord) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const userHierarchy = getUserHierarchy(req.user);
    const isCreator = propertyRecord.createdById === req.user.id;

    if (!isCreator && userHierarchy >= 4) {
      return res.status(403).json({
        message: 'You can only edit properties you created',
      });
    }

    let canAutoApprove = false;
    if (req.user.role === 'admin' || userHierarchy === 1) {
      canAutoApprove = true;
    } else if (userHierarchy <= 3) {
      canAutoApprove = req.user.permissions?.canApproveProperties === true;
    }

    const sanitizedBody = { ...req.body };

    if (sanitizedBody.specifications) {
      const specs = { ...sanitizedBody.specifications };
      if (specs.floors !== undefined && specs.floors !== null && specs.floors !== '') {
        specs.floors = parseInt(specs.floors, 10);
      } else if (specs.floors === '' || specs.floors === null || specs.floors === undefined) {
        specs.floors = 1;
      }

      if (specs.parking !== undefined && specs.parking !== null && specs.parking !== '') {
        specs.parking = parseInt(specs.parking, 10);
      } else if (specs.parking === '' || specs.parking === null || specs.parking === undefined) {
        specs.parking = 0;
      }

      if (specs.bedrooms !== undefined && specs.bedrooms !== null && specs.bedrooms !== '') {
        specs.bedrooms = parseInt(specs.bedrooms, 10);
      } else if (specs.bedrooms === '' || specs.bedrooms === null || specs.bedrooms === undefined) {
        specs.bedrooms = 0;
      }

      if (specs.bathrooms !== undefined && specs.bathrooms !== null && specs.bathrooms !== '') {
        specs.bathrooms = parseInt(specs.bathrooms, 10);
      } else if (specs.bathrooms === '' || specs.bathrooms === null || specs.bathrooms === undefined) {
        specs.bathrooms = 0;
      }

      if (specs.area !== undefined && specs.area !== null && specs.area !== '') {
        specs.area = parseFloat(specs.area);
      }

      sanitizedBody.specifications = specs;
    }

    if (sanitizedBody.images !== undefined) {
      sanitizedBody.images = normalizeImagesPayload(sanitizedBody.images);
    }

    if (sanitizedBody.nearbyFacilities !== undefined) {
      if (typeof sanitizedBody.nearbyFacilities === 'string') {
        try {
          sanitizedBody.nearbyFacilities = JSON.parse(sanitizedBody.nearbyFacilities);
        } catch (error) {
          console.error('Error parsing nearbyFacilities:', error);
          sanitizedBody.nearbyFacilities = [];
        }
      }

      if (Array.isArray(sanitizedBody.nearbyFacilities)) {
        sanitizedBody.nearbyFacilities = sanitizedBody.nearbyFacilities
          .map((facility) => {
            if (typeof facility === 'object' && facility !== null) {
              return {
                name: facility.name || '',
                type: facility.type || 'other',
                distance: typeof facility.distance === 'number' ? facility.distance : 0,
              };
            }
            return null;
          })
          .filter(Boolean);
      } else {
        sanitizedBody.nearbyFacilities = [];
      }
    }

    if (sanitizedBody.isCompound !== undefined) {
      sanitizedBody.isCompound = parseBooleanFlag(sanitizedBody.isCompound);
    }

    if (sanitizedBody.compound !== undefined) {
      if (sanitizedBody.compound === null) {
        sanitizedBody.compound = null;
      } else {
        const rawCompound = typeof sanitizedBody.compound === 'string' ? sanitizedBody.compound.trim() : sanitizedBody.compound;
        sanitizedBody.compound = rawCompound && rawCompound !== 'null' && rawCompound !== 'undefined' ? rawCompound : null;
      }
    }

    const cleanSanitizedBody = sanitizedBody;

    if (cleanSanitizedBody.compound) {
      const compoundExists = await prisma.compound.findUnique({
        where: { id: cleanSanitizedBody.compound },
        select: { id: true },
      });
      if (!compoundExists) {
        return res.status(400).json({ message: 'Selected compound could not be found' });
      }
    }

    if (cleanSanitizedBody.compound === null) {
      cleanSanitizedBody.compound = undefined;
      if (cleanSanitizedBody.isCompound === undefined) {
        cleanSanitizedBody.isCompound = false;
      }
    }

    const nextCompoundId =
      cleanSanitizedBody.compound !== undefined ? cleanSanitizedBody.compound : propertyRecord.compoundId;
    const nextIsCompound =
      cleanSanitizedBody.isCompound !== undefined ? cleanSanitizedBody.isCompound : propertyRecord.isCompound;

    if (nextIsCompound && !nextCompoundId) {
      return res.status(400).json({
        message: 'Compound selection is required when marking a property as a compound',
      });
    }

    const useNewLocationStructure = Boolean(
      cleanSanitizedBody.governorate_ref || cleanSanitizedBody.city_ref || cleanSanitizedBody.area_ref
    );

    if (useNewLocationStructure && cleanSanitizedBody.location) {
      delete cleanSanitizedBody.location.city;
      delete cleanSanitizedBody.location.state;
    }

    const propertyData = buildPropertyWriteData({
      payload: cleanSanitizedBody,
      useNewLocationStructure: useNewLocationStructure ? true : undefined,
    });

    if (!canAutoApprove) {
      propertyData.approvalStatus = Prisma.PropertyApprovalStatus.PENDING;
      propertyData.submittedById = req.user.id;
      propertyData.approvedById = null;
      propertyData.approvalDate = null;
      propertyData.rejectionReason = null;
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyRecord.id },
      data: propertyData,
      select: getPropertyDetailSelect(),
    });

    clearPropertyCaches(updatedProperty.id);

    res.json({
      message: 'Property updated successfully',
      property: serializeProperty(updatedProperty),
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error while updating property' });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete property
// @access  Private (Sales Team Leader+)
router.delete('/:id', authMiddleware, hierarchyMiddleware(3), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: { id: true, images: true },
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    await deleteCloudinaryImages(property.images || []);
    await prisma.property.delete({ where: { id: property.id } });
    clearPropertyCaches(property.id);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error while deleting property' });
  }
});

// @route   POST /api/properties/:id/archive
// @desc    Archive property
// @access  Private (Admin only)
router.post('/:id/archive', authMiddleware, hierarchyMiddleware(3), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    await prisma.property.update({
      where: { id: property.id },
      data: { isArchived: true, archivedAt: new Date() },
    });
    clearPropertyCaches(property.id);

    res.json({ message: 'Property archived successfully' });
  } catch (error) {
    console.error('Archive property error:', error);
    res.status(500).json({ message: 'Server error while archiving property' });
  }
});

// @route   POST /api/properties/:id/restore
// @desc    Restore property
// @access  Private (Admin only)
router.post('/:id/restore', authMiddleware, hierarchyMiddleware(3), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    await prisma.property.update({
      where: { id: property.id },
      data: { isArchived: false, archivedAt: null },
    });
    clearPropertyCaches(property.id);

    res.json({ message: 'Property restored successfully' });
  } catch (error) {
    console.error('Restore property error:', error);
    res.status(500).json({ message: 'Server error while restoring property' });
  }
});

// @route   POST /api/properties/:id/inquiry
// @desc    Create property inquiry
// @access  Public
router.post('/:id/inquiry', [
  body('contactInfo.name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('contactInfo.email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('contactInfo.phone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('message').isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        isActive: true,
        location: true,
        city: { select: { name: true } },
        governorate: { select: { name: true } },
      },
    });

    if (!property || !property.isActive) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const inquiryData = {
      propertyId: property.id,
      userId: req.user ? req.user.id : null,
      contactInfo: req.body.contactInfo,
      message: req.body.message,
      budget: req.body.budget || null,
      timeline: req.body.timeline || 'flexible',
      source: 'website',
    };

    const inquiry = await prisma.inquiry.create({
      data: inquiryData,
    });

    clearPropertyCaches(property.id, { clearList: false });

    if (req.user?.id) {
      try {
        const userRecord = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { activityStats: true },
        });
        const activityStats = userRecord?.activityStats || {};
        const nextStats = {
          ...activityStats,
          inquiriesSent: (activityStats?.inquiriesSent || 0) + 1,
          lastInquirySent: new Date().toISOString(),
        };
        await prisma.user.update({
          where: { id: req.user.id },
          data: { activityStats: nextStats },
        });
      } catch (activityError) {
        console.error('Error tracking user inquiry activity:', activityError);
      }
    }

    try {
      const inquiryEmail = inquiryData.contactInfo.email.toLowerCase().trim();
      const propertyStatus = STATUS_REVERSE_MAP[property.status] || property.status?.toLowerCase?.() || '';
      const requiredService =
        propertyStatus === 'for-rent' || propertyStatus === 'rented' ? 'rent' : 'buy';

      const locationInfo =
        property.location?.address || property.city?.name || property.governorate?.name || '';

      const noteEntry = {
        note: `Property inquiry: ${property.title} (ID: ${property.id}). ${inquiryData.message || 'No message'}`,
        createdBy: req.user ? req.user.id : null,
        createdAt: new Date().toISOString(),
      };

      const existingLead = await prisma.lead.findFirst({
        where: { email: inquiryEmail },
      });

      if (existingLead) {
        const existingNotes = Array.isArray(existingLead.notes) ? existingLead.notes : [];
        const preferredLocationSet = new Set(existingLead.preferredLocation || []);
        if (locationInfo) {
          preferredLocationSet.add(locationInfo);
        }

        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            notes: [...existingNotes, noteEntry],
            preferredLocation: Array.from(preferredLocationSet),
            lastContactDate: new Date(),
          },
        });
      } else {
        await prisma.lead.create({
          data: {
            name: inquiryData.contactInfo.name,
            email: inquiryEmail,
            phone: inquiryData.contactInfo.phone,
            requiredService,
            propertyType: property.type,
            purpose: 'investment',
            source: 'contact-form',
            budget: inquiryData.budget || {},
            timeline: inquiryData.timeline || 'flexible',
            preferredLocation: locationInfo ? [locationInfo] : [],
            status: 'new',
            priority: 'medium',
            notes: [noteEntry],
          },
        });
      }
    } catch (leadError) {
      console.error('Error creating lead from inquiry:', leadError);
    }

    res.status(201).json({
      message: 'Inquiry submitted successfully',
      inquiry,
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ message: 'Server error while creating inquiry' });
  }
});

// Property image upload is now handled by the dedicated uploads route
// @route   POST /api/uploads/image
// @desc    Upload property image using the optimized upload system
// @access  Private (Admin only)
// Use the /api/uploads/image endpoint instead for better performance and features

// @route   GET /api/properties/stats/overview
// @desc    Get property statistics
// @access  Private (Admin only)
router.get('/stats/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (isCacheEntryValid(propertyStatsCache, STATS_CACHE_TTL)) {
      return res.json(propertyStatsCache.data);
    }

    const [overviewAggregate, typeStatsRaw, statusStatsRaw] = await Promise.all([
      prisma.property.aggregate({
        _count: { _all: true },
        _sum: { views: true },
        _avg: { price: true },
      }),
      prisma.property.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      prisma.property.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const overview = {
      totalProperties: overviewAggregate._count._all || 0,
      totalViews: Number(overviewAggregate._sum.views || 0),
      averagePrice: Number(overviewAggregate._avg.price || 0),
    };

    const byType = typeStatsRaw.map((item) => ({
      _id: item.type,
      count: item._count._all,
    }));

    const byStatus = statusStatsRaw.map((item) => ({
      _id: item.status,
      count: item._count._all,
    }));

    const responseData = { overview, byType, byStatus };

    propertyStatsCache = {
      data: responseData,
      timestamp: Date.now(),
    };

    res.json(responseData);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
});

// @route   PUT /api/properties/:id/approve
// @desc    Approve a pending property
// @access  Private (Sales Team Leader+)
router.put('/:id/approve', authMiddleware, hierarchyMiddleware(3), async (req, res) => {
  try {
    const propertyRecord = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: { id: true, approvalStatus: true },
    });

    if (!propertyRecord) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (propertyRecord.approvalStatus !== Prisma.PropertyApprovalStatus.PENDING) {
      return res.status(400).json({ message: 'Property is not pending approval' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyRecord.id },
      data: {
        approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
        approvedById: req.user.id,
        approvalDate: new Date(),
        rejectionReason: null,
      },
      select: getPropertyDetailSelect(),
    });

    clearPropertyCaches(updatedProperty.id);

    res.json({
      message: 'Property approved successfully',
      property: serializeProperty(updatedProperty),
    });
  } catch (error) {
    console.error('Approve property error:', error);
    res.status(500).json({ message: 'Server error while approving property' });
  }
});

// @route   PUT /api/properties/:id/reject
// @desc    Reject a pending property
// @access  Private (Sales Team Leader+)
router.put('/:id/reject', authMiddleware, hierarchyMiddleware(3), [
  body('reason').optional().isString().withMessage('Rejection reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const propertyRecord = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        approvalStatus: true,
        submittedById: true,
        images: true,
      },
    });

    if (!propertyRecord) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (propertyRecord.approvalStatus !== Prisma.PropertyApprovalStatus.PENDING) {
      return res.status(400).json({ message: 'Property is not pending approval' });
    }

    const { reason = 'No reason provided' } = req.body;

    let deletedImages = false;
    if (propertyRecord.submittedById && Array.isArray(propertyRecord.images) && propertyRecord.images.length) {
      const submitter = await prisma.user.findUnique({
        where: { id: propertyRecord.submittedById },
        select: { role: true },
      });
      if (submitter?.role === 'user') {
        try {
          await deleteCloudinaryImages(propertyRecord.images);
          deletedImages = true;
        } catch (err) {
          console.error('Error deleting property images on rejection:', err);
        }
      }
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyRecord.id },
      data: {
        approvalStatus: Prisma.PropertyApprovalStatus.REJECTED,
        approvedById: req.user.id,
        approvalDate: new Date(),
        rejectionReason: reason,
        ...(deletedImages ? { images: [] } : {}),
      },
      select: getPropertyDetailSelect(),
    });

    clearPropertyCaches(updatedProperty.id);

    res.json({
      message: 'Property rejected successfully',
      deletedImages,
      property: serializeProperty(updatedProperty),
    });
  } catch (error) {
    console.error('Reject property error:', error);
    res.status(500).json({ message: 'Server error while rejecting property' });
  }
});

module.exports = router;
