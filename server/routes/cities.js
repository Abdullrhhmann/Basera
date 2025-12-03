const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .substring(0, 60) || `city-${Date.now()}`;

const toFloat = (value, fallback = 0) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  return typeof value === 'number' ? value : Number(value);
};

const generateUniqueSlug = async (base, excludeId) => {
  let attempt = 0;
  let currentSlug = base;

  while (true) {
    const existing = await prisma.city.findFirst({
      where: {
        slug: currentSlug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return currentSlug;
    }

    attempt += 1;
    currentSlug = `${base}-${attempt}`;
  }
};

const isUniqueConstraintError = (error) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const withLegacyId = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }
  if (entity._id) {
    return entity;
  }
  return { ...entity, _id: entity.id };
};

const serializeGovernorate = (gov) => withLegacyId(gov);

const serializeCity = (city) => {
  if (!city) return city;
  const formatted = withLegacyId(city);
  if (formatted.governorate) {
    formatted.governorate = serializeGovernorate(formatted.governorate);
  }
  return formatted;
};

const serializeSimpleCollection = (items = []) => items.map((item) => withLegacyId(item));

// @route   GET /api/cities
// @desc    Get all cities
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['name', 'annualAppreciationRate', 'propertiesCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build query
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const orderBy = { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' };

    const [citiesRaw, total] = await Promise.all([
      prisma.city.findMany({
        where,
        include: { governorate: { select: { id: true, name: true, slug: true } } },
        orderBy,
        skip,
        take: limitNumber,
      }),
      prisma.city.count({ where }),
    ]);

    const cityIds = citiesRaw.map((city) => city.id);
    const propertyCounts = cityIds.length
      ? await prisma.property.groupBy({
          by: ['cityId'],
          where: {
            cityId: { in: cityIds },
            isActive: true,
            approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
          },
          _count: { _all: true },
        })
      : [];

    const countMap = propertyCounts.reduce((acc, item) => {
      acc[item.cityId] = item._count._all;
      return acc;
    }, {});

    const citiesWithCount = citiesRaw.map((city) => ({
      ...serializeCity(city),
      propertiesCount: countMap[city.id] || 0,
    }));

    res.json({
      cities: citiesWithCount,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalCities: total,
        hasNext: skip + limitNumber < total,
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ message: 'Server error while fetching cities' });
  }
});

// @route   GET /api/cities/by-governorate/:governorateId
// @desc    Get all cities for a specific governorate
// @access  Public
router.get('/by-governorate/:governorateId', [
  param('governorateId').isString().notEmpty().withMessage('Governorate ID must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { governorateId } = req.params;

    // Verify governorate exists
    const governorate = await prisma.governorate.findUnique({ where: { id: governorateId } });
    if (!governorate) {
      return res.status(404).json({ message: 'Governorate not found' });
    }

    const cities = await prisma.city.findMany({
      where: { governorateId },
      orderBy: { name: 'asc' },
    });

    res.json({
      cities: cities.map(serializeCity),
      governorate: serializeGovernorate(governorate)
    });
  } catch (error) {
    console.error('Get cities by governorate error:', error);
    res.status(500).json({ message: 'Server error while fetching cities' });
  }
});

// @route   GET /api/cities/:slug
// @desc    Get single city by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const city = await prisma.city.findUnique({
      where: { slug },
      include: { governorate: { select: { id: true, name: true, slug: true } } },
    });

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    console.log(`Fetching properties for city: ${city.name}`);

    const properties = await prisma.property.findMany({
      where: { cityId: city.id, isActive: true },
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        status: true,
        location: true,
        images: true,
        isFeatured: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log(`Found ${properties.length} properties for city ${city.name}`);

    const areas = await prisma.area.findMany({
      where: { cityId: city.id },
      select: { id: true, name: true, slug: true, annualAppreciationRate: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      city: {
        ...serializeCity(city),
        propertiesCount: properties.length,
        areasCount: areas.length,
        areas: serializeSimpleCollection(areas),
        properties: serializeSimpleCollection(properties)
      }
    });
  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({ message: 'Server error while fetching city' });
  }
});

// @route   POST /api/cities
// @desc    Create new city
// @access  Private (Admin only)
router.post('/', authMiddleware, adminMiddleware, [
  body('name').trim().notEmpty().withMessage('City name is required')
    .isLength({ max: 100 }).withMessage('City name cannot exceed 100 characters'),
  body('governorate').optional().isString().withMessage('Governorate must be a valid ID'),
  body('annualAppreciationRate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Annual appreciation rate must be between 0 and 100'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, governorate, annualAppreciationRate, description } = req.body;

    // If governorate is provided, verify it exists
    if (governorate) {
      const governorateExists = await prisma.governorate.findUnique({ where: { id: governorate } });
      if (!governorateExists) {
        return res.status(404).json({ message: 'Governorate not found' });
      }
    }

    const normalizedName = name.trim();

    const existingCity = await prisma.city.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });

    if (existingCity) {
      return res.status(400).json({ message: 'A city with this name already exists' });
    }

    const baseSlug = slugify(normalizedName);
    const slug = await generateUniqueSlug(baseSlug);

    const city = await prisma.city.create({
      data: {
        name: normalizedName,
        slug,
        governorateId: governorate || null,
        annualAppreciationRate: toFloat(annualAppreciationRate),
        description: description?.trim() || null,
      },
      include: { governorate: { select: { id: true, name: true, slug: true } } },
    });

    res.status(201).json({
      message: 'City created successfully',
      city: serializeCity(city),
    });
  } catch (error) {
    console.error('Create city error:', error);
    if (isUniqueConstraintError(error)) {
      return res.status(400).json({ message: 'A city with this name or slug already exists' });
    }
    res.status(500).json({ message: 'Server error while creating city' });
  }
});

// @route   PUT /api/cities/:id
// @desc    Update city
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, [
  body('name').optional().trim().notEmpty().withMessage('City name cannot be empty')
    .isLength({ max: 100 }).withMessage('City name cannot exceed 100 characters'),
  body('governorate').optional().isString().withMessage('Governorate must be a valid ID'),
  body('annualAppreciationRate').optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Annual appreciation rate must be between 0 and 100'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const city = await prisma.city.findUnique({ where: { id: req.params.id }, include: { governorate: true } });

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    const { name, governorate, annualAppreciationRate, description } = req.body;

    if (governorate !== undefined) {
      if (governorate) {
        const governorateExists = await prisma.governorate.findUnique({ where: { id: governorate } });
        if (!governorateExists) {
          return res.status(404).json({ message: 'Governorate not found' });
        }
      }
    }

    let updatedName = city.name;
    let updatedSlug = city.slug;

    if (name && name.toLowerCase() !== city.name.toLowerCase()) {
      const existingCity = await prisma.city.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id: req.params.id },
        },
      });

      if (existingCity) {
        return res.status(400).json({ message: 'A city with this name already exists' });
      }

      updatedName = name.trim();
      updatedSlug = await generateUniqueSlug(slugify(updatedName), city.id);
    }

    const updatedCity = await prisma.city.update({
      where: { id: req.params.id },
      data: {
        name: updatedName,
        slug: updatedSlug,
        governorateId: governorate !== undefined ? governorate || null : city.governorateId,
        annualAppreciationRate: toFloat(annualAppreciationRate, city.annualAppreciationRate),
        description: description === undefined ? city.description : description?.trim() || null,
      },
      include: { governorate: { select: { id: true, name: true, slug: true } } },
    });

    res.json({
      message: 'City updated successfully',
      city: serializeCity(updatedCity),
    });
  } catch (error) {
    console.error('Update city error:', error);
    if (isUniqueConstraintError(error)) {
      return res.status(400).json({ message: 'A city with this name or slug already exists' });
    }
    res.status(500).json({ message: 'Server error while updating city' });
  }
});

// @route   DELETE /api/cities/:id
// @desc    Delete city
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const city = await prisma.city.findUnique({ where: { id: req.params.id } });

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    const areasCount = await prisma.area.count({ where: { cityId: req.params.id } });
    if (areasCount > 0) {
      return res.status(400).json({
        message: `Cannot delete city. ${areasCount} ${areasCount === 1 ? 'area is' : 'areas are'} associated with this city. Please reassign or delete those areas first.`,
        areasCount
      });
    }

    const propertiesCount = await prisma.property.count({
      where: { cityId: req.params.id },
    });

    if (propertiesCount > 0) {
      return res.status(400).json({
        message: `Cannot delete city. ${propertiesCount} ${propertiesCount === 1 ? 'property is' : 'properties are'} associated with this city.`,
        propertiesCount
      });
    }

    await prisma.city.delete({ where: { id: req.params.id } });

    res.json({ message: 'City deleted successfully' });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ message: 'Server error while deleting city' });
  }
});

module.exports = router;

