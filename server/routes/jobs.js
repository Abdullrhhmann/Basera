const express = require('express');
const { body, validationResult, query } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const normalizeEnumKey = (value) =>
  value
    ?.toString()
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const toEnumValue = (enumObj, value) => {
  if (!enumObj || value === undefined || value === null || value === '') {
    return undefined;
  }
  const normalized = normalizeEnumKey(value);
  return normalized && enumObj[normalized] ? enumObj[normalized] : undefined;
};

const humanizeEnumValue = (value) => {
  if (!value || typeof value !== 'string') return value;
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const withLegacyId = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }
  if (entity._id) {
    return entity;
  }
  return { ...entity, _id: entity.id };
};

const serializeUser = (user) => (user ? withLegacyId(user) : user);

const serializeJob = (job) => {
  if (!job) return job;

  const formatted = {
    ...withLegacyId(job),
    jobType: humanizeEnumValue(job.jobType),
    status: humanizeEnumValue(job.status),
  };

  if (job.postedBy) {
    formatted.postedBy = serializeUser(job.postedBy);
  }

  return formatted;
};

const serializeJobCollection = (jobs = []) => jobs.map(serializeJob);

const jobSelect = {
  id: true,
  title: true,
  description: true,
  requirements: true,
  location: true,
  jobType: true,
  department: true,
  status: true,
  postedById: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  postedBy: {
    select: { id: true, name: true, email: true },
  },
};

const upsertExpiration = async (job) => {
  if (!job || !job.expiresAt) {
    return job;
  }

  const isOpen = job.status === Prisma.JobStatus.OPEN || 
                 job.status === 'OPEN' || 
                 job.status === 'open';

  if (!isOpen) {
    return job;
  }

  if (new Date(job.expiresAt) <= new Date()) {
    return prisma.jobPosting.update({
      where: { id: job.id },
      data: { status: Prisma.JobStatus.EXPIRED },
      select: jobSelect,
    });
  }

  return job;
};

// @route   GET /api/jobs
// @desc    Get all active jobs (public)
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { page = 1, limit = 10, search } = req.query;
    
    const where = {
      status: Prisma.JobStatus.OPEN,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        select: jobSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.jobPosting.count({ where }),
    ]);

    res.json({
      success: true,
      jobs: serializeJobCollection(jobs),
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalItems: total,
        itemsPerPage: limitNumber,
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get single job details (public)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const jobRecord = await prisma.jobPosting.findUnique({
      where: { id: req.params.id },
      select: jobSelect,
    });

    if (!jobRecord) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const job = await upsertExpiration(jobRecord);

    res.json({
      success: true,
      job: serializeJob(job)
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job',
      error: error.message
    });
  }
});

// @route   GET /api/jobs/admin/all
// @desc    Get all jobs with filters (admin)
// @access  Private (Admin only)
router.get('/admin/all', authMiddleware, adminMiddleware, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['open', 'closed', 'expired']),
  query('department').optional().isString(),
  query('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'internship'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { page = 1, limit = 20, status, department, jobType, search } = req.query;

    const where = {};

    const statusEnum = toEnumValue(Prisma.JobStatus, status);
    if (statusEnum) {
      where.status = statusEnum;
    }

    const jobTypeEnum = toEnumValue(Prisma.JobType, jobType);
    if (jobTypeEnum) {
      where.jobType = jobTypeEnum;
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        select: jobSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.jobPosting.count({ where }),
    ]);

    res.json({
      success: true,
      jobs: serializeJobCollection(jobs),
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalItems: total,
        itemsPerPage: limitNumber
      }
    });
  } catch (error) {
    console.error('Get admin jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
});

// @route   POST /api/jobs
// @desc    Create new job posting (admin)
// @access  Private (Admin only)
router.post('/', authMiddleware, adminMiddleware, [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
  body('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'internship']),
  body('status').optional().isIn(['open', 'closed', 'expired']),
  body('expiresAt').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, requirements, location, jobType, department, status, expiresAt } = req.body;

    const jobTypeEnum = toEnumValue(Prisma.JobType, jobType);
    if (jobType && !jobTypeEnum) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job type',
      });
    }

    const statusEnum = toEnumValue(Prisma.JobStatus, status);
    const finalStatus = statusEnum || Prisma.JobStatus.OPEN;

    const job = await prisma.jobPosting.create({
      data: {
        title,
        description,
        requirements: requirements || [],
        location: location || null,
        jobType: jobTypeEnum || Prisma.JobType.FULL_TIME,
        department: department || null,
        status: finalStatus,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        postedById: req.user.id,
      },
      select: jobSelect,
    });

    res.status(201).json({
      success: true,
      message: 'Job posting created successfully',
      job: serializeJob(job)
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating job posting',
      error: error.message
    });
  }
});

// @route   PUT /api/jobs/:id
// @desc    Update job posting (admin)
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, [
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('description').optional().trim().isLength({ min: 20 }),
  body('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'internship']),
  body('status').optional().isIn(['open', 'closed', 'expired']),
  body('expiresAt').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const existing = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const updateData = {};

    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.requirements !== undefined) updateData.requirements = req.body.requirements;
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.department !== undefined) updateData.department = req.body.department;

    if (req.body.jobType !== undefined) {
      const jobTypeEnum = toEnumValue(Prisma.JobType, req.body.jobType);
      if (jobTypeEnum) {
        updateData.jobType = jobTypeEnum;
      }
    }

    if (req.body.status !== undefined) {
      const statusEnum = toEnumValue(Prisma.JobStatus, req.body.status);
      if (statusEnum) {
        updateData.status = statusEnum;
      }
    }

    if (req.body.expiresAt !== undefined) {
      updateData.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    }

    const job = await prisma.jobPosting.update({
      where: { id: req.params.id },
      data: updateData,
      select: jobSelect,
    });

    res.json({
      success: true,
      message: 'Job posting updated successfully',
      job: serializeJob(job)
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job posting',
      error: error.message
    });
  }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete job posting (admin)
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await prisma.jobPosting.delete({ where: { id: req.params.id } });

    res.json({
      success: true,
      message: 'Job posting deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting job posting',
      error: error.message
    });
  }
});

// @route   PUT /api/jobs/:id/status
// @desc    Update job status (admin)
// @access  Private (Admin only)
router.put('/:id/status', authMiddleware, adminMiddleware, [
  body('status').isIn(['open', 'closed', 'expired']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const statusEnum = toEnumValue(Prisma.JobStatus, req.body.status);
    if (!statusEnum) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const updated = await prisma.jobPosting.update({
      where: { id: req.params.id },
      data: { status: statusEnum },
      select: jobSelect,
    });

    res.json({
      success: true,
      message: 'Job status updated successfully',
      job: serializeJob(updated)
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job status',
      error: error.message
    });
  }
});

module.exports = router;
