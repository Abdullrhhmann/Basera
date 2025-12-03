const { Prisma, PropertyStatus, PropertyType, PropertyApprovalStatus, DeveloperStatus } = require('../../prisma/generated');

const normalizeEnumVariant = (value) => {
  if (!value) {
    return '';
  }
  return value.toString().trim().toLowerCase();
};

const slugifyEnumVariant = (value) => {
  const normalized = normalizeEnumVariant(value);
  return normalized.replace(/[\s_]+/g, '-');
};

const compactEnumVariant = (value) => slugifyEnumVariant(value).replace(/[^a-z0-9]/g, '');

const createEnumMap = (enumObj = {}) => {
  const map = {};

  const addVariant = (variant, enumValue) => {
    if (!variant) return;
    const normalized = normalizeEnumVariant(variant);
    if (normalized) {
      map[normalized] = enumValue;
    }
    const slug = slugifyEnumVariant(variant);
    if (slug) {
      map[slug] = enumValue;
    }
    const compact = compactEnumVariant(variant);
    if (compact) {
      map[compact] = enumValue;
    }
  };

  Object.entries(enumObj).forEach(([enumKey, enumValue]) => {
    const targetValue = enumKey;
    addVariant(enumKey, targetValue);
    addVariant(enumKey.replace(/_/g, '-'), targetValue);
    addVariant(enumValue, targetValue);
    addVariant(enumValue.replace(/_/g, '-'), targetValue);
  });

  return map;
};

const createReverseEnumMap = (enumObj = {}) =>
  Object.entries(enumObj).reduce((acc, [enumKey, enumValue]) => {
    acc[enumValue] = enumValue;
    acc[enumKey] = enumValue;
    return acc;
  }, {});

const mapEnumValue = (map, value) => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  const normalized = normalizeEnumVariant(value);
  const slug = slugifyEnumVariant(value);
  const compact = compactEnumVariant(value);
  return map[normalized] || map[slug] || map[compact];
};

const SORTABLE_FIELDS = new Set(['createdAt', 'updatedAt', 'price', 'views', 'isFeatured']);

const STATUS_MAP = createEnumMap(PropertyStatus);
const STATUS_REVERSE_MAP = createReverseEnumMap(PropertyStatus);

const TYPE_MAP = createEnumMap(PropertyType);
const TYPE_REVERSE_MAP = createReverseEnumMap(PropertyType);

const APPROVAL_STATUS_MAP = createEnumMap(PropertyApprovalStatus);
const APPROVAL_STATUS_REVERSE_MAP = createReverseEnumMap(PropertyApprovalStatus);

const DEVELOPER_STATUS_MAP = createEnumMap(DeveloperStatus);
const DEVELOPER_STATUS_REVERSE_MAP = createReverseEnumMap(DeveloperStatus);

const DEFAULT_PUBLIC_STATUSES = [
  mapEnumValue(STATUS_MAP, 'for-sale') ||
    mapEnumValue(STATUS_MAP, PropertyStatus?.FOR_SALE),
  mapEnumValue(STATUS_MAP, 'for-rent') ||
    mapEnumValue(STATUS_MAP, PropertyStatus?.FOR_RENT),
].filter(Boolean);

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isNumeric = (value) => {
  if (value === null || value === undefined || value === '') return false;
  const num = Number(value);
  return Number.isFinite(num);
};

const toDecimal = (value) => {
  if (!isNumeric(value)) {
    return null;
  }
  return new Prisma.Decimal(value);
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const toClientEnumValue = (reverseMap, value) => {
  if (!value) return null;
  return reverseMap[value] || value.toString().toLowerCase().replace(/_/g, '-');
};

const buildJsonNumberCondition = (pathKey, comparator, numberValue) => {
  if (numberValue === undefined || numberValue === null || Number.isNaN(numberValue)) {
    return null;
  }

  return {
    specifications: {
      path: [pathKey],
      [comparator]: numberValue,
    },
  };
};

const buildLocationJsonCondition = (pathKey, term) => {
  if (!term) {
    return null;
  }

  return {
    location: {
      path: [pathKey],
      string_contains: term,
    },
  };
};

const buildCityFilter = (city) => {
  if (!city || typeof city !== 'string') {
    return null;
  }

  const trimmedCity = city.trim();
  if (!trimmedCity) {
    return null;
  }

  return {
    OR: [
      // Match by city name (e.g., "New Cairo")
      { city: { name: { equals: trimmedCity, mode: 'insensitive' } } },
      // Match by city slug (e.g., "new-cairo")
      { city: { slug: { equals: trimmedCity, mode: 'insensitive' } } },
      // Match in location JSON
      buildLocationJsonCondition('city', trimmedCity),
    ],
  };
};

const buildSearchConditions = (searchTerm) => {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return [];
  }

  const normalized = searchTerm.trim();
  if (!normalized) {
    return [];
  }

  const slug = slugify(normalized);
  const typeEnum = TYPE_MAP[slug];

  const conditions = [
    { title: { contains: normalized, mode: 'insensitive' } },
    { description: { contains: normalized, mode: 'insensitive' } },
    buildLocationJsonCondition('address', normalized),
    buildLocationJsonCondition('city', normalized),
    { developer: { name: { contains: normalized, mode: 'insensitive' } } },
    { developer: { slug: { equals: slug } } },
    { compound: { name: { contains: normalized, mode: 'insensitive' } } },
    { compound: { slug: { equals: slug } } },
    { governorate: { name: { contains: normalized, mode: 'insensitive' } } },
    { city: { name: { contains: normalized, mode: 'insensitive' } } },
    { area: { name: { contains: normalized, mode: 'insensitive' } } },
  ].filter(Boolean);

  if (typeEnum) {
    conditions.push({ type: typeEnum });
  }

  return conditions;
};

const buildRelationFilter = (key, value, relationField) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return {
    OR: [
      { [`${relationField}Id`]: trimmed },
      { [relationField]: { slug: trimmed } },
      { [relationField]: { name: { equals: trimmed, mode: 'insensitive' } } },
    ],
  };
};

const normalizePagination = (query = {}, isAdminUser = false) => {
  const pageNumber = Math.max(parseInt(query.page, 10) || 1, 1);
  const defaultLimit = isAdminUser ? 100 : 12;
  const maxLimit = isAdminUser ? 200 : 50;
  const limitNumber = Math.min(parseInt(query.limit, 10) || defaultLimit, maxLimit);
  const skip = (pageNumber - 1) * limitNumber;

  return { pageNumber, limitNumber, skip };
};

const buildPropertyOrderBy = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const safeField = SORTABLE_FIELDS.has(sortBy) ? sortBy : 'createdAt';
  const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  return { [safeField]: safeOrder };
};

const buildPropertyListWhere = ({ query = {}, isAdminUser = false }) => {
  const where = {
    isActive: true,
  };

  if (query.archived === 'true') {
    where.isArchived = true;
  } else if (query.archived === 'false' || !query.archived) {
    where.isArchived = { not: true };
  }

  const approvalStatus = mapEnumValue(APPROVAL_STATUS_MAP, query.approvalStatus);
  const defaultApprovalStatus =
    mapEnumValue(APPROVAL_STATUS_MAP, Prisma.PropertyApprovalStatus?.APPROVED) ||
    'APPROVED';
  where.approvalStatus = approvalStatus || defaultApprovalStatus;

  if (!isAdminUser) {
    const requestedStatus = mapEnumValue(STATUS_MAP, query.status);
    if (requestedStatus && DEFAULT_PUBLIC_STATUSES.includes(requestedStatus)) {
      where.status = requestedStatus;
    } else if (DEFAULT_PUBLIC_STATUSES.length) {
      where.status = { in: DEFAULT_PUBLIC_STATUSES };
    }
  } else if (query.status) {
    const statusEnum = mapEnumValue(STATUS_MAP, query.status);
    if (statusEnum) {
      where.status = statusEnum;
    }
  }

  if (query.type) {
    const typeEnum = mapEnumValue(TYPE_MAP, query.type);
    if (typeEnum) {
      where.type = typeEnum;
    }
  }

  if (query.featured === 'true') {
    where.isFeatured = true;
  }

  const andConditions = [];

  if (query.governorate) {
    andConditions.push({ governorateId: query.governorate });
  }
  if (query.governorate_ref) {
    andConditions.push({ governorateId: query.governorate_ref });
  }
  if (query.city_ref) {
    andConditions.push({ cityId: query.city_ref });
  }
  if (query.area_ref) {
    andConditions.push({ areaId: query.area_ref });
  }

  if (query.developer) {
    const developerFilter = buildRelationFilter('developer', query.developer, 'developer');
    if (developerFilter) {
      andConditions.push(developerFilter);
    }
  }

  if (query.compound) {
    const compoundFilter = buildRelationFilter('compound', query.compound, 'compound');
    if (compoundFilter) {
      andConditions.push(compoundFilter);
    }
  }

  if (query.city) {
    const cityFilter = buildCityFilter(query.city);
    if (cityFilter) {
      andConditions.push(cityFilter);
    }
  }

  if (query.furnished && ['furnished', 'semi-furnished', 'unfurnished'].includes(query.furnished)) {
    andConditions.push({
      specifications: {
        path: ['furnished'],
        equals: query.furnished,
      },
    });
  }

  if (query.isCompound === 'true') {
    andConditions.push({ isCompound: true });
  } else if (query.isCompound === 'false') {
    andConditions.push({ isCompound: false });
  }

  if (query.minPrice || query.maxPrice) {
    const priceFilter = {};
    const minDecimal = toDecimal(query.minPrice);
    const maxDecimal = toDecimal(query.maxPrice);

    if (minDecimal) {
      priceFilter.gte = minDecimal;
    }
    if (maxDecimal) {
      priceFilter.lte = maxDecimal;
    }

    if (Object.keys(priceFilter).length) {
      andConditions.push({ price: priceFilter });
    }
  }

  if (query.bedrooms) {
    if (query.bedrooms === '5+') {
      const condition = buildJsonNumberCondition('bedrooms', 'gte', 5);
      if (condition) andConditions.push(condition);
    } else if (isNumeric(query.bedrooms)) {
      const condition = buildJsonNumberCondition('bedrooms', 'equals', Number(query.bedrooms));
      if (condition) andConditions.push(condition);
    }
  }

  if (query.bathrooms) {
    if (query.bathrooms === '5+') {
      const condition = buildJsonNumberCondition('bathrooms', 'gte', 5);
      if (condition) andConditions.push(condition);
    } else if (isNumeric(query.bathrooms)) {
      const condition = buildJsonNumberCondition('bathrooms', 'equals', Number(query.bathrooms));
      if (condition) andConditions.push(condition);
    }
  }

  if (query.minArea || query.maxArea) {
    const areaFilter = {};
    if (isNumeric(query.minArea)) {
      areaFilter.gte = Number(query.minArea);
    }
    if (isNumeric(query.maxArea)) {
      areaFilter.lte = Number(query.maxArea);
    }
    if (Object.keys(areaFilter).length) {
      andConditions.push({
        specifications: {
          path: ['area'],
          ...areaFilter,
        },
      });
    }
  }

  const searchTerm = typeof query.search === 'string' ? query.search.trim() : '';
  const searchConditions = buildSearchConditions(searchTerm);
  if (searchConditions.length) {
    andConditions.push({ OR: searchConditions });
  }

  const amenitiesFilter = ensureArray(query.amenities)
    .map((amenity) => (typeof amenity === 'string' ? amenity.trim() : ''))
    .filter(Boolean);
  if (amenitiesFilter.length) {
    andConditions.push({
      amenities: {
        hasEvery: amenitiesFilter,
      },
    });
  }

  if (andConditions.length) {
    where.AND = andConditions;
  }

  return { where, searchTerm };
};

const getBasePropertySelect = () => ({
  id: true,
  title: true,
  description: true,
  type: true,
  status: true,
  developerStatus: true,
  developerId: true,
  compoundId: true,
  isCompound: true,
  price: true,
  currency: true,
  location: true,
  governorateId: true,
  cityId: true,
  areaId: true,
  useNewLocationStructure: true,
  specifications: true,
  features: true,
  images: true,
  video: true,
  virtualTour: true,
  floorPlan: true,
  masterPlan: true,
  amenities: true,
  nearbyFacilities: true,
  investment: true,
  documents: true,
  isFeatured: true,
  isActive: true,
  isArchived: true,
  archivedAt: true,
  soldDate: true,
  rentedDate: true,
  views: true,
  createdById: true,
  submittedById: true,
  approvedById: true,
  approvalStatus: true,
  approvalDate: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});

const relationSelects = {
  developer: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
    },
  },
  compound: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      heroImage: true,
      isFeatured: true,
      launchDate: true,
      handoverDate: true,
      location: true,
      amenities: true,
    },
  },
  governorate: {
    select: {
      id: true,
      name: true,
      slug: true,
      annualAppreciationRate: true,
    },
  },
  city: {
    select: {
      id: true,
      name: true,
      slug: true,
      annualAppreciationRate: true,
    },
  },
  area: {
    select: {
      id: true,
      name: true,
      slug: true,
      annualAppreciationRate: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  submittedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
};

const getPropertyListSelect = () => ({
  ...getBasePropertySelect(),
  developer: relationSelects.developer,
  compound: relationSelects.compound,
  governorate: relationSelects.governorate,
  city: relationSelects.city,
  area: relationSelects.area,
  createdBy: relationSelects.createdBy,
});

const getPropertyDetailSelect = () => ({
  ...getBasePropertySelect(),
  developer: relationSelects.developer,
  compound: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      isFeatured: true,
      launchDate: true,
      handoverDate: true,
      heroImage: true,
      gallery: true,
      amenities: true,
      metadata: true,
      location: true,
    },
  },
  governorate: relationSelects.governorate,
  city: relationSelects.city,
  area: relationSelects.area,
  createdBy: relationSelects.createdBy,
  submittedBy: relationSelects.submittedBy,
  approvedBy: relationSelects.approvedBy,
  inquiries: {
    select: {
      id: true,
      contactInfo: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
});

const optimizeImages = (images = []) => {
  const safeImages = ensureArray(images);
  return safeImages.map((img, index) => {
    if (!img || typeof img !== 'object') {
      return img;
    }

    const next = { ...img };
    if (next.url && typeof next.url === 'string' && next.url.includes('/upload/')) {
      next.url = next.url.replace('/upload/', '/upload/w_800,h_600,c_fill,q_auto,f_auto/');
    }
    if (typeof next.order !== 'number') {
      next.order = index;
    }
    return next;
  });
};

const normalizeImagesForResponse = (images, { optimize = false } = {}) => {
  if (!Array.isArray(images)) {
    return [];
  }
  return optimize ? optimizeImages(images) : images;
};

const serializeProperty = (property, { optimizeImageUrls = false } = {}) => {
  if (!property) {
    return null;
  }

  const price =
    property.price !== null && property.price !== undefined
      ? Number(property.price)
      : null;

  return {
    ...property,
    id: property.id,
    _id: property.id,
    price,
    type: toClientEnumValue(TYPE_REVERSE_MAP, property.type),
    status: toClientEnumValue(STATUS_REVERSE_MAP, property.status),
    developerStatus: toClientEnumValue(DEVELOPER_STATUS_REVERSE_MAP, property.developerStatus),
    approvalStatus: toClientEnumValue(APPROVAL_STATUS_REVERSE_MAP, property.approvalStatus),
    images: normalizeImagesForResponse(property.images || [], { optimize: optimizeImageUrls }),
    governorate_ref: property.governorate || null,
    city_ref: property.city || null,
    area_ref: property.area || null,
  };
};

module.exports = {
  normalizePagination,
  buildPropertyOrderBy,
  buildPropertyListWhere,
  getPropertyListSelect,
  getPropertyDetailSelect,
  serializeProperty,
  STATUS_MAP,
  TYPE_MAP,
  APPROVAL_STATUS_MAP,
  TYPE_REVERSE_MAP,
  STATUS_REVERSE_MAP,
  DEVELOPER_STATUS_MAP,
  DEVELOPER_STATUS_REVERSE_MAP,
  toDecimal,
  ensureArray,
};

