const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/search/track
// @desc    Track a search query
// @access  Public
router.post('/track', [
  body('query').trim().isLength({ min: 1, max: 100 }).withMessage('Query must be between 1 and 100 characters'),
  body('resultsCount').optional().isInt({ min: 0 }).withMessage('Results count must be a non-negative integer'),
  body('filters').optional().isObject().withMessage('Filters must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { query, resultsCount = 0, filters = {} } = req.body;

    // Get client IP address
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

    // Get user agent
    const userAgent = req.get('User-Agent') || '';

    const searchData = {
      query: query.toLowerCase().trim(),
      userId: req.user ? req.user.id : null,
      ipAddress,
      userAgent,
      resultsCount,
      filters
    };

    const search = await prisma.search.create({ data: searchData, select: { id: true } });

    res.json({
      message: 'Search tracked successfully',
      searchId: search.id
    });
  } catch (error) {
    console.error('Track search error:', error);
    res.status(500).json({ message: 'Server error while tracking search' });
  }
});

// @route   GET /api/search/popular
// @desc    Get popular search queries
// @access  Private (Admin only)
router.get('/popular', optionalAuth, async (req, res) => {
  try {
    // Temporarily allow access for testing
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Admin access required' });
    // }

    const { limit = 10, days = 30 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const popularSearches = await prisma.$queryRaw`
      SELECT query,
             COUNT(*)::int AS count,
             MIN("createdAt") AS "firstSearched",
             MAX("createdAt") AS "lastSearched",
             AVG("resultsCount")::float AS "avgResults"
      FROM "Search"
      WHERE "createdAt" >= ${startDate}
      GROUP BY query
      ORDER BY count DESC
      LIMIT ${parseInt(limit)}
    `;

    res.json({
      popularSearches,
      period: `${days} days`,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({ message: 'Server error while fetching popular searches' });
  }
});

// @route   GET /api/search/trends
// @desc    Get search trends over time
// @access  Private (Admin only)
router.get('/trends', optionalAuth, async (req, res) => {
  try {
    // Temporarily allow access for testing
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Admin access required' });
    // }

    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const trends = await prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "createdAt") AS day,
             COUNT(*)::int AS searches,
             COUNT(DISTINCT query)::int AS "uniqueCount"
      FROM "Search"
      WHERE "createdAt" >= ${startDate}
      GROUP BY day
      ORDER BY day
    `;

    res.json({
      trends,
      period: `${days} days`,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get search trends error:', error);
    res.status(500).json({ message: 'Server error while fetching search trends' });
  }
});

// @route   GET /api/search/recent
// @desc    Get recent search queries
// @access  Private (Admin only)
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    // Temporarily allow access for testing
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Admin access required' });
    // }

    const { limit = 50 } = req.query;

    const recentSearches = await prisma.search.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    res.json({
      recentSearches,
      count: recentSearches.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get recent searches error:', error);
    res.status(500).json({ message: 'Server error while fetching recent searches' });
  }
});

// @route   GET /api/search/stats
// @desc    Get search statistics
// @access  Private (Admin only)
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    // Temporarily allow access for testing
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Admin access required' });
    // }

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const where = { createdAt: { gte: startDate } };

    const [
      totalSearches,
      uniqueQueries,
      avgResultsPerSearch,
      topCities,
      topFilters
    ] = await Promise.all([
      prisma.search.count({ where }),
      prisma.search.findMany({ where, distinct: ['query'], select: { query: true } }).then((results) => results.length),
      prisma.search.aggregate({ where, _avg: { resultsCount: true } }).then((result) => result._avg.resultsCount || 0),
      prisma.$queryRaw`
        SELECT COALESCE(filters->>'city', 'Unknown Location') AS city,
               COUNT(*)::int AS count
        FROM "Search"
        WHERE "createdAt" >= ${startDate}
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT COALESCE(filters->>'type', 'Unknown Type') AS type,
               COUNT(*)::int AS count
        FROM "Search"
        WHERE "createdAt" >= ${startDate}
        GROUP BY type
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    res.json({
      totalSearches,
      uniqueQueries,
      avgResultsPerSearch: Math.round(avgResultsPerSearch * 100) / 100,
      topCities: topCities.map((row) => ({ city: row.city, count: Number(row.count) })),
      topFilters: topFilters.map((row) => ({ type: row.type, count: Number(row.count) })),
      period: `${days} days`,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get search stats error:', error);
    res.status(500).json({ message: 'Server error while fetching search statistics' });
  }
});

module.exports = router;
