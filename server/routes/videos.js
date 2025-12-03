const express = require('express');
const { body, validationResult, query } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware, optionalAuth } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

const normalizeAssociationKey = (value) => {
  if (!value) return null;
  return value.toString().trim().toLowerCase();
};

const normalizeAssociationEnum = (value) => {
  const key = normalizeAssociationKey(value);
  if (!key) return null;
  const enumKey = key.toUpperCase();
  return Prisma.VideoAssociationType?.[enumKey] || null;
};

const parsePagination = (page = 1, limit = 50, maxLimit = 100) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(parseInt(limit, 10) || 50, maxLimit);
  const skip = (currentPage - 1) * safeLimit;
  return { currentPage, limit: safeLimit, skip };
};

const videoInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
};

const associatedLookups = {
  compound: (id) => prisma.compound.findUnique({ where: { id } }),
  launch: (id) => prisma.launch.findUnique({ where: { id } }),
  property: (id) => prisma.property.findUnique({ where: { id } }),
};

const verifyAssociation = async (type, id) => {
  const normalizedType = normalizeAssociationKey(type);
  const resolver = normalizedType ? associatedLookups[normalizedType] : null;
  if (!resolver) return false;
  const result = await resolver(id);
  return Boolean(result);
};

const buildVideoWhere = (params, user) => {
  const {
    search,
    associatedType,
    associatedId,
    isFeatured,
    isActive,
  } = params;

  const where = {};

  if (search) {
    const term = search.trim();
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }
  }

  if (associatedType) {
    const associationEnum = normalizeAssociationEnum(associatedType);
    if (associationEnum) {
      where.associatedType = associationEnum;
    }
  }

  if (associatedId) {
    where.associatedId = associatedId;
  }

  if (isFeatured !== undefined) {
    where.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true' || isActive === true;
  } else if (!user || user.role !== 'admin') {
    where.isActive = true;
  }

  return where;
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @route   POST /api/videos
// @desc    Create new video (admin only)
// @access  Private (Admin only)
router.post('/', authMiddleware, adminMiddleware, [
  body('title').trim().notEmpty().withMessage('Video title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('videoUrl').trim().notEmpty().withMessage('Video URL is required'),
  body('thumbnailUrl').optional().trim(),
  body('duration').optional().isFloat({ min: 0 }).withMessage('Duration must be a positive number'),
  body('fileSize').optional().isInt({ min: 0 }).withMessage('File size must be a positive number'),
  body('format').optional().trim(),
  body('publicId').optional().trim(),
  body('associatedType').isIn(['compound', 'launch', 'property']).withMessage('Invalid associated type'),
  body('associatedId').notEmpty().withMessage('Associated ID is required'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      fileSize,
      format,
      publicId,
      associatedType,
      associatedId,
      order,
      isFeatured,
      isActive
    } = req.body;

    const associationExists = await verifyAssociation(associatedType, associatedId);
    if (!associationExists) {
      return res.status(404).json({ message: `${associatedType} not found` });
    }

    const associationEnum = normalizeAssociationEnum(associatedType);
    if (!associationEnum) {
      return res.status(400).json({ message: 'Invalid associated type' });
    }

    const video = await prisma.video.create({
      data: {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration: duration || 0,
      fileSize: fileSize || 0,
      format: format || 'mp4',
      publicId,
      associatedType: associationEnum,
      associatedId,
      order: order || 0,
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true,
      createdById: req.user.id,
      updatedById: req.user.id,
      },
      include: videoInclude,
    });

    res.status(201).json({
      message: 'Video created successfully',
      video
    });
  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({ message: 'Server error while creating video' });
  }
});

// @route   GET /api/videos
// @desc    Get all videos with filters (public, but respects admin status for filtering)
// @access  Public (with optional auth)
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString(),
  query('associatedType').optional().isIn(['compound', 'launch', 'property']).withMessage('Invalid associated type'),
  query('associatedId').optional().isString().isLength({ min: 1 }).withMessage('Invalid associated ID'),
  query('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('sortBy').optional().isIn(['title', 'duration', 'createdAt', 'order']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { currentPage, limit: take, skip } = parsePagination(page, limit, 100);
    const where = buildVideoWhere(req.query, req.user);
    const sortFields = ['title', 'duration', 'createdAt', 'order'];
    const orderField = sortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy = { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        include: videoInclude,
        orderBy,
        skip,
        take,
      }),
      prisma.video.count({ where }),
    ]);

    res.json({
      videos,
      pagination: {
        currentPage,
        totalPages: Math.max(1, Math.ceil(total / take)),
        totalItems: total,
        totalVideos: total, // For backward compatibility
        hasNext: skip + take < total,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Server error while fetching videos' });
  }
});

// @route   GET /api/videos/:id
// @desc    Get single video by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id, isActive: true },
      include: videoInclude,
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    let associatedEntity = null;
    if (video.associatedType && video.associatedId) {
      const resolver = associatedLookups[video.associatedType];
      if (resolver) {
        try {
          associatedEntity = await resolver(video.associatedId);
        } catch (populateError) {
          console.error('Error fetching associated entity:', populateError);
        }
      }
    }

    prisma.video
      .update({
        where: { id: video.id },
        data: { views: { increment: 1 } },
      })
      .catch((err) => console.error('Error incrementing views:', err));

    res.json({
      video: {
        ...video,
        associatedEntity,
      },
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ message: 'Server error while fetching video', error: error.message });
  }
});

// @route   PUT /api/videos/:id
// @desc    Update video (admin only)
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, [
  body('title').optional().trim().notEmpty().withMessage('Video title cannot be empty').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('videoUrl').optional().trim().notEmpty().withMessage('Video URL cannot be empty'),
  body('thumbnailUrl').optional().trim(),
  body('duration').optional().isFloat({ min: 0 }).withMessage('Duration must be a positive number'),
  body('fileSize').optional().isInt({ min: 0 }).withMessage('File size must be a positive number'),
  body('format').optional().trim(),
  body('associatedType').optional().isIn(['compound', 'launch', 'property']).withMessage('Invalid associated type'),
  body('associatedId').optional().notEmpty().withMessage('Associated ID cannot be empty'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existing = await prisma.video.findUnique({
      where: { id: req.params.id },
      select: { associatedType: true, associatedId: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const nextAssociatedType = req.body.associatedType ?? existing.associatedType;
    const nextAssociatedId = req.body.associatedId ?? existing.associatedId;

    if (nextAssociatedType && nextAssociatedId) {
      const validAssociation = await verifyAssociation(nextAssociatedType, nextAssociatedId);
      if (!validAssociation) {
        return res.status(404).json({ message: `${nextAssociatedType} not found` });
      }
    }

    const nextAssociationEnum = nextAssociatedType ? normalizeAssociationEnum(nextAssociatedType) : null;

    const data = {
      ...(req.body.title !== undefined && { title: req.body.title }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.videoUrl !== undefined && { videoUrl: req.body.videoUrl }),
      ...(req.body.thumbnailUrl !== undefined && { thumbnailUrl: req.body.thumbnailUrl }),
      ...(req.body.duration !== undefined && { duration: req.body.duration }),
      ...(req.body.fileSize !== undefined && { fileSize: req.body.fileSize }),
      ...(req.body.format !== undefined && { format: req.body.format }),
      ...(nextAssociationEnum && { associatedType: nextAssociationEnum }),
      ...(nextAssociatedId && { associatedId: nextAssociatedId }),
      ...(req.body.order !== undefined && { order: req.body.order }),
      ...(req.body.isFeatured !== undefined && { isFeatured: req.body.isFeatured }),
      ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      updatedById: req.user.id,
    };

    const updatedVideo = await prisma.video.update({
      where: { id: req.params.id },
      data,
      include: videoInclude,
    });

    res.json({
      message: 'Video updated successfully',
      video: updatedVideo
    });
  } catch (error) {
    console.error('Update video error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.status(500).json({ message: 'Server error while updating video' });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Delete video (admin only)
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Delete video from Cloudinary if publicId exists
    if (video.publicId) {
      try {
        await cloudinary.uploader.destroy(video.publicId, {
          resource_type: 'video'
        });
      } catch (cloudinaryError) {
        console.error('Error deleting video from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete thumbnail from Cloudinary if it exists and is separate
    if (video.thumbnailUrl && video.thumbnailUrl.includes('cloudinary')) {
      try {
        // Extract public ID from thumbnail URL if possible
        const thumbnailMatch = video.thumbnailUrl.match(/\/v\d+\/(.+)\.(jpg|png|webp)/);
        if (thumbnailMatch && thumbnailMatch[1]) {
          await cloudinary.uploader.destroy(thumbnailMatch[1]);
        }
      } catch (cloudinaryError) {
        console.error('Error deleting thumbnail from Cloudinary:', cloudinaryError);
        // Continue with database deletion
      }
    }

    await prisma.video.delete({ where: { id: req.params.id } });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ message: 'Server error while deleting video' });
  }
});

// @route   GET /api/videos/compound/:compoundId
// @desc    Get videos for a specific compound
// @access  Public
router.get('/compound/:compoundId', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        associatedType: Prisma.VideoAssociationType.COMPOUND,
        associatedId: req.params.compoundId,
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: videoInclude,
    });

    res.json({ videos });
  } catch (error) {
    console.error('Get compound videos error:', error);
    res.status(500).json({ message: 'Server error while fetching compound videos' });
  }
});

// @route   GET /api/videos/launch/:launchId
// @desc    Get videos for a specific launch
// @access  Public
router.get('/launch/:launchId', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        associatedType: Prisma.VideoAssociationType.LAUNCH,
        associatedId: req.params.launchId,
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: videoInclude,
    });

    res.json({ videos });
  } catch (error) {
    console.error('Get launch videos error:', error);
    res.status(500).json({ message: 'Server error while fetching launch videos' });
  }
});

// @route   GET /api/videos/property/:propertyId
// @desc    Get videos for a specific property
// @access  Public
router.get('/property/:propertyId', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        associatedType: Prisma.VideoAssociationType.PROPERTY,
        associatedId: req.params.propertyId,
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: videoInclude,
    });

    res.json({ videos });
  } catch (error) {
    console.error('Get property videos error:', error);
    res.status(500).json({ message: 'Server error while fetching property videos' });
  }
});

module.exports = router;

