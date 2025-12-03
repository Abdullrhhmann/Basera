const express = require('express');
const prisma = require('../prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { getUserHierarchy } = require('../utils/permissions');

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get comprehensive dashboard statistics
// @access  Private (Admin type users)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const userHierarchy = getUserHierarchy(req.user);
    const restrictToCreator = userHierarchy >= 4;
    const includeOrgStats = userHierarchy < 4;
    const propertyWhere = {
      isActive: true,
      isArchived: { not: true },
      ...(restrictToCreator ? { createdById: req.user.id } : {}),
    };

    const createdAtRange = (start, end) => {
      if (start && end) {
        return { gte: start, lt: end };
      }
      if (start) {
        return { gte: start };
      }
      return undefined;
    };

    const propertyCountInRange = (start, end) =>
      prisma.property.count({
        where: {
          ...propertyWhere,
          ...(start ? { createdAt: createdAtRange(start, end) } : {}),
        },
      });

    const userCountInRange = (start, end) =>
      includeOrgStats
        ? prisma.user.count({
            where: {
              isActive: true,
              ...(start ? { createdAt: createdAtRange(start, end) } : {}),
            },
          })
        : Promise.resolve(0);

    const inquiryCountInRange = (start, end) =>
      includeOrgStats
        ? prisma.inquiry.count({
            where: {
              isArchived: { not: true },
              ...(start ? { createdAt: createdAtRange(start, end) } : {}),
            },
          })
        : Promise.resolve(0);

    const leadCountInRange = (start, end) =>
      includeOrgStats
        ? prisma.lead.count({
            where: start ? { createdAt: createdAtRange(start, end) } : undefined,
          })
        : Promise.resolve(0);

    const [
      totalProperties,
      totalUsers,
      totalInquiries,
      totalLeads,
      propertiesToday,
      usersToday,
      inquiriesToday,
      leadsToday,
      propertiesThisWeek,
      usersThisWeek,
      inquiriesThisWeek,
      leadsThisWeek,
      propertiesLastMonth,
      usersLastMonth,
      inquiriesLastMonth,
      leadsLastMonth,
      propertiesTwoMonthsAgo,
      usersTwoMonthsAgo,
      inquiriesTwoMonthsAgo,
      leadsTwoMonthsAgo,
    ] = await Promise.all([
      prisma.property.count({ where: propertyWhere }),
      includeOrgStats ? prisma.user.count({ where: { isActive: true } }) : Promise.resolve(0),
      includeOrgStats
        ? prisma.inquiry.count({ where: { isArchived: { not: true } } })
        : Promise.resolve(0),
      includeOrgStats ? prisma.lead.count() : Promise.resolve(0),

      propertyCountInRange(oneDayAgo),
      userCountInRange(oneDayAgo),
      inquiryCountInRange(oneDayAgo),
      leadCountInRange(oneDayAgo),

      propertyCountInRange(oneWeekAgo),
      userCountInRange(oneWeekAgo),
      inquiryCountInRange(oneWeekAgo),
      leadCountInRange(oneWeekAgo),

      propertyCountInRange(oneMonthAgo, oneWeekAgo),
      userCountInRange(oneMonthAgo, oneWeekAgo),
      inquiryCountInRange(oneMonthAgo, oneWeekAgo),
      leadCountInRange(oneMonthAgo, oneWeekAgo),

      propertyCountInRange(twoMonthsAgo, oneMonthAgo),
      userCountInRange(twoMonthsAgo, oneMonthAgo),
      inquiryCountInRange(twoMonthsAgo, oneMonthAgo),
      leadCountInRange(twoMonthsAgo, oneMonthAgo),
    ]);

    // Calculate percentage changes
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Properties trend (comparing this week to last month)
    const propertiesTrend = calculatePercentageChange(propertiesThisWeek, propertiesLastMonth);
    
    // Users trend (comparing this week to last month)
    const usersTrend = calculatePercentageChange(usersThisWeek, usersLastMonth);
    
    // Inquiries trend (comparing this week to last month)
    const inquiriesTrend = calculatePercentageChange(inquiriesThisWeek, inquiriesLastMonth);
    
    // Leads trend (comparing this week to last month)
    const leadsTrend = calculatePercentageChange(leadsThisWeek, leadsLastMonth);

    // Get additional statistics
    const [
      propertiesByStatusRaw,
      propertiesByTypeRaw,
      usersByRoleRaw,
      inquiriesByStatusRaw,
      propertyFinancials,
      recentProperties,
    ] = await Promise.all([
      prisma.property.groupBy({
        by: ['status'],
        where: propertyWhere,
        _count: { _all: true },
      }),
      prisma.property.groupBy({
        by: ['type'],
        where: propertyWhere,
        _count: { _all: true },
      }),
      includeOrgStats
        ? prisma.user.groupBy({
            by: ['role'],
            where: { isActive: true },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      includeOrgStats
        ? prisma.inquiry.groupBy({
            by: ['status'],
            where: { isArchived: { not: true } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      prisma.property.aggregate({
        where: propertyWhere,
        _sum: { price: true },
        _avg: { price: true },
      }),
      prisma.property.findMany({
        where: {
          ...propertyWhere,
          createdAt: { gte: oneWeekAgo },
        },
        select: { createdAt: true },
      }),
    ]);

    // Format weekly data for chart
    const chartData = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weeklyCountMap = recentProperties.reduce((acc, record) => {
      const key = record.createdAt.toISOString().split('T')[0];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      chartData.push({
        label: dayName,
        value: weeklyCountMap[dateStr] || 0,
      });
    }

    // Calculate revenue trend (comparing this month to last month)
    const [currentRevenueAggregate, previousRevenueAggregate] = await Promise.all([
      prisma.property.aggregate({
        where: {
          ...propertyWhere,
          createdAt: { gte: oneMonthAgo },
        },
        _sum: { price: true },
      }),
      prisma.property.aggregate({
        where: {
          ...propertyWhere,
          createdAt: { gte: twoMonthsAgo, lt: oneMonthAgo },
        },
        _sum: { price: true },
      }),
    ]);

    const currentRevenue = Number(currentRevenueAggregate._sum.price || 0);
    const previousRevenue = Number(previousRevenueAggregate._sum.price || 0);
    const revenueTrend = calculatePercentageChange(currentRevenue, previousRevenue);

    const normalizeKey = (value, mapFn = (val) => val) =>
      mapFn(value ?? '').toString().toLowerCase().replace(/_/g, '-');

    const propertiesByStatus = propertiesByStatusRaw.reduce((acc, item) => {
      const key = normalizeKey(item.status);
      acc[key] = item._count._all;
      return acc;
    }, {});

    const propertiesByType = propertiesByTypeRaw.reduce((acc, item) => {
      const key = normalizeKey(item.type);
      acc[key] = item._count._all;
      return acc;
    }, {});

    const usersByRole = usersByRoleRaw.reduce((acc, item) => {
      const key = normalizeKey(item.role);
      acc[key] = item._count._all;
      return acc;
    }, {});

    const inquiriesByStatus = inquiriesByStatusRaw.reduce((acc, item) => {
      const key = normalizeKey(item.status, (val) => val || 'unknown');
      acc[key] = item._count._all;
      return acc;
    }, {});

    res.json({
      stats: {
        properties: {
          total: totalProperties,
          today: propertiesToday,
          thisWeek: propertiesThisWeek,
          trend: propertiesTrend,
          byStatus: propertiesByStatus,
          byType: propertiesByType,
        },
        users: {
          total: totalUsers,
          today: usersToday,
          thisWeek: usersThisWeek,
          trend: usersTrend,
          byRole: usersByRole,
        },
        inquiries: {
          total: totalInquiries,
          today: inquiriesToday,
          thisWeek: inquiriesThisWeek,
          trend: inquiriesTrend,
          byStatus: inquiriesByStatus,
        },
        leads: {
          total: totalLeads,
          today: leadsToday,
          thisWeek: leadsThisWeek,
          trend: leadsTrend
        },
        revenue: {
          total: Number(propertyFinancials._sum.price || 0),
          average: Number(propertyFinancials._avg.price || 0),
          trend: revenueTrend
        },
        chartData
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard statistics' });
  }
});

module.exports = router;
