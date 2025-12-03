const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authMiddleware, hierarchyMiddleware } = require('../middleware/auth');
const { canManageUser, getUserHierarchy } = require('../utils/permissions');
const {
  buildPermissionsForRole,
  getHierarchyForRole,
  ACTIVITY_STATS_DEFAULT,
  toPrismaUserRole,
  normalizeUserRoleForClient,
} = require('../utils/userRoleUtils');

const router = express.Router();

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const toBoolean = (value) => value === true || value === 'true';

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safe } = user;
  return normalizeUserRoleForClient(safe);
};

const upsertNewsletterSubscription = async (userId, email) => {
  const normalizedEmail = normalizeEmail(email);
  const { Prisma } = require('../prisma/generated');
  
  const existingSubscription = await prisma.newsletterSubscription.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingSubscription) {
    await prisma.newsletterSubscription.update({
      where: { email: normalizedEmail },
      data: {
        userId,
        source: Prisma.NewsletterSource.REGISTRATION,
        isActive: true,
        subscribedAt: new Date(),
        unsubscribedAt: null,
      },
    });
    return;
  }

  await prisma.newsletterSubscription.create({
    data: {
      email: normalizedEmail,
      source: Prisma.NewsletterSource.REGISTRATION,
      userId,
      isActive: true,
    },
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, phone, password, subscribeToNewsletter = false } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const role = 'user';
    const prismaRole = toPrismaUserRole(role);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: prismaRole,
        hierarchy: getHierarchyForRole(role),
        permissions: buildPermissionsForRole(role),
        subscribeToNewsletter: toBoolean(subscribeToNewsletter),
        activityStats: ACTIVITY_STATS_DEFAULT,
      },
    });

    if (toBoolean(subscribeToNewsletter)) {
      try {
        await upsertNewsletterSubscription(user.id, normalizedEmail);
      } catch (subscriptionError) {
        console.error('Newsletter subscription error during registration:', subscriptionError);
      }
    }

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken(user.id);
    res.json({
      message: 'Login successful',
      token,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/admin-register
// @desc    Register a new admin (protected route)
// @access  Private (Admin only)
router.post('/admin-register', authMiddleware, hierarchyMiddleware(1), [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['admin', 'sales_manager', 'sales_team_leader', 'sales_agent']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, phone, password, role = 'sales_agent' } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const targetHierarchy = getHierarchyForRole(role);
    const creatorHierarchy = getUserHierarchy(req.user);
    if (targetHierarchy < creatorHierarchy) {
      return res.status(403).json({ message: 'Cannot create user with higher authority level than yourself' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const prismaRole = toPrismaUserRole(role);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: prismaRole,
        hierarchy: targetHierarchy,
        permissions: buildPermissionsForRole(role),
        createdById: req.user.id,
        activityStats: ACTIVITY_STATS_DEFAULT,
      },
    });

    res.status(201).json({
      message: `${role === 'admin' ? 'Admin' : 'User'} registered successfully`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error during admin registration' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({ user: sanitizeUser(req.user) });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, phone, preferences } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (preferences !== undefined) updateData.preferences = preferences;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authMiddleware, [
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
});

module.exports = router;
