const express = require('express');
const { body, validationResult, query } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const applicationSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  coverLetter: true,
  cvFile: true,
  jobPostingId: true,
  status: true,
  notes: true,
  appliedAt: true,
  createdAt: true,
  updatedAt: true,
  jobPosting: {
    select: {
      id: true,
      title: true,
      department: true,
      location: true,
      jobType: true,
      description: true,
      requirements: true,
    },
  },
};

// @route   POST /api/job-applications
// @desc    Submit job application (public)
// @access  Public
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('coverLetter').optional().trim().isLength({ max: 5001 }).withMessage('Cover letter cannot exceed 5001 characters'),
  body('cvFile.url').notEmpty().withMessage('CV file URL is required'),
  body('cvFile.publicId').notEmpty().withMessage('CV file public ID is required'),
  body('jobPosting').isString().notEmpty().withMessage('Invalid job posting ID')
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

    const jobPosting = await prisma.jobPosting.findUnique({ where: { id: req.body.jobPosting } });
    if (!jobPosting) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    const isOpen = jobPosting.status === Prisma.JobStatus.OPEN || 
                   jobPosting.status === 'OPEN' || 
                   jobPosting.status === 'open';

    if (!isOpen) {
      return res.status(400).json({
        success: false,
        message: 'This job posting is not currently accepting applications'
      });
    }

    if (jobPosting.expiresAt && jobPosting.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This job posting has expired'
      });
    }

    const application = await prisma.jobApplication.create({
      data: {
        name: req.body.name,
        email: req.body.email.trim().toLowerCase(),
        phone: req.body.phone,
        coverLetter: req.body.coverLetter || '',
        cvFile: {
          url: req.body.cvFile.url,
          publicId: req.body.cvFile.publicId,
        },
        jobPostingId: req.body.jobPosting,
        status: 'pending',
      },
      select: applicationSelect,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message
    });
  }
});

// @route   GET /api/job-applications
// @desc    Get all applications (admin)
// @access  Private (Admin only)
router.get('/', authMiddleware, adminMiddleware, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['pending', 'reviewed', 'shortlisted', 'rejected']),
  query('jobPosting').optional().isString()
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

    const { page = 1, limit = 20, status, jobPosting, search, startDate, endDate } = req.query;

    const where = {};
    if (status) where.status = status;
    if (jobPosting) where.jobPostingId = jobPosting;

    if (startDate || endDate) {
      where.appliedAt = {};
      if (startDate) where.appliedAt.gte = new Date(startDate);
      if (endDate) where.appliedAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        select: applicationSelect,
        orderBy: { appliedAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.jobApplication.count({ where }),
    ]);

    res.json({
      success: true,
      applications,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalItems: total,
        itemsPerPage: limitNumber
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
});

// @route   GET /api/job-applications/:id
// @desc    Get single application (admin)
// @access  Private (Admin only)
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: req.params.id },
      select: applicationSelect,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
});

// @route   PUT /api/job-applications/:id/status
// @desc    Update application status (admin)
// @access  Private (Admin only)
router.put('/:id/status', authMiddleware, adminMiddleware, [
  body('status').isIn(['pending', 'reviewed', 'shortlisted', 'rejected']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters')
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

    const application = await prisma.jobApplication.findUnique({ where: { id: req.params.id } });
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        notes: req.body.notes,
      },
      select: applicationSelect,
    });

    res.json({
      success: true,
      message: 'Application status updated successfully',
      application: updated
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
});

// @route   DELETE /api/job-applications/:id
// @desc    Delete application (admin)
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const application = await prisma.jobApplication.findUnique({ where: { id: req.params.id } });
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await prisma.jobApplication.delete({ where: { id: req.params.id } });

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting application',
      error: error.message
    });
  }
});

module.exports = router;
