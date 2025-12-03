const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, hierarchyMiddleware } = require('../middleware/auth');

const router = express.Router();

const allowedStatuses = ['planning', 'launching', 'active', 'delivered', 'on-hold'];

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return Boolean(value);
};

const normalizeDate = (value) => {
  if (value === null) return null;
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const sanitizeOptionalDate = (value) => normalizeDate(value);

const normalizeGallery = (gallery) => {
  if (!gallery) return [];
  let items = gallery;
  if (typeof gallery === 'string') {
    try {
      items = JSON.parse(gallery);
    } catch (error) {
      console.error('Failed to parse compound gallery payload:', error);
      items = [];
    }
  }
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .filter((item) => item && (item.url || item.secure_url))
    .map((item, index) => ({
      url: item.url || item.secure_url,
      publicId: item.publicId || item.public_id || undefined,
      caption: item.caption || undefined,
      order: typeof item.order === 'number' ? item.order : index,
      isHero: normalizeBoolean(item.isHero) || false,
    }))
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index,
    }));
};

const normalizeStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return normalizeStringArray(parsed);
      }
    } catch (error) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const generateSlug = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const validateReference = async (model, id, message) => {
  if (!id) return;
  const record = await prisma[model].findUnique({ where: { id } });
  if (!record) {
    throw new Error(message);
  }
};

const sanitizeCompoundPayload = async (payload = {}, { isUpdate = false } = {}) => {
  const sanitized = { ...payload };

  if (sanitized.developer === '') sanitized.developer = undefined;
  if (sanitized.governorate_ref === '') sanitized.governorate_ref = undefined;
  if (sanitized.city_ref === '') sanitized.city_ref = undefined;
  if (sanitized.area_ref === '') sanitized.area_ref = undefined;

  sanitized.isFeatured =
    sanitized.isFeatured !== undefined ? normalizeBoolean(sanitized.isFeatured) : undefined;

  sanitized.status =
    sanitized.status && allowedStatuses.includes(sanitized.status) ? sanitized.status : undefined;

  if (sanitized.launchDate !== undefined) {
    sanitized.launchDate = sanitizeOptionalDate(sanitized.launchDate);
  }

  if (sanitized.handoverDate !== undefined) {
    sanitized.handoverDate = sanitizeOptionalDate(sanitized.handoverDate);
  }

  if (sanitized.heroImage && typeof sanitized.heroImage === 'string') {
    try {
      sanitized.heroImage = JSON.parse(sanitized.heroImage);
    } catch (error) {
      console.error('Failed to parse heroImage payload:', error);
      sanitized.heroImage = undefined;
    }
  }

  if (sanitized.heroImage) {
    sanitized.heroImage = {
      url: sanitized.heroImage.url || sanitized.heroImage.secure_url || undefined,
      publicId: sanitized.heroImage.publicId || sanitized.heroImage.public_id || undefined,
      caption: sanitized.heroImage.caption || undefined,
    };
  }

  if (sanitized.gallery !== undefined) {
    sanitized.gallery = normalizeGallery(sanitized.gallery);
  }

  if (sanitized.amenities !== undefined) {
    sanitized.amenities = normalizeStringArray(sanitized.amenities);
  }

  if (sanitized.metadata) {
    if (typeof sanitized.metadata === 'string') {
      try {
        sanitized.metadata = JSON.parse(sanitized.metadata);
      } catch (error) {
        console.error('Failed to parse metadata payload:', error);
        sanitized.metadata = {};
      }
    }

    sanitized.metadata = {
      brochureUrl: sanitized.metadata?.brochureUrl || undefined,
      videoUrl: sanitized.metadata?.videoUrl || undefined,
      tags: normalizeStringArray(sanitized.metadata?.tags),
    };
  }

  if (sanitized.seo) {
    if (typeof sanitized.seo === 'string') {
      try {
        sanitized.seo = JSON.parse(sanitized.seo);
      } catch (error) {
        console.error('Failed to parse seo payload:', error);
        sanitized.seo = {};
      }
    }

    sanitized.seo = {
      title: sanitized.seo?.title || undefined,
      description: sanitized.seo?.description || undefined,
      keywords: normalizeStringArray(sanitized.seo?.keywords),
    };
  }

  if (sanitized.location) {
    if (typeof sanitized.location === 'string') {
      try {
        sanitized.location = JSON.parse(sanitized.location);
      } catch (error) {
        console.error('Failed to parse location payload:', error);
        sanitized.location = {};
      }
    }

    sanitized.location = {
      coordinates: sanitized.location?.coordinates || {},
      mapUrl: sanitized.location?.mapUrl || undefined,
    };

    if (sanitized.location.coordinates) {
      const { latitude, longitude, lat, lng } = sanitized.location.coordinates;
      sanitized.location.coordinates = {
        latitude:
          typeof latitude === 'number'
            ? latitude
            : typeof lat === 'number'
              ? lat
              : undefined,
        longitude:
          typeof longitude === 'number'
            ? longitude
            : typeof lng === 'number'
              ? lng
              : undefined,
      };
    }
  }

  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === '') {
      sanitized[key] = undefined;
    }
  });

  if (sanitized.developer) {
    await validateReference('developer', sanitized.developer, 'Invalid developer reference');
  }
  if (sanitized.governorate_ref) {
    await validateReference('governorate', sanitized.governorate_ref, 'Invalid governorate reference');
  }
  if (sanitized.city_ref) {
    await validateReference('city', sanitized.city_ref, 'Invalid city reference');
  }
  if (sanitized.area_ref) {
    await validateReference('area', sanitized.area_ref, 'Invalid area reference');
  }

  return sanitized;
};

const buildCompoundWhere = async ({
  search,
  developer,
  governorate,
  city,
  area,
  status,
  featured,
}) => {
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { description: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  if (developer) {
    let developerId = null;
    if (developer.length === 24) {
      developerId = developer;
    } else {
      const dev = await prisma.developer.findFirst({ where: { slug: developer } });
      developerId = dev?.id || null;
    }
    where.developerId = developerId || '___no_match___';
  }

  if (governorate) {
    where.governorateId = governorate;
  }

  if (city) {
    where.cityId = city;
  }

  if (area) {
    where.areaId = area;
  }

  if (status) {
    where.status = status;
  }

  if (featured !== undefined) {
    where.isFeatured = normalizeBoolean(featured);
  }

  return where;
};

const compoundInclude = {
  developer: { select: { id: true, name: true, slug: true, logo: true } },
  governorate: { select: { id: true, name: true, slug: true } },
  city: { select: { id: true, name: true, slug: true } },
  area: { select: { id: true, name: true, slug: true } },
  _count: { select: { properties: true } },
};

const mapPayloadToData = (payload, userId) => {
  const {
    developer,
    governorate_ref,
    city_ref,
    area_ref,
    launchDate,
    handoverDate,
    ...rest
  } = payload;

  return {
    ...rest,
    developerId: developer || null,
    governorateId: governorate_ref || null,
    cityId: city_ref || null,
    areaId: area_ref || null,
    launchDate: launchDate === null ? null : launchDate,
    handoverDate: handoverDate === null ? null : handoverDate,
    updatedById: userId || null,
  };
};

const fetchCompoundOr404 = async (identifier) => {
  // First try to find by slug
  let compound = await prisma.compound.findFirst({
    where: { slug: identifier },
    include: compoundInclude,
  });

  // If not found by slug, try to find by ID (supports both MongoDB 24-char IDs and Prisma 25-char CUIDs)
  if (!compound && identifier.length >= 20) {
    compound = await prisma.compound.findUnique({
      where: { id: identifier },
      include: compoundInclude,
    });
  }

  return compound;
};

// @route   GET /api/compounds
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('search').optional().isString(),
    query('developer').optional().isString(),
    query('governorate').optional().isString(),
    query('city').optional().isString(),
    query('area').optional().isString(),
    query('status').optional().isIn(allowedStatuses),
    query('featured')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('Featured filter must be a boolean string'),
    query('sortBy')
      .optional()
      .isIn(['name', 'createdAt', 'launchDate', 'handoverDate'])
      .withMessage('Invalid sort column'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        page = 1,
        limit = 20,
        search = '',
        developer,
        governorate,
        city,
        area,
        status,
        featured,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const skip = (pageNumber - 1) * limitNumber;

      const where = await buildCompoundWhere({
        search,
        developer,
        governorate,
        city,
        area,
        status,
        featured,
      });

      const orderBy = { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' };

      const [compoundsRaw, total] = await Promise.all([
        prisma.compound.findMany({
          where,
          include: compoundInclude,
          orderBy,
          skip,
          take: limitNumber,
        }),
        prisma.compound.count({ where }),
      ]);

      const compounds = compoundsRaw.map((compound) => ({
        ...compound,
        propertiesCount: compound._count.properties,
      }));

      res.json({
        compounds,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          totalCompounds: total,
          hasNext: skip + limitNumber < total,
          hasPrev: pageNumber > 1,
        },
      });
    } catch (error) {
      console.error('Error fetching compounds list:', error);
      res.status(500).json({ message: 'Server error while fetching compounds' });
    }
  }
);

// @route   GET /api/compounds/:slug
router.get(
  '/:slug',
  [param('slug').trim().notEmpty().withMessage('Compound slug is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { slug } = req.params;
      const compound = await fetchCompoundOr404(slug);

      if (!compound) {
        return res.status(404).json({ message: 'Compound not found' });
      }

      const relatedProperties = await prisma.property.findMany({
        where: {
          compoundId: compound.id,
          isArchived: false,
          approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
        },
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          price: true,
          currency: true,
          isFeatured: true,
          isCompound: true,
          images: true,
          developerStatus: true,
          createdAt: true,
          developer: { select: { id: true, name: true, slug: true, logo: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      });

      // Serialize related properties to add _id for frontend compatibility
      const serializedRelatedProperties = relatedProperties.map(prop => ({
        ...prop,
        _id: prop.id, // Add _id for backward compatibility
      }));

      res.json({
        compound: {
          ...compound,
          propertiesCount: compound._count.properties,
          relatedProperties: serializedRelatedProperties,
        },
      });
    } catch (error) {
      console.error('Error fetching compound detail:', error);
      res.status(500).json({ message: 'Server error while fetching compound' });
    }
  }
);

// @route   POST /api/compounds
router.post(
  '/',
  authMiddleware,
  hierarchyMiddleware(2),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Compound name is required')
      .isLength({ max: 150 })
      .withMessage('Compound name cannot exceed 150 characters'),
    body('description')
      .optional()
      .isLength({ max: 5001 })
      .withMessage('Description cannot exceed 5001 characters'),
    body('developer').optional().isString().withMessage('Developer must be a valid ID'),
    body('governorate_ref').optional().isString().withMessage('Governorate must be a valid ID'),
    body('city_ref').optional().isString().withMessage('City must be a valid ID'),
    body('area_ref').optional().isString().withMessage('Area must be a valid ID'),
    body('status')
      .optional()
      .isIn(allowedStatuses)
      .withMessage('Status must be one of planning, launching, active, delivered, on-hold'),
    body('launchDate')
      .optional()
      .isISO8601()
      .withMessage('Launch date must be a valid ISO8601 date'),
    body('handoverDate')
      .optional()
      .isISO8601()
      .withMessage('Handover date must be a valid ISO8601 date'),
    body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
    body('gallery').optional().isArray().withMessage('Gallery must be an array'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const payload = await sanitizeCompoundPayload(req.body);
      const slug = generateSlug(payload.name);

      const existing = await prisma.compound.findFirst({
        where: {
          OR: [{ name: { equals: payload.name, mode: 'insensitive' } }, { slug }],
        },
      });
      if (existing) {
        return res.status(400).json({ message: 'A compound with this name already exists' });
      }

      const data = {
        ...mapPayloadToData(payload, req.user?.id),
        slug,
        createdById: req.user?.id || null,
      };

      const compound = await prisma.compound.create({
        data,
        include: compoundInclude,
      });

      res.status(201).json({
        message: 'Compound created successfully',
        compound: {
          ...compound,
          propertiesCount: compound._count.properties,
        },
      });
    } catch (error) {
      console.error('Error creating compound:', error);
      res.status(500).json({ message: 'Server error while creating compound' });
    }
  }
);

// @route   PUT /api/compounds/:id
router.put(
  '/:id',
  authMiddleware,
  hierarchyMiddleware(2),
  [
    param('id').isString().withMessage('Compound ID must be a valid ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Compound name cannot be empty')
      .isLength({ max: 150 })
      .withMessage('Compound name cannot exceed 150 characters'),
    body('description')
      .optional()
      .isLength({ max: 5001 })
      .withMessage('Description cannot exceed 5001 characters'),
    body('developer').optional().isString().withMessage('Developer must be a valid ID'),
    body('governorate_ref').optional().isString().withMessage('Governorate must be a valid ID'),
    body('city_ref').optional().isString().withMessage('City must be a valid ID'),
    body('area_ref').optional().isString().withMessage('Area must be a valid ID'),
    body('status')
      .optional()
      .isIn(allowedStatuses)
      .withMessage('Status must be one of planning, launching, active, delivered, on-hold'),
    body('launchDate')
      .optional({ nullable: true })
      .custom((value) => value === null || new Date(value).toString() !== 'Invalid Date')
      .withMessage('Launch date must be a valid date'),
    body('handoverDate')
      .optional({ nullable: true })
      .custom((value) => value === null || new Date(value).toString() !== 'Invalid Date')
      .withMessage('Handover date must be a valid date'),
    body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
    body('gallery').optional().isArray().withMessage('Gallery must be an array'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const compound = await prisma.compound.findUnique({
        where: { id: req.params.id },
        include: compoundInclude,
      });
      if (!compound) {
        return res.status(404).json({ message: 'Compound not found' });
      }

      const payload = await sanitizeCompoundPayload(req.body, { isUpdate: true });

      if (payload.name && payload.name.toLowerCase() !== compound.name.toLowerCase()) {
        const duplicate = await prisma.compound.findFirst({
          where: {
            name: { equals: payload.name, mode: 'insensitive' },
            NOT: { id: compound.id },
          },
        });
        if (duplicate) {
          return res.status(400).json({ message: 'A compound with this name already exists' });
        }
      }

      const data = mapPayloadToData(payload, req.user?.id);
      if (payload.name) {
        data.slug = generateSlug(payload.name);
        data.name = payload.name;
      }

      const updated = await prisma.compound.update({
        where: { id: req.params.id },
        data,
        include: compoundInclude,
      });

      res.json({
        message: 'Compound updated successfully',
        compound: {
          ...updated,
          propertiesCount: updated._count.properties,
        },
      });
    } catch (error) {
      console.error('Error updating compound:', error);
      res.status(500).json({ message: 'Server error while updating compound' });
    }
  }
);

// @route   DELETE /api/compounds/:id
router.delete(
  '/:id',
  authMiddleware,
  hierarchyMiddleware(2),
  [param('id').isString().withMessage('Compound ID must be a valid ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const compound = await prisma.compound.findUnique({ where: { id: req.params.id } });
      if (!compound) {
        return res.status(404).json({ message: 'Compound not found' });
      }

      const propertiesCount = await prisma.property.count({ where: { compoundId: compound.id } });
      if (propertiesCount > 0) {
        return res.status(400).json({
          message: `Cannot delete compound. ${propertiesCount} ${
            propertiesCount === 1 ? 'property is' : 'properties are'
          } associated with this compound.`,
          propertiesCount,
        });
      }

      await prisma.compound.delete({ where: { id: compound.id } });

      res.json({ message: 'Compound deleted successfully' });
    } catch (error) {
      console.error('Error deleting compound:', error);
      res.status(500).json({ message: 'Server error while deleting compound' });
    }
  }
);

module.exports = router;

