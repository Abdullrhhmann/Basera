const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');
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
    .substring(0, 60) || `governorate-${Date.now()}`;

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
    const existing = await prisma.governorate.findFirst({
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

const serializeGovernorateListItem = (gov) => {
  if (!gov) return gov;
  const { _count, ...rest } = gov;
  return {
    ...withLegacyId(rest),
    citiesCount: _count?.cities ?? 0,
  };
};

const serializeGovernorate = (gov) => withLegacyId(gov);

const withLegacyIdArray = (items = []) => items.map((item) => withLegacyId(item));

// @route   GET /api/governorates
// @desc    Get all governorates
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['name', 'annualAppreciationRate', 'citiesCount']).withMessage('Invalid sort field'),
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

    const orderBy =
      sortBy === 'citiesCount'
        ? { cities: { _count: sortOrder === 'asc' ? 'asc' : 'desc' } }
        : { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [totalGovernorates, governoratesRaw] = await Promise.all([
      prisma.governorate.count({ where }),
      prisma.governorate.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy,
        include: {
          _count: { select: { cities: true } },
        },
      }),
    ]);

    const governorates = governoratesRaw.map(serializeGovernorateListItem);

    res.json({
      governorates,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalGovernorates,
        pages: Math.ceil(totalGovernorates / limitNumber)
      }
    });
  } catch (error) {
    console.error('Get governorates error:', error);
    res.status(500).json({ message: 'Server error while fetching governorates' });
  }
});

// @route   GET /api/governorates/:id
// @desc    Get single governorate by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const governorate = await prisma.governorate.findUnique({
      where: { id },
    });

    if (!governorate) {
      return res.status(404).json({ message: 'Governorate not found' });
    }

    const cities = await prisma.city.findMany({
      where: { governorateId: id },
      select: { id: true, name: true, slug: true, annualAppreciationRate: true, description: true },
      orderBy: { name: 'asc' },
    });

    const serializedCities = withLegacyIdArray(cities);

    res.json({
      governorate: {
        ...serializeGovernorate(governorate),
        citiesCount: serializedCities.length,
        cities: serializedCities
      }
    });
  } catch (error) {
    console.error('Get governorate error:', error);
    res.status(500).json({ message: 'Server error while fetching governorate' });
  }
});

// @route   POST /api/governorates
// @desc    Create new governorate
// @access  Private (Admin only)
router.post('/', authMiddleware, adminMiddleware, [
  body('name').trim().notEmpty().withMessage('Governorate name is required')
    .isLength({ max: 100 }).withMessage('Governorate name cannot exceed 100 characters'),
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

    const { name, annualAppreciationRate, description } = req.body;

    const normalizedName = name.trim();

    const duplicate = await prisma.governorate.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
      },
    });

    if (duplicate) {
      return res.status(400).json({ message: 'A governorate with this name already exists' });
    }

    const baseSlug = slugify(normalizedName);
    const slug = await generateUniqueSlug(baseSlug);

    const newGovernorate = await prisma.governorate.create({
      data: {
        name: normalizedName,
        slug,
        annualAppreciationRate: toFloat(annualAppreciationRate),
        description: description?.trim() || null,
      },
    });

    res.status(201).json({
      message: 'Governorate created successfully',
      governorate: serializeGovernorate(newGovernorate)
    });
  } catch (error) {
    console.error('Create governorate error:', error);
    if (isUniqueConstraintError(error)) {
      return res.status(400).json({ message: 'A governorate with this name or slug already exists' });
    }
    res.status(500).json({ message: 'Server error while creating governorate' });
  }
});

// @route   PUT /api/governorates/:id
// @desc    Update governorate
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, [
  body('name').optional().trim().notEmpty().withMessage('Governorate name cannot be empty')
    .isLength({ max: 100 }).withMessage('Governorate name cannot exceed 100 characters'),
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

    const existing = await prisma.governorate.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      return res.status(404).json({ message: 'Governorate not found' });
    }

    const { name, annualAppreciationRate, description } = req.body;

    let updatedName = existing.name;
    let updatedSlug = existing.slug;

    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.governorate.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id: req.params.id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'A governorate with this name already exists' });
      }

      updatedName = name.trim();
      updatedSlug = await generateUniqueSlug(slugify(updatedName), existing.id);
    }

    const governorate = await prisma.governorate.update({
      where: { id: req.params.id },
      data: {
        name: updatedName,
        slug: updatedSlug,
        annualAppreciationRate: toFloat(annualAppreciationRate, existing.annualAppreciationRate),
        description:
          description === undefined ? existing.description : description?.trim() || null,
      },
    });

    res.json({
      message: 'Governorate updated successfully',
      governorate: serializeGovernorate(governorate)
    });
  } catch (error) {
    console.error('Update governorate error:', error);
    if (isUniqueConstraintError(error)) {
      return res.status(400).json({ message: 'A governorate with this name or slug already exists' });
    }
    res.status(500).json({ message: 'Server error while updating governorate' });
  }
});

// @route   GET /api/governorates/:id/related-counts
// @desc    Get counts of cities, areas, and properties related to governorate
// @access  Private (Admin only)
router.get('/:id/related-counts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const governorate = await prisma.governorate.findUnique({ where: { id: req.params.id } });

    if (!governorate) {
      return res.status(404).json({ message: 'Governorate not found' });
    }

    const cityRecords = await prisma.city.findMany({
      where: { governorateId: req.params.id },
      select: { id: true },
    });
    const cityIds = cityRecords.map((c) => c.id);
    const citiesCount = cityIds.length;

    const areaRecords = cityIds.length
      ? await prisma.area.findMany({
          where: { cityId: { in: cityIds } },
          select: { id: true },
        })
      : [];
    const areaIds = areaRecords.map((a) => a.id);
    const areasCount = areaIds.length;

    const propertyFilters = [
      { governorateId: req.params.id },
      ...(cityIds.length ? [{ cityId: { in: cityIds } }] : []),
      ...(areaIds.length ? [{ areaId: { in: areaIds } }] : []),
    ];

    const propertiesCount = await prisma.property.count({
      where: {
        OR: propertyFilters,
      },
    });

    res.json({
      governorate: governorate.name,
      governorateId: governorate.id,
      citiesCount,
      areasCount,
      propertiesCount
    });
  } catch (error) {
    console.error('Get related counts error:', error);
    res.status(500).json({ message: 'Server error while fetching counts' });
  }
});

// @route   DELETE /api/governorates/:id/cascade
// @desc    Delete governorate and all related cities and areas (cascade delete)
// @access  Private (Admin only)
router.delete('/:id/cascade', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const governorate = await prisma.governorate.findUnique({ where: { id: req.params.id } });

    if (!governorate) {
      return res.status(404).json({ message: 'Governorate not found' });
    }

    const cityRecords = await prisma.city.findMany({
      where: { governorateId: req.params.id },
      select: { id: true },
    });
    const cityIds = cityRecords.map((c) => c.id);

    const areaWhere = cityIds.length ? { cityId: { in: cityIds } } : { id: { in: [] } };

    const [areaResult, cityResult] = await prisma.$transaction([
      prisma.area.deleteMany({ where: areaWhere }),
      prisma.city.deleteMany({ where: { governorateId: req.params.id } }),
    ]);

    await prisma.governorate.delete({ where: { id: req.params.id } });

    res.json({
      message: 'Governorate and related data deleted successfully',
      deleted: {
        governorate: governorate.name,
        citiesCount: cityResult.count,
        areasCount: areaResult.count
      }
    });
  } catch (error) {
    console.error('Cascade delete governorate error:', error);
    res.status(500).json({ message: 'Server error while deleting governorate and related data' });
  }
});

// @route   DELETE /api/governorates/:id
// @desc    Delete governorate only (orphan cities)
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const governorate = await prisma.governorate.findUnique({ where: { id: req.params.id } });

    if (!governorate) {
      return res.status(404).json({ message: 'Governorate not found' });
    }

    await prisma.governorate.delete({ where: { id: req.params.id } });

    res.json({
      message: 'Governorate deleted successfully (cities remain as orphaned)'
    });
  } catch (error) {
    console.error('Delete governorate error:', error);
    res.status(500).json({ message: 'Server error while deleting governorate' });
  }
});

module.exports = router;

