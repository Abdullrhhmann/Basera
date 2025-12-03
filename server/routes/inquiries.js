const express = require('express');
const { body, validationResult, query } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Simple in-memory cache for better performance
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const router = express.Router();

const normalizeSearch = (value) => (typeof value === 'string' ? value.trim() : '');

const parsePagination = (page = 1, limit = 20, maxLimit = 50) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(parseInt(limit, 10) || 20, maxLimit);
  const skip = (currentPage - 1) * safeLimit;
  return { currentPage, limit: safeLimit, skip };
};

const inquiryInclude = {
  property: {
    select: {
      id: true,
      title: true,
      type: true,
      price: true,
      currency: true,
      location: true,
      images: true,
    },
  },
  user: { select: { id: true, name: true, email: true, phone: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
};

const leadInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
};

const buildInquiryWhere = ({ status, priority, search, archived }) => {
  const where = {};

  if (archived === 'true') {
    where.isArchived = true;
  } else {
    where.isArchived = { not: true };
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  const searchTerm = normalizeSearch(search);
  if (searchTerm) {
    where.OR = [
      {
        contactInfo: {
          path: ['name'],
          string_contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        contactInfo: {
          path: ['email'],
          string_contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        message: { contains: searchTerm, mode: 'insensitive' },
      },
    ];
  }

  return where;
};

const buildLeadWhere = ({ status, priority, search, archived }) => {
  const where = {};
  const archiveFilter =
    archived === 'true'
      ? { OR: [{ isArchived: true }, { archivedAt: { not: null } }] }
      : { isArchived: { not: true } };

  if (archiveFilter.OR) {
    where.OR = archiveFilter.OR;
  } else {
    where.isArchived = archiveFilter.isArchived;
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  const searchTerm = normalizeSearch(search);
  if (searchTerm) {
    const searchCondition = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (where.OR) {
      where.AND = [{ OR: where.OR }, searchCondition];
      delete where.OR;
    } else if (where.AND) {
      where.AND.push(searchCondition);
    } else {
      Object.assign(where, searchCondition);
    }
  }

  return where;
};

const appendNote = (existingNotes, note) => {
  const safeNotes = Array.isArray(existingNotes) ? existingNotes : [];
  return [...safeNotes, { ...note, createdAt: new Date().toISOString() }];
};

// Cache invalidation endpoint
router.post('/cache/clear', (req, res) => {
  try {
    cache.clear();
    res.json({ 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ message: 'Failed to clear cache' });
  }
});

// @route   POST /api/inquiries/lead
// @desc    Create lead from landing page form
// @access  Public
router.post('/lead', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('requiredService').isIn(['buy', 'sell', 'rent']).withMessage('Invalid required service'),
  body('propertyType').isIn(['villa', 'twin-villa', 'duplex', 'apartment', 'land', 'commercial']).withMessage('Invalid property type'),
  body('purpose').isIn(['investment', 'personal-use']).withMessage('Invalid purpose')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const existingLead = await prisma.lead.findFirst({
      where: { email: req.body.email.trim().toLowerCase() },
    });
    if (existingLead) {
      return res.status(400).json({ message: 'Lead already exists with this email' });
    }

    const propertyTypeKey = req.body.propertyType?.toUpperCase()?.replace(/-/g, '_');
    const propertyTypeEnum = Prisma.PropertyType?.[propertyTypeKey];

    if (!propertyTypeEnum) {
      return res.status(400).json({ message: 'Invalid property type selection' });
    }

    const lead = await prisma.lead.create({
      data: {
        name: req.body.name,
        email: req.body.email.trim().toLowerCase(),
        phone: req.body.phone,
        requiredService: req.body.requiredService,
        propertyType: propertyTypeEnum,
        purpose: req.body.purpose,
        budget: req.body.budget || null,
        preferredLocation: req.body.preferredLocation || [],
        location: req.body.location || null,
        timeline: req.body.timeline || 'flexible',
        status: 'new',
        priority: req.body.priority || 'medium',
        source: 'landing-page',
        notes: req.body.notes || [],
      },
    });

    res.status(201).json({
      message: 'Lead created successfully',
      lead
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ message: 'Server error while creating lead' });
  }
});

// @route   GET /api/inquiries
// @desc    Get all inquiries (Admin only)
// @access  Private (Admin only)
router.get('/', authMiddleware, adminMiddleware, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['new', 'contacted', 'viewing-scheduled', 'follow-up', 'closed', 'converted']),
  query('priority').optional().isIn(['low', 'medium', 'high'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const { currentPage, limit: take, skip } = parsePagination(page, limit, 50);
    const where = buildInquiryWhere(req.query);

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: inquiryInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.inquiry.count({ where }),
    ]);

    res.json({
      inquiries,
      pagination: {
        currentPage,
        totalPages: Math.max(1, Math.ceil(total / take)),
        totalInquiries: total
      }
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ message: 'Server error while fetching inquiries' });
  }
});

// @route   GET /api/inquiries/leads
// @desc    Get all leads (Admin only)
// @access  Private (Admin only)
router.get('/leads', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { currentPage, limit: take, skip } = parsePagination(page, limit, 50);
    const where = buildLeadWhere(req.query);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: {
        currentPage,
        totalPages: Math.max(1, Math.ceil(total / take)),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ message: 'Server error while fetching leads' });
  }
});

// @route   GET /api/inquiries/lead/:id
// @desc    Get single lead
// @access  Private (Admin only)
router.get('/lead/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: leadInclude,
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({
      lead
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ message: 'Server error while fetching lead' });
  }
});

// @route   GET /api/inquiries/:id
// @desc    Get single inquiry
// @access  Private (Admin only)
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: inquiryInclude,
    });

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    let inquiryResponse = inquiry;
    if (!inquiry.isRead) {
      await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: { isRead: true },
      });
      inquiryResponse = { ...inquiry, isRead: true };
    }

    res.json({ inquiry: inquiryResponse });
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({ message: 'Server error while fetching inquiry' });
  }
});

// @route   PUT /api/inquiries/:id
// @desc    Update inquiry
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, [
  body('status').optional().isIn(['new', 'contacted', 'viewing-scheduled', 'follow-up', 'closed', 'converted']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('assignedTo').optional().isString().isLength({ min: 8 }).withMessage('Invalid assigned user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const existing = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    const data = {};
    if (req.body.status) data.status = req.body.status;
    if (req.body.priority) data.priority = req.body.priority;
    if (req.body.assignedTo !== undefined) {
      data.assignedToId = req.body.assignedTo || null;
    }

    const inquiry = await prisma.inquiry.update({
      where: { id: req.params.id },
      data,
      include: inquiryInclude,
    });

    res.json({
      message: 'Inquiry updated successfully',
      inquiry,
    });
  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({ message: 'Server error while updating inquiry' });
  }
});

// @route   DELETE /api/inquiries/:id
// @desc    Delete inquiry
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const existing = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    await prisma.inquiry.delete({ where: { id: req.params.id } });

    res.json({
      message: 'Inquiry deleted successfully'
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ message: 'Server error while deleting inquiry' });
  }
});

// @route   POST /api/inquiries/:id/archive
// @desc    Archive inquiry
// @access  Private (Admin only)
router.post('/:id/archive', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    res.json({ message: 'Inquiry archived successfully' });
  } catch (error) {
    console.error('Archive inquiry error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Inquiry not found' });
    }
    res.status(500).json({ message: 'Server error while archiving inquiry' });
  }
});

// @route   POST /api/inquiries/:id/restore
// @desc    Restore inquiry
// @access  Private (Admin only)
router.post('/:id/restore', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { isArchived: false, archivedAt: null },
    });

    res.json({ message: 'Inquiry restored successfully' });
  } catch (error) {
    console.error('Restore inquiry error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Inquiry not found' });
    }
    res.status(500).json({ message: 'Server error while restoring inquiry' });
  }
});

// @route   POST /api/inquiries/:id/notes
// @desc    Add note to inquiry
// @access  Private (Admin only)
router.post('/:id/notes', authMiddleware, adminMiddleware, [
  body('note').trim().isLength({ min: 1, max: 500 }).withMessage('Note must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const inquiryRecord = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      select: { notes: true },
    });

    if (!inquiryRecord) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    const notes = appendNote(inquiryRecord.notes, {
      note: req.body.note,
      createdBy: req.user.id,
    });

    const inquiry = await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { notes },
      include: inquiryInclude,
    });

    res.json({
      message: 'Note added successfully',
      inquiry
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Server error while adding note' });
  }
});

// @route   PUT /api/inquiries/lead/:id
// @desc    Update lead status
// @access  Private (Admin only)
router.put('/lead/:id', authMiddleware, adminMiddleware, [
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'proposal-sent', 'negotiating', 'closed', 'lost']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('assignedTo').optional().isString().isLength({ min: 8 }).withMessage('Invalid assigned user ID'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leadRecord = await prisma.lead.findUnique({
      where: { id: req.params.id },
      select: { notes: true, status: true },
    });
    if (!leadRecord) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const data = {};
    let nextNotes = leadRecord.notes;
    if (req.body.status) {
      data.status = req.body.status;
      data.lastContactDate = new Date();
      if (req.body.notes && req.body.status !== leadRecord.status) {
        nextNotes = appendNote(leadRecord.notes, {
          note: req.body.notes,
          createdBy: req.user.id,
        });
        data.notes = nextNotes;
      }
    }
    if (req.body.priority) data.priority = req.body.priority;
    if (req.body.assignedTo !== undefined) {
      data.assignedToId = req.body.assignedTo || null;
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data,
      include: leadInclude,
    });

    res.json({
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ message: 'Server error while updating lead' });
  }
});

// @route   DELETE /api/inquiries/lead/:id
// @desc    Delete lead
// @access  Private (Admin only)
router.delete('/lead/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    await prisma.lead.delete({ where: { id: req.params.id } });

    res.json({
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ message: 'Server error while deleting lead' });
  }
});

// @route   POST /api/inquiries/lead/:id/notes
// @desc    Add note to lead
// @access  Private (Admin only)
router.post('/lead/:id/notes', authMiddleware, adminMiddleware, [
  body('note').trim().isLength({ min: 1, max: 500 }).withMessage('Note must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leadRecord = await prisma.lead.findUnique({
      where: { id: req.params.id },
      select: { notes: true },
    });

    if (!leadRecord) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const notes = appendNote(leadRecord.notes, {
      note: req.body.note,
      createdBy: req.user.id,
    });

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { notes },
      include: leadInclude,
    });

    res.json({
      message: 'Note added successfully',
      lead
    });
  } catch (error) {
    console.error('Add lead note error:', error);
    res.status(500).json({ message: 'Server error while adding note' });
  }
});

// @route   POST /api/inquiries/lead/:id/archive
// @desc    Archive lead
// @access  Private (Admin only)
router.post('/lead/:id/archive', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.lead.update({
      where: { id: req.params.id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    res.json({ message: 'Lead archived successfully' });
  } catch (error) {
    console.error('Archive lead error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.status(500).json({ message: 'Server error while archiving lead' });
  }
});

// @route   POST /api/inquiries/lead/:id/restore
// @desc    Restore lead
// @access  Private (Admin only)
router.post('/lead/:id/restore', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.lead.update({
      where: { id: req.params.id },
      data: { isArchived: false, archivedAt: null },
    });

    res.json({ message: 'Lead restored successfully' });
  } catch (error) {
    console.error('Restore lead error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.status(500).json({ message: 'Server error while restoring lead' });
  }
});

// @route   GET /api/inquiries/stats/overview
// @desc    Get inquiry statistics
// @access  Private (Admin only)
router.get('/stats/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [
      totalInquiries,
      newInquiries,
      contactedInquiries,
      convertedInquiries,
      highPriorityInquiries,
      monthlyStatsRaw,
      statusStatsRaw,
    ] = await Promise.all([
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { status: 'new' } }),
      prisma.inquiry.count({ where: { status: 'contacted' } }),
      prisma.inquiry.count({ where: { status: 'converted' } }),
      prisma.inquiry.count({ where: { priority: 'high' } }),
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "createdAt") AS month_trunc,
          EXTRACT(YEAR FROM "createdAt")::int AS year,
          EXTRACT(MONTH FROM "createdAt")::int AS month,
          COUNT(*)::int AS count
        FROM "Inquiry"
        GROUP BY month_trunc, year, month
        ORDER BY month_trunc DESC
        LIMIT 12;
      `,
      prisma.inquiry.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const overview = {
      totalInquiries,
      newInquiries,
      contactedInquiries,
      convertedInquiries,
      highPriorityInquiries,
    };

    const monthlyStats = monthlyStatsRaw
      .map((row) => ({
        _id: { year: row.year, month: row.month },
        count: Number(row.count),
      }))
      .sort(
        (a, b) =>
          a._id.year - b._id.year || a._id.month - b._id.month
      );

    const statusStats = statusStatsRaw.map((item) => ({
      _id: item.status,
      count: item._count._all,
    }));

    res.json({
      overview,
      monthlyStats,
      statusStats
    });
  } catch (error) {
    console.error('Get inquiry stats error:', error);
    res.status(500).json({ message: 'Server error while fetching inquiry statistics' });
  }
});

module.exports = router;
