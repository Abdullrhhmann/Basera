const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware: auth, hierarchyMiddleware, adminMiddleware } = require('../middleware/auth');

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

const serializeLaunch = (launch) => {
  if (!launch) return launch;

  const formatted = {
    ...withLegacyId(launch),
    propertyType: humanizeEnumValue(launch.propertyType),
    status: humanizeEnumValue(launch.status),
    currency: launch.currency,
  };

  if (launch.createdBy) {
    formatted.createdBy = serializeUser(launch.createdBy);
  }
  if (launch.updatedBy) {
    formatted.updatedBy = serializeUser(launch.updatedBy);
  }

  return formatted;
};

const serializeLaunchCollection = (launches = []) => launches.map(serializeLaunch);

const parseNumberField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return num;
};

const toDecimal = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return new Prisma.Decimal(num);
};

const normalizeLaunchPayload = (payload = {}) => {
  const data = { ...payload };

  if (payload.propertyType !== undefined) {
    const propertyType = toEnumValue(Prisma.LaunchPropertyType, payload.propertyType);
    if (!propertyType) {
      throw new Error(`Invalid property type: ${payload.propertyType}`);
    }
    data.propertyType = propertyType;
  }

  if (payload.status !== undefined) {
    const status = toEnumValue(Prisma.LaunchStatus, payload.status);
    if (!status) {
      throw new Error(`Invalid launch status: ${payload.status}`);
    }
    data.status = status;
  }

  if (payload.currency !== undefined) {
    const currency = toEnumValue(Prisma.Currency, payload.currency);
    if (!currency) {
      throw new Error(`Invalid currency: ${payload.currency}`);
    }
    data.currency = currency;
  }

  if (payload.area !== undefined) {
    const areaValue = parseNumberField(payload.area, 'Area');
    if (areaValue !== undefined) {
      data.area = areaValue;
    } else {
      delete data.area;
    }
  }

  if (payload.bedrooms !== undefined) {
    const bedrooms = parseNumberField(payload.bedrooms, 'Bedrooms');
    if (bedrooms !== undefined) {
      data.bedrooms = bedrooms;
    } else {
      delete data.bedrooms;
    }
  }

  if (payload.bathrooms !== undefined) {
    const bathrooms = parseNumberField(payload.bathrooms, 'Bathrooms');
    if (bathrooms !== undefined) {
      data.bathrooms = bathrooms;
    } else {
      delete data.bathrooms;
    }
  }

  if (payload.isFeatured !== undefined) {
    data.isFeatured = Boolean(payload.isFeatured);
  }

  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }

  if (payload.features && !Array.isArray(payload.features)) {
    data.features = [].concat(payload.features);
  }

  if (payload.amenities && !Array.isArray(payload.amenities)) {
    data.amenities = [].concat(payload.amenities);
  }

  if (payload.images && !Array.isArray(payload.images)) {
    data.images = [].concat(payload.images);
  }

  if (payload.startingPrice !== undefined) {
    const priceDecimal = toDecimal(payload.startingPrice);
    if (priceDecimal !== null) {
      data.startingPrice = priceDecimal;
    } else {
      delete data.startingPrice;
    }
  }

  return data;
};

const parsePagination = (page = 1, limit = 10, maxLimit = 50) => {
  const current = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(parseInt(limit, 10) || 10, maxLimit);
  const skip = (current - 1) * safeLimit;
  return { current, limit: safeLimit, skip };
};

const launchInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
};

const buildLaunchWhere = (params, { isAdmin = false } = {}) => {
  const {
    status,
    propertyType,
    location,
    minPrice,
    maxPrice,
    featured,
    search,
    archived,
  } = params;

  const where = {};

  if (!isAdmin || archived !== 'true') {
    where.isActive = true;
  } else {
    where.isActive = false;
  }

  const statusEnum = toEnumValue(Prisma.LaunchStatus, status);
  if (statusEnum) {
    where.status = statusEnum;
  }

  const propertyTypeEnum = toEnumValue(Prisma.LaunchPropertyType, propertyType);
  if (propertyTypeEnum) {
    where.propertyType = propertyTypeEnum;
  }
  if (location) {
    where.location = { contains: location.trim(), mode: 'insensitive' };
  }
  const minPriceDecimal = toDecimal(minPrice);
  const maxPriceDecimal = toDecimal(maxPrice);
  if (minPriceDecimal) {
    where.startingPrice = {
      gte: minPriceDecimal,
      ...(where.startingPrice || {}),
    };
  }
  if (maxPriceDecimal) {
    where.startingPrice = {
      ...(where.startingPrice || {}),
      lte: maxPriceDecimal,
    };
  }
  if (featured === 'true') {
    where.isFeatured = true;
  }

  const term = typeof search === 'string' ? search.trim() : '';
  if (term) {
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { developer: { contains: term, mode: 'insensitive' } },
      { location: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  return where;
};

const buildSortOptions = (sortBy = 'launchDate', sortOrder = 'asc') => {
  const allowedFields = ['launchDate', 'createdAt', 'updatedAt', 'startingPrice'];
  const safeField = allowedFields.includes(sortBy) ? sortBy : 'launchDate';
  return { [safeField]: sortOrder === 'desc' ? 'desc' : 'asc' };
};

// Get all launches (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'launchDate', sortOrder = 'asc' } = req.query;
    const { current, limit: take, skip } = parsePagination(page, limit, 50);
    const where = buildLaunchWhere(req.query);
    const orderBy = buildSortOptions(sortBy, sortOrder);

    const [launches, total] = await Promise.all([
      prisma.launch.findMany({
        where,
        include: launchInclude,
        orderBy,
        skip,
        take,
      }),
      prisma.launch.count({ where }),
    ]);

    res.json({
      data: serializeLaunchCollection(launches),
      pagination: {
        current,
        pages: Math.max(1, Math.ceil(total / take)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching launches:', error);
    res.status(500).json({ message: 'Error fetching launches', error: error.message });
  }
});

// Get featured launches (public)
router.get('/featured', async (req, res) => {
  try {
    const launches = await prisma.launch.findMany({
      where: { isActive: true, isFeatured: true },
      include: launchInclude,
      orderBy: { launchDate: 'asc' },
      take: 6,
    });

    res.json({ data: serializeLaunchCollection(launches) });
  } catch (error) {
    console.error('Error fetching featured launches:', error);
    res.status(500).json({ message: 'Error fetching featured launches', error: error.message });
  }
});

// Get all launches for admin (admin only)
router.get('/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { page = 1, limit = 10, sortBy = 'launchDate', sortOrder = 'desc' } = req.query;
    const { current, limit: take, skip } = parsePagination(page, limit, 100);
    const where = buildLaunchWhere(req.query, { isAdmin: true });
    const orderBy = buildSortOptions(sortBy, sortOrder);

    const [launches, total] = await Promise.all([
      prisma.launch.findMany({
        where,
        include: launchInclude,
        orderBy,
        skip,
        take,
      }),
      prisma.launch.count({ where }),
    ]);

    res.json({
      data: serializeLaunchCollection(launches),
      pagination: {
        current,
        pages: Math.max(1, Math.ceil(total / take)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching admin launches:', error);
    res.status(500).json({ message: 'Error fetching launches', error: error.message });
  }
});

// Get launches statistics (admin only)
router.get('/admin/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const baseWhere = { isActive: true };
    const [total, featured, byStatusRaw, byPropertyTypeRaw] = await Promise.all([
      prisma.launch.count({ where: baseWhere }),
      prisma.launch.count({ where: { ...baseWhere, isFeatured: true } }),
      prisma.launch.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.launch.groupBy({
        by: ['propertyType'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    const byStatus = byStatusRaw.map((item) => ({
      _id: item.status,
      count: item._count._all,
    }));
    const byPropertyType = byPropertyTypeRaw.map((item) => ({
      _id: item.propertyType,
      count: item._count._all,
    }));

    res.json({
      total,
      featured,
      byStatus,
      byPropertyType
    });
  } catch (error) {
    console.error('Error fetching launch statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// Get single launch (public)
router.get('/:id', async (req, res) => {
  try {
    const launch = await prisma.launch.findFirst({
      where: { id: req.params.id, isActive: true },
      include: launchInclude,
    });

    if (!launch) {
      return res.status(404).json({ message: 'Launch not found' });
    }

    res.json({ data: serializeLaunch(launch) });
  } catch (error) {
    console.error('Error fetching launch:', error);
    res.status(500).json({ message: 'Error fetching launch', error: error.message });
  }
});

// Create launch (admin only)
router.post('/', auth, hierarchyMiddleware(2), async (req, res) => {
  try {
    const normalizedPayload = normalizeLaunchPayload(req.body);

    if (!normalizedPayload.propertyType) {
      return res.status(400).json({ message: 'Property type is required' });
    }

    const data = {
      ...normalizedPayload,
      createdById: req.user.id,
      updatedById: req.user.id,
    };

    if (!data.status) {
      data.status = Prisma.LaunchStatus.AVAILABLE;
    }

    if (!data.currency) {
      data.currency = Prisma.Currency.EGP;
    }

    const launch = await prisma.launch.create({
      data,
      include: launchInclude,
    });

    res.status(201).json({
      message: 'Launch created successfully',
      data: serializeLaunch(launch),
    });
  } catch (error) {
    console.error('Error creating launch:', error);
    res.status(400).json({ message: 'Error creating launch', error: error.message });
  }
});

// Update launch (Sales Manager+ only)
router.put('/:id', auth, hierarchyMiddleware(2), async (req, res) => {
  try {
    const updateData = {
      ...normalizeLaunchPayload(req.body),
      updatedById: req.user.id
    };

    const launch = await prisma.launch.update({
      where: { id: req.params.id },
      data: updateData,
      include: launchInclude,
    });

    res.json({
      message: 'Launch updated successfully',
      data: serializeLaunch(launch),
    });
  } catch (error) {
    console.error('Error updating launch:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Launch not found' });
    }
    res.status(400).json({ message: 'Error updating launch', error: error.message });
  }
});

// Delete launch (admin only)
router.delete('/:id', auth, hierarchyMiddleware(2), async (req, res) => {
  try {
    await prisma.launch.update({
      where: { id: req.params.id },
      data: { isActive: false, updatedById: req.user.id },
    });

    res.json({ message: 'Launch deleted successfully' });
  } catch (error) {
    console.error('Error deleting launch:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Launch not found' });
    }
    res.status(500).json({ message: 'Error deleting launch', error: error.message });
  }
});

// Toggle featured status (Sales Manager+ only)
router.patch('/:id/featured', auth, hierarchyMiddleware(2), async (req, res) => {
  try {

    const launch = await prisma.launch.update({
      where: { id: req.params.id },
      data: {
        isFeatured: Boolean(req.body.isFeatured),
        updatedById: req.user.id,
      },
      include: launchInclude,
    });

    res.json({
      message: `Launch ${req.body.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: serializeLaunch(launch),
    });
  } catch (error) {
    console.error('Error toggling featured status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Launch not found' });
    }
    res.status(400).json({ message: 'Error updating featured status', error: error.message });
  }
});

// Archive launch (Sales Manager+ only)
router.post('/:id/archive', auth, hierarchyMiddleware(2), async (req, res) => {
  try {
    const launch = await prisma.launch.update({
      where: { id: req.params.id },
      data: { isActive: false, updatedById: req.user.id },
      include: launchInclude,
    });

    res.json({
      message: 'Launch archived successfully',
      data: serializeLaunch(launch),
    });
  } catch (error) {
    console.error('Error archiving launch:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Launch not found' });
    }
    res.status(400).json({ message: 'Error archiving launch', error: error.message });
  }
});

// Restore launch (Sales Manager+ only)
router.post('/:id/restore', auth, hierarchyMiddleware(2), async (req, res) => {
  try {
    const launch = await prisma.launch.update({
      where: { id: req.params.id },
      data: { isActive: true, updatedById: req.user.id },
      include: launchInclude,
    });

    res.json({
      message: 'Launch restored successfully',
      data: serializeLaunch(launch),
    });
  } catch (error) {
    console.error('Error restoring launch:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Launch not found' });
    }
    res.status(400).json({ message: 'Error restoring launch', error: error.message });
  }
});

module.exports = router;
