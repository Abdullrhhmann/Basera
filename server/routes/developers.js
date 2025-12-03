const express = require('express');
const { body, validationResult, query } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, hierarchyMiddleware } = require('../middleware/auth');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const generateSlug = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

// @route   GET /api/developers
// @desc    Get all developers
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['name', 'propertiesCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
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
      sortOrder = 'asc',
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const orderBy =
      sortBy === 'propertiesCount'
        ? { properties: { _count: sortOrder === 'desc' ? 'desc' : 'asc' } }
        : { name: sortOrder === 'desc' ? 'desc' : 'asc' };

    const [developers, total] = await Promise.all([
      prisma.developer.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy,
        include: {
          _count: { select: { properties: true } },
        },
      }),
      prisma.developer.count({ where }),
    ]);

    const formatted = developers.map((dev) => ({
      id: dev.id,
      name: dev.name,
      slug: dev.slug,
      logo: dev.logo,
      description: dev.description,
      propertiesCount: dev._count.properties,
    }));

    res.json({
      developers: formatted,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalDevelopers: total,
        hasNext: skip + limitNumber < total,
        hasPrev: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error('Get developers error:', error);
    res.status(500).json({ message: 'Server error while fetching developers' });
  }
});

// @route   GET /api/developers/:slug
// @desc    Get single developer by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const developer = await prisma.developer.findUnique({ where: { slug } });
    if (!developer) {
      return res.status(404).json({ message: 'Developer not found' });
    }

    const properties = await prisma.property.findMany({
      where: {
        developerId: developer.id,
        isActive: true,
        approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
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
    });

    // Serialize properties to add _id for frontend compatibility
    const serializedProperties = properties.map(prop => ({
      ...prop,
      _id: prop.id,
    }));

    res.json({
      developer: {
        ...developer,
        propertiesCount: properties.length,
        properties: serializedProperties,
      },
    });
  } catch (error) {
    console.error('Get developer error:', error);
    res.status(500).json({ message: 'Server error while fetching developer' });
  }
});

// @route   POST /api/developers
// @desc    Create new developer
// @access  Private (Admin only)
router.post('/', authMiddleware, hierarchyMiddleware(2), [
  body('name').trim().notEmpty().withMessage('Developer name is required')
    .isLength({ max: 100 }).withMessage('Developer name cannot exceed 100 characters'),
  body('logo').optional().trim().isURL().withMessage('Logo must be a valid URL'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, logo, description } = req.body;
    const slug = generateSlug(name);

    const existing = await prisma.developer.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(400).json({ message: 'A developer with this name already exists' });
    }

    const developer = await prisma.developer.create({
      data: { name, logo, description, slug },
    });

    res.status(201).json({
      message: 'Developer created successfully',
      developer,
    });
  } catch (error) {
    console.error('Create developer error:', error);
    res.status(500).json({ message: 'Server error while creating developer' });
  }
});

// @route   PUT /api/developers/:id
// @desc    Update developer
// @access  Private (Admin only)
router.put('/:id', authMiddleware, hierarchyMiddleware(2), [
  body('name').optional().trim().notEmpty().withMessage('Developer name cannot be empty')
    .isLength({ max: 100 }).withMessage('Developer name cannot exceed 100 characters'),
  body('logo').optional().trim(),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, logo, description } = req.body;

    const developer = await prisma.developer.findUnique({ where: { id } });
    if (!developer) {
      return res.status(404).json({ message: 'Developer not found' });
    }

    if (name && name.toLowerCase() !== developer.name.toLowerCase()) {
      const duplicate = await prisma.developer.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'A developer with this name already exists' });
      }
    }

    const updated = await prisma.developer.update({
      where: { id },
      data: {
        name: name ?? developer.name,
        slug: name ? generateSlug(name) : developer.slug,
        logo: logo !== undefined ? logo : developer.logo,
        description: description !== undefined ? description : developer.description,
      },
    });

    res.json({
      message: 'Developer updated successfully',
      developer: updated,
    });
  } catch (error) {
    console.error('Update developer error:', error);
    res.status(500).json({ message: 'Server error while updating developer' });
  }
});

// @route   DELETE /api/developers/:id
// @desc    Delete developer
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, hierarchyMiddleware(2), async (req, res) => {
  try {
    const { id } = req.params;
    const developer = await prisma.developer.findUnique({ where: { id } });

    if (!developer) {
      return res.status(404).json({ message: 'Developer not found' });
    }

    const propertiesCount = await prisma.property.count({ where: { developerId: id } });
    if (propertiesCount > 0) {
      return res.status(400).json({
        message: `Cannot delete developer. ${propertiesCount} ${propertiesCount === 1 ? 'property is' : 'properties are'} associated with this developer.`,
        propertiesCount,
      });
    }

    await prisma.developer.delete({ where: { id } });
    res.json({ message: 'Developer deleted successfully' });
  } catch (error) {
    console.error('Delete developer error:', error);
    res.status(500).json({ message: 'Server error while deleting developer' });
  }
});

module.exports = router;

