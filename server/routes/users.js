const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const { authMiddleware, hierarchyMiddleware } = require('../middleware/auth');
const { canManageUser, getUserHierarchy, isAdminRole } = require('../utils/permissions');
const {
  buildPermissionsForRole,
  getHierarchyForRole,
  ACTIVITY_STATS_DEFAULT,
  toPrismaUserRole,
  normalizeUserRoleForClient,
} = require('../utils/userRoleUtils');

// Simple in-memory cache for better performance
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const router = express.Router();

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

// @route   GET /api/users/admins
// @desc    Get all admin-type users (Admin only)
// @access  Private (Admin only)
router.get('/admins', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const roles = ['admin', 'sales_manager', 'sales_team_leader', 'sales_agent'];
    const prismaRoles = roles.map((roleName) => toPrismaUserRole(roleName));

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: prismaRoles } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          hierarchy: true,
          permissions: true,
          isActive: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: [{ hierarchy: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limitNumber,
      }),
      prisma.user.count({ where: { role: { in: prismaRoles } } }),
    ]);

    const formattedUsers = users.map((user) => normalizeUserRoleForClient({ ...user }));

    res.json({
      users: formattedUsers,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalUsers: total,
      },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Server error while fetching admin users' });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin only)
router.get('/', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where = {};
    if (role) {
      where.role = toPrismaUserRole(role);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          hierarchy: true,
          permissions: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((user) => normalizeUserRoleForClient({ ...user }));

    res.json({
      users: formattedUsers,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalUsers: total,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private (Admin only)
router.post('/', authMiddleware, hierarchyMiddleware(1), [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['user', 'admin', 'sales_manager', 'sales_team_leader', 'sales_agent']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, phone, password, role = 'user', isActive = true } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    if (isAdminRole({ role })) {
      const targetHierarchy = getHierarchyForRole(role);
      const creatorHierarchy = getUserHierarchy(req.user);
      if (targetHierarchy < creatorHierarchy) {
        return res.status(403).json({ message: 'Cannot create user with higher authority level than yourself' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const hierarchy = getHierarchyForRole(role);
    const permissions = buildPermissionsForRole(role);
    const prismaRole = toPrismaUserRole(role);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: prismaRole,
        isActive,
        hierarchy,
        permissions,
        createdById: req.user.id,
        activityStats: ACTIVITY_STATS_DEFAULT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        hierarchy: true,
        permissions: true,
        isActive: true,
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      user: normalizeUserRoleForClient({ ...user }),
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error while creating user' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/:id', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        hierarchy: true,
        permissions: true,
        preferences: true,
        isActive: true,
        activityStats: true,
        propertyViews: {
          include: { property: { select: { id: true, title: true, type: true, price: true, location: true } } },
        },
        favoriteProperties: {
          include: { property: { select: { id: true, title: true, type: true, price: true, location: true } } },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.params.id !== req.user.id) {
      try {
        await prisma.user.update({
          where: { id: req.params.id },
          data: {
            activityStats: {
              ...user.activityStats,
              profileViews: (user.activityStats?.profileViews || 0) + 1,
            },
          },
        });
      } catch (viewError) {
        console.error('Error tracking profile view:', viewError);
      }
    }

    // Serialize nested properties to add _id for frontend compatibility
    const serializedUser = {
      ...user,
      propertyViews: user.propertyViews?.map(view => ({
        ...view,
        property: view.property ? { ...view.property, _id: view.property.id } : null,
      })) || [],
      favoriteProperties: user.favoriteProperties?.map(fav => ({
        ...fav,
        property: fav.property ? { ...fav.property, _id: fav.property.id } : null,
      })) || [],
    };

    res.json({ user: serializedUser });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', authMiddleware, hierarchyMiddleware(1), [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('role').optional().isIn(['user', 'admin', 'sales_manager', 'sales_team_leader', 'sales_agent']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!canManageUser(req.user, user) && req.params.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot modify user with equal or higher authority level' });
    }

    if (req.params.id === req.user.id && req.body.isActive === false) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const updateData = { ...req.body };

    if (req.body.role) {
      if (req.body.role !== user.role) {
        const newUserHierarchy = getHierarchyForRole(req.body.role);
        const currentUserHierarchy = getUserHierarchy(req.user);

        if (newUserHierarchy <= currentUserHierarchy) {
          return res.status(403).json({ message: 'Cannot assign role with equal or higher authority level than yourself' });
        }

        updateData.hierarchy = newUserHierarchy;
        updateData.permissions = buildPermissionsForRole(req.body.role);
      }

      updateData.role = toPrismaUserRole(req.body.role);
    }

    if (req.body.email) {
      updateData.email = req.body.email.trim().toLowerCase();
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        hierarchy: true,
        permissions: true,
        isActive: true,
      },
    });

    res.json({
      message: 'User updated successfully',
      user: normalizeUserRoleForClient({ ...updated }),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user and reassign their records to requesting admin
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: 'Cannot delete user with equal or higher authority level' });
    }

    // Use transaction to reassign all related records before deleting
    await prisma.$transaction(async (tx) => {
      // Reassign properties created by this user
      await tx.property.updateMany({
        where: { createdById: req.params.id },
        data: { createdById: req.user.id },
      });

      // Reassign properties submitted by this user
      await tx.property.updateMany({
        where: { submittedById: req.params.id },
        data: { submittedById: req.user.id },
      });

      // Reassign properties approved by this user
      await tx.property.updateMany({
        where: { approvedById: req.params.id },
        data: { approvedById: null },
      });

      // Reassign inquiries assigned to this user
      await tx.inquiry.updateMany({
        where: { assignedToId: req.params.id },
        data: { assignedToId: null },
      });

      // Delete user's own inquiries (or reassign userId to null)
      await tx.inquiry.updateMany({
        where: { userId: req.params.id },
        data: { userId: null },
      });

      // Reassign leads assigned to this user
      await tx.lead.updateMany({
        where: { assignedToId: req.params.id },
        data: { assignedToId: null },
      });

      // Reassign compounds created by this user
      await tx.compound.updateMany({
        where: { createdById: req.params.id },
        data: { createdById: req.user.id },
      });

      // Reassign compounds updated by this user
      await tx.compound.updateMany({
        where: { updatedById: req.params.id },
        data: { updatedById: null },
      });

      // Reassign blogs created by this user
      await tx.blog.updateMany({
        where: { createdById: req.params.id },
        data: { createdById: req.user.id },
      });

      // Reassign blogs updated by this user
      await tx.blog.updateMany({
        where: { updatedById: req.params.id },
        data: { updatedById: null },
      });

      // Reassign launches created by this user
      await tx.launch.updateMany({
        where: { createdById: req.params.id },
        data: { createdById: req.user.id },
      });

      // Reassign launches updated by this user
      await tx.launch.updateMany({
        where: { updatedById: req.params.id },
        data: { updatedById: null },
      });

      // Reassign videos created by this user
      await tx.video.updateMany({
        where: { createdById: req.params.id },
        data: { createdById: req.user.id },
      });

      // Reassign videos updated by this user
      await tx.video.updateMany({
        where: { updatedById: req.params.id },
        data: { updatedById: null },
      });

      // Reassign video playlists created by this user
      await tx.videoPlaylist.updateMany({
        where: { createdById: req.params.id },
        data: { createdById: req.user.id },
      });

      // Reassign video playlists updated by this user
      await tx.videoPlaylist.updateMany({
        where: { updatedById: req.params.id },
        data: { updatedById: null },
      });

      // Reassign job postings
      await tx.jobPosting.updateMany({
        where: { postedById: req.params.id },
        data: { postedById: req.user.id },
      });

      // Delete user's property views
      await tx.propertyView.deleteMany({
        where: { userId: req.params.id },
      });

      // Delete user's favorite properties
      await tx.userFavoriteProperty.deleteMany({
        where: { userId: req.params.id },
      });

      // Delete user's newsletter subscriptions
      await tx.newsletterSubscription.deleteMany({
        where: { userId: req.params.id },
      });

      // Delete user's conversations
      await tx.conversation.deleteMany({
        where: { userId: req.params.id },
      });

      // Delete user's searches
      await tx.search.deleteMany({
        where: { userId: req.params.id },
      });

      // Reassign users created by this user
      await tx.user.updateMany({
        where: { createdById: req.params.id },
        data: { createdById: null },
      });

      // Finally, delete the user
      await tx.user.delete({ where: { id: req.params.id } });
    });

    res.json({ message: 'User deleted successfully (associated records reassigned)' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

// @route   GET /api/users/me/favorites
// @desc    Get current user's favorite properties
// @access  Private
router.get('/me/favorites', authMiddleware, async (req, res) => {
  try {
    const favorites = await prisma.userFavoriteProperty.findMany({
      where: { userId: req.user.id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            type: true,
            status: true,
            location: true,
            images: true,
            isFeatured: true,
            specifications: true,
            developer: { select: { id: true, name: true, logo: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ favorites: favorites.map((fav) => fav.property) });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error while fetching favorites' });
  }
});

// @route   POST /api/users/me/favorites/:propertyId
// @desc    Add property to favorites
// @access  Private
router.post('/me/favorites/:propertyId', authMiddleware, async (req, res) => {
  try {
    const { propertyId } = req.params;

    const existing = await prisma.userFavoriteProperty.findUnique({
      where: {
        userId_propertyId: { userId: req.user.id, propertyId },
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Property already in favorites' });
    }

    await prisma.userFavoriteProperty.create({
      data: { userId: req.user.id, propertyId },
    });

    res.json({ message: 'Property added to favorites' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ message: 'Server error while adding favorite' });
  }
});

// @route   DELETE /api/users/me/favorites/:propertyId
// @desc    Remove property from favorites
// @access  Private
router.delete('/me/favorites/:propertyId', authMiddleware, async (req, res) => {
  try {
    const { propertyId } = req.params;
    await prisma.userFavoriteProperty.delete({
      where: {
        userId_propertyId: { userId: req.user.id, propertyId },
      },
    });

    res.json({ message: 'Property removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Server error while removing favorite' });
  }
});

// @route   GET /api/users/stats/overview
// @desc    Get user statistics
// @access  Private (Admin only)
router.get('/stats/overview', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const adminRoleValue = toPrismaUserRole('admin');
    const userRoleValue = toPrismaUserRole('user');

    const [totalUsers, activeUsers, adminUsers, regularUsers, monthlyStatsRaw] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: adminRoleValue } }),
      prisma.user.count({ where: { role: userRoleValue } }),
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*)::int AS count
        FROM "User"
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `,
    ]);

    const monthlyStats = monthlyStatsRaw
      .map((row) => ({
        month: row.month,
        count: Number(row.count),
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));

    res.json({
      overview: { totalUsers, activeUsers, adminUsers, regularUsers },
      monthlyStats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error while fetching user statistics' });
  }
});

module.exports = router;
