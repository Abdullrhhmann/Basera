const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const withLegacyId = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }
  if (entity._id) {
    return entity;
  }
  return { ...entity, _id: entity.id };
};

const serializeCity = (city) => {
  if (!city) return city;
  const formatted = withLegacyId(city);
  if (formatted.governorate) {
    formatted.governorate = withLegacyId(formatted.governorate);
  }
  return formatted;
};

const serializeArea = (area) => {
  if (!area) return area;
  const formatted = withLegacyId(area);
  if (formatted.city) {
    formatted.city = serializeCity(formatted.city);
  }
  return formatted;
};

const cityWithGovernorateSelect = {
  id: true,
  name: true,
  slug: true,
  governorate: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
};

const buildAreaWhere = (search, city) => {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (city) {
    where.cityId = city;
  }
  return where;
};

// @route   GET /api/areas
// @desc    Get all areas with optional filtering
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
  query('search').optional().isString(),
  query('city').optional().isString().withMessage('City must be a valid ID'),
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
      city = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where = buildAreaWhere(search, city);
    const totalAreas = await prisma.area.count({ where });

    const baseOrderBy = { [sortBy === 'propertiesCount' ? 'name' : sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const areasRaw = await prisma.area.findMany({
      where,
      include: { city: { select: cityWithGovernorateSelect } },
      orderBy: baseOrderBy,
      skip,
      take: limitNumber,
    });

    const areaIds = areasRaw.map((area) => area.id);
    const propertyCounts = areaIds.length
      ? await prisma.property.groupBy({
          by: ['areaId'],
          where: {
            areaId: { in: areaIds },
            isActive: true,
            approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
          },
          _count: { _all: true },
        })
      : [];
    const countMap = propertyCounts.reduce((acc, curr) => {
      acc[curr.areaId] = curr._count._all;
      return acc;
    }, {});

    let areas = areasRaw.map((area) => ({
      ...serializeArea(area),
      propertiesCount: countMap[area.id] || 0,
    }));

    if (sortBy === 'propertiesCount') {
      areas = areas.sort((a, b) => {
        const diff = (a.propertiesCount || 0) - (b.propertiesCount || 0);
        return sortOrder === 'asc' ? diff : -diff;
      });
    }

    res.json({
      areas,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalAreas,
        pages: Math.ceil(totalAreas / limitNumber)
      }
    });
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({ message: 'Server error while fetching areas' });
  }
});

// @route   GET /api/areas/by-city/:cityId
// @desc    Get all areas for a specific city
// @access  Public
router.get('/by-city/:cityId', [
  param('cityId').isString().withMessage('City ID must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cityId } = req.params;

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    const areas = await prisma.area.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
    });

    res.json({
      areas: areas.map((area) => withLegacyId(area)),
      city: withLegacyId(city)
    });
  } catch (error) {
    console.error('Get areas by city error:', error);
    res.status(500).json({ message: 'Server error while fetching areas' });
  }
});

// @route   GET /api/areas/:id
// @desc    Get single area by ID
// @access  Public
router.get('/:id', [
  param('id').isString().withMessage('Area ID must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const area = await prisma.area.findUnique({
      where: { id },
      include: { city: { select: cityWithGovernorateSelect } },
    });

    if (!area) {
      return res.status(404).json({ message: 'Area not found' });
    }

    const propertiesCount = await prisma.property.count({
      where: { areaId: id, isActive: true, approvalStatus: Prisma.PropertyApprovalStatus.APPROVED },
    });

    res.json({ area: { ...serializeArea(area), propertiesCount } });
  } catch (error) {
    console.error('Get area error:', error);
    res.status(500).json({ message: 'Server error while fetching area' });
  }
});

// @route   POST /api/areas
// @desc    Create new area
// @access  Private (Admin only)
router.post('/', authMiddleware, adminMiddleware, [
  body('name').trim().notEmpty().withMessage('Area name is required')
    .isLength({ max: 100 }).withMessage('Area name cannot exceed 100 characters'),
  body('city').isString().withMessage('Valid city ID is required'),
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

    const { name, city, annualAppreciationRate, description } = req.body;

    const cityExists = await prisma.city.findUnique({ where: { id: city } });
    if (!cityExists) {
      return res.status(404).json({ message: 'City not found' });
    }

    const existingArea = await prisma.area.findFirst({
      where: {
        cityId: city,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existingArea) {
      return res.status(400).json({ message: 'An area with this name already exists in this city' });
    }

    const area = await prisma.area.create({
      data: {
        name,
        cityId: city,
        annualAppreciationRate,
        description,
      },
      include: { city: { select: cityWithGovernorateSelect } },
    });

    res.status(201).json({
      message: 'Area created successfully',
      area
    });
  } catch (error) {
    console.error('Create area error:', error);
    res.status(500).json({ message: 'Server error while creating area' });
  }
});

// @route   PUT /api/areas/:id
// @desc    Update area
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, [
  param('id').isString().withMessage('Area ID must be valid'),
  body('name').optional().trim().notEmpty().withMessage('Area name cannot be empty')
    .isLength({ max: 100 }).withMessage('Area name cannot exceed 100 characters'),
  body('city').optional().isString().withMessage('City ID must be valid'),
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

    const area = await prisma.area.findUnique({
      where: { id: req.params.id },
      include: { city: true },
    });

    if (!area) {
      return res.status(404).json({ message: 'Area not found' });
    }

    const { name, city, annualAppreciationRate, description } = req.body;

    let targetCityId = area.cityId;
    if (city && city !== area.cityId) {
      const cityExists = await prisma.city.findUnique({ where: { id: city } });
      if (!cityExists) {
        return res.status(404).json({ message: 'City not found' });
      }
      targetCityId = city;
    }

    if (name && name.toLowerCase() !== area.name.toLowerCase()) {
      const duplicate = await prisma.area.findFirst({
        where: {
          cityId: targetCityId,
          name: { equals: name, mode: 'insensitive' },
          NOT: { id: req.params.id },
        },
      });

      if (duplicate) {
        return res.status(400).json({ message: 'An area with this name already exists in this city' });
      }
    }

    const updatedArea = await prisma.area.update({
      where: { id: req.params.id },
      data: {
        name: name ?? area.name,
        cityId: targetCityId,
        annualAppreciationRate: annualAppreciationRate ?? area.annualAppreciationRate,
        description: description ?? area.description,
      },
      include: { city: { select: cityWithGovernorateSelect } },
    });

    res.json({
      message: 'Area updated successfully',
      area: updatedArea
    });
  } catch (error) {
    console.error('Update area error:', error);
    res.status(500).json({ message: 'Server error while updating area' });
  }
});

// @route   DELETE /api/areas/:id
// @desc    Delete area
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, [
  param('id').isString().withMessage('Area ID must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const area = await prisma.area.findUnique({ where: { id: req.params.id } });

    if (!area) {
      return res.status(404).json({ message: 'Area not found' });
    }

    const propertiesCount = await prisma.property.count({
      where: { areaId: req.params.id },
    });
    
    if (propertiesCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete area. There are ${propertiesCount} properties associated with it. Please reassign or delete those properties first.` 
      });
    }

    await prisma.area.delete({ where: { id: req.params.id } });

    res.json({
      message: 'Area deleted successfully'
    });
  } catch (error) {
    console.error('Delete area error:', error);
    res.status(500).json({ message: 'Server error while deleting area' });
  }
});

module.exports = router;


