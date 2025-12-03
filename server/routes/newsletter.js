const express = require('express');
const { body, validationResult, query } = require('express-validator');
const ExcelJS = require('exceljs');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const normalizeEmail = (email = '') => email.trim().toLowerCase();

// Serialization helpers for frontend compatibility
const serializeSubscription = (subscription) => {
  if (!subscription) return null;
  return {
    ...subscription,
    _id: subscription.id, // Add legacy _id for frontend compatibility
    source: subscription.source?.toLowerCase() || subscription.source,
    userId: subscription.user || subscription.userId,
  };
};

const serializeSubscriptionCollection = (subscriptions) => {
  return subscriptions.map(serializeSubscription);
};

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter (public endpoint)
// @access  Public
router.post('/subscribe', [
  body('email').isEmail().withMessage('Please provide a valid email'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const normalizedEmail = normalizeEmail(req.body.email);

    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      const updated = await prisma.newsletterSubscription.update({
        where: { email: normalizedEmail },
        data: {
          isActive: true,
          subscribedAt: new Date(),
          unsubscribedAt: null,
          source: Prisma.NewsletterSource.FOOTER,
        },
      });

      return res.status(200).json({
        message: 'Successfully subscribed to newsletter',
        subscription: serializeSubscription(updated),
      });
    }

    const subscription = await prisma.newsletterSubscription.create({
      data: {
        email: normalizedEmail,
        source: Prisma.NewsletterSource.FOOTER,
        isActive: true,
      },
    });

    res.status(201).json({
      message: 'Successfully subscribed to newsletter',
      subscription: serializeSubscription(subscription),
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ message: 'Server error while subscribing to newsletter' });
  }
});

// @route   GET /api/admin/newsletter-subscriptions
// @desc    Get all newsletter subscriptions (Admin only)
// @access  Private (Admin only)
router.get('/admin/newsletter-subscriptions', authMiddleware, adminMiddleware, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { page = 1, limit = 50, search, source } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where = { isActive: true };

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    if (source && ['footer', 'registration'].includes(source)) {
      const normalizedSource = source.toLowerCase() === 'registration' ? 'REGISTRATION' : 'FOOTER';
      where.source = Prisma.NewsletterSource[normalizedSource];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.newsletterSubscription.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.newsletterSubscription.count({ where }),
    ]);

    res.json({
      subscriptions: serializeSubscriptionCollection(subscriptions),
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalItems: total,
        itemsPerPage: limitNumber,
      },
    });
  } catch (error) {
    console.error('Get newsletter subscriptions error:', error);
    res.status(500).json({ message: 'Server error while fetching newsletter subscriptions' });
  }
});

// @route   GET /api/admin/newsletter-subscriptions/export
// @desc    Export newsletter subscriptions to Excel (Admin only)
// @access  Private (Admin only)
router.get('/admin/newsletter-subscriptions/export', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const subscriptions = await prisma.newsletterSubscription.findMany({
      where: { isActive: true },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { subscribedAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Newsletter Subscriptions');

    worksheet.columns = [
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Subscribed At', key: 'subscribedAt', width: 20 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'User Name', key: 'userName', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    subscriptions.forEach((subscription) => {
      const subscribedDate = subscription.subscribedAt
        ? new Date(subscription.subscribedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'N/A';

      worksheet.addRow({
        email: subscription.email,
        subscribedAt: subscribedDate,
        source: subscription.source.charAt(0).toUpperCase() + subscription.source.slice(1),
        userName: subscription.user?.name || 'N/A',
        status: subscription.isActive ? 'Active' : 'Inactive',
      });
    });

    const filename = `newsletter-subscriptions-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export newsletter subscriptions error:', error);
    res.status(500).json({ message: 'Server error while exporting newsletter subscriptions' });
  }
});

module.exports = router;

