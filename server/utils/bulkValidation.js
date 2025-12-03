const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');

const VALID_USER_ROLES = ['user', 'admin', 'sales_manager', 'sales_team_leader', 'sales_agent'];
const VALID_PROPERTY_TYPES = ['villa', 'twin-villa', 'duplex', 'apartment', 'land', 'commercial'];
const VALID_PROPERTY_STATUSES = ['for-sale', 'for-rent', 'sold', 'rented'];
const VALID_DEVELOPER_STATUSES = ['off-plan', 'on-plan', 'secondary', 'rental'];
const VALID_CURRENCIES = ['EGP', 'AED', 'USD', 'EUR'];
const VALID_LEAD_SERVICES = ['buy', 'sell', 'rent'];
const VALID_LEAD_PURPOSES = ['investment', 'personal-use'];
const VALID_LEAD_TIMELINES = ['immediate', '1-3-months', '3-6-months', '6-12-months', 'flexible'];
const VALID_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal-sent', 'negotiating', 'closed', 'lost'];
const VALID_LEAD_PRIORITIES = ['low', 'medium', 'high'];
const VALID_LEAD_SOURCES = ['landing-page', 'contact-form', 'phone', 'referral', 'social-media'];
const VALID_LAUNCH_TYPES = ['Villa', 'Apartment', 'Townhouse', 'Penthouse', 'Duplex', 'Studio', 'Commercial', 'Land'];
const VALID_LAUNCH_STATUSES = ['Available', 'Coming Soon', 'Pre-Launch', 'Sold Out'];
const VALID_LAUNCH_CURRENCIES = ['EGP', 'USD', 'EUR'];
const VALID_AREA_UNITS = ['sqm', 'sqft'];
const GENERIC_ID_REGEX = /^[A-Za-z0-9_-]{8,}$/;

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'auto-slug';

const normalizeNameForMatching = (name) =>
  name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+city\s*$/i, '')
    .replace(/\s+/g, ' ');

const ensureArray = (value) => (Array.isArray(value) ? value : []);

function isValidEmail(email) {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
  return emailRegex.test(email || '');
}

function isValidPhone(phone) {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone || '');
}

function isValidObjectId(id) {
  return typeof id === 'string' && GENERIC_ID_REGEX.test(id);
}

function findDuplicatesInArray(records, key) {
  const seen = new Map();
  const duplicates = [];

  records.forEach((record, index) => {
    const value = key.includes('.')
      ? key.split('.').reduce((obj, k) => obj?.[k], record)
      : record[key];

    if (!value) return;
    const normalizedValue = value.toString().trim().toLowerCase();
    if (seen.has(normalizedValue)) {
      duplicates.push({ index, value, record });
    } else {
      seen.set(normalizedValue, index);
    }
  });

  return duplicates;
}

async function validateUsers(records) {
  const errors = [];
  const skipped = [];
  const warnings = [];

  const emailDuplicates = findDuplicatesInArray(records, 'email');
  emailDuplicates.forEach((dup) => {
    skipped.push({
      index: dup.index,
      record: dup.record,
      reason: `Duplicate email in uploaded data: ${dup.value}`,
    });
  });

  const emails = records
    .map((record) => record.email?.toLowerCase())
    .filter(Boolean);

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existingEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const recordErrors = [];

    if (emailDuplicates.find((duplicate) => duplicate.index === i)) {
      continue;
    }

    if (!record.name || !record.name.trim()) {
      recordErrors.push('Name is required');
    }
    if (!record.email || !record.email.trim()) {
      recordErrors.push('Email is required');
    } else if (!isValidEmail(record.email)) {
      recordErrors.push('Invalid email format');
    } else if (existingEmails.has(record.email.toLowerCase())) {
      skipped.push({
        index: i,
        record,
        reason: `User with email ${record.email} already exists`,
      });
      continue;
    }

    if (!record.phone || !record.phone.trim()) {
      recordErrors.push('Phone is required');
    } else if (!isValidPhone(record.phone)) {
      recordErrors.push('Invalid phone format');
    }

    if (!record.password || record.password.length < 6) {
      recordErrors.push('Password is required and must be at least 6 characters');
    }

    if (record.role && !VALID_USER_ROLES.includes(record.role)) {
      recordErrors.push(`Role must be one of: ${VALID_USER_ROLES.join(', ')}`);
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

async function validateDevelopers(records) {
  const errors = [];
  const skipped = [];
  const warnings = [];

  const nameDuplicates = findDuplicatesInArray(records, 'name');
  nameDuplicates.forEach((dup) => {
    skipped.push({
      index: dup.index,
      record: dup.record,
      reason: `Duplicate name in uploaded data: ${dup.value}`,
    });
  });

  const names = records.map((record) => record.name?.trim()).filter(Boolean);
  const existingDevelopers = await prisma.developer.findMany({
    where: { name: { in: names } },
    select: { name: true },
  });
  const existingNames = new Set(existingDevelopers.map((developer) => developer.name));

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const recordErrors = [];

    if (nameDuplicates.find((duplicate) => duplicate.index === i)) {
      continue;
    }

    if (!record.name || !record.name.trim()) {
      recordErrors.push('Name is required');
    } else if (existingNames.has(record.name.trim())) {
      skipped.push({
        index: i,
        record,
        reason: `Developer with name "${record.name}" already exists`,
      });
      continue;
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

async function validateGovernorates(records) {
  const errors = [];
  const skipped = [];
  const warnings = [];

  const nameDuplicates = findDuplicatesInArray(records, 'name');
  nameDuplicates.forEach((dup) => {
    skipped.push({
      index: dup.index,
      record: dup.record,
      reason: `Duplicate name in uploaded data: ${dup.value}`,
    });
  });

  const names = records.map((record) => record.name?.trim()).filter(Boolean);
  const existingGovernorates = await prisma.governorate.findMany({
    where: { name: { in: names } },
    select: { name: true },
  });
  const existingNames = new Set(existingGovernorates.map((governorate) => governorate.name));

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const recordErrors = [];

    if (nameDuplicates.find((duplicate) => duplicate.index === i)) {
      continue;
    }

    if (!record.name || !record.name.trim()) {
      recordErrors.push('Name is required');
    } else if (existingNames.has(record.name.trim())) {
      skipped.push({
        index: i,
        record,
        reason: `Governorate with name "${record.name}" already exists`,
      });
      continue;
    }

    if (record.annualAppreciationRate === undefined || record.annualAppreciationRate === null) {
      recordErrors.push('Annual appreciation rate is required');
    } else if (
      typeof record.annualAppreciationRate !== 'number' ||
      record.annualAppreciationRate < 0 ||
      record.annualAppreciationRate > 100
    ) {
      recordErrors.push('Annual appreciation rate must be a number between 0 and 100');
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

async function validateCities(records) {
  const errors = [];
  const skipped = [];
  const warnings = [];

  const nameDuplicates = findDuplicatesInArray(records, 'name');
  nameDuplicates.forEach((dup) => {
    skipped.push({
      index: dup.index,
      record: dup.record,
      reason: `Duplicate name in uploaded data: ${dup.value}`,
    });
  });

  const names = records.map((record) => record.name?.trim()).filter(Boolean);
  const existingCities = await prisma.city.findMany({
    where: { name: { in: names } },
    select: { name: true },
  });
  const existingNames = new Set(existingCities.map((city) => city.name));

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const recordErrors = [];

    if (nameDuplicates.find((duplicate) => duplicate.index === i)) {
      continue;
    }

    if (!record.name || !record.name.trim()) {
      recordErrors.push('Name is required');
    } else if (existingNames.has(record.name.trim())) {
      skipped.push({
        index: i,
        record,
        reason: `City with name "${record.name}" already exists`,
      });
      continue;
    }

    if (record.annualAppreciationRate === undefined || record.annualAppreciationRate === null) {
      recordErrors.push('Annual appreciation rate is required');
    } else if (
      typeof record.annualAppreciationRate !== 'number' ||
      record.annualAppreciationRate < 0 ||
      record.annualAppreciationRate > 100
    ) {
      recordErrors.push('Annual appreciation rate must be a number between 0 and 100');
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

async function validateAreas(records, resolvedReferences = []) {
  const errors = [];
  const skipped = [];
  const warnings = [];

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const resolvedRef = Array.isArray(resolvedReferences) ? resolvedReferences[i] || {} : {};
    const recordErrors = [];

    if (!record.name || !record.name.trim()) {
      recordErrors.push('Name is required');
    }
    if (!record.city) {
      recordErrors.push('City is required');
    } else if (!resolvedRef.city && !resolvedRef.city_ref) {
      recordErrors.push(`City reference "${record.city}" not found`);
    }

    if (record.annualAppreciationRate === undefined || record.annualAppreciationRate === null) {
      recordErrors.push('Annual appreciation rate is required');
    } else if (
      typeof record.annualAppreciationRate !== 'number' ||
      record.annualAppreciationRate < 0 ||
      record.annualAppreciationRate > 100
    ) {
      recordErrors.push('Annual appreciation rate must be a number between 0 and 100');
    }

    if ((resolvedRef.city || resolvedRef.city_ref) && record.name) {
      const existingArea = await prisma.area.findFirst({
        where: {
          name: { equals: record.name.trim(), mode: 'insensitive' },
          cityId: resolvedRef.city || resolvedRef.city_ref,
        },
        select: { id: true },
      });
      if (existingArea) {
        skipped.push({
          index: i,
          record,
          reason: `Area "${record.name}" already exists in this city`,
        });
        continue;
      }
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

async function validateProperties(records, resolvedReferences = {}) {
  const errors = [];
  const warnings = [];
  const skipped = [];

  const getResolvedRef = (index) => {
    if (Array.isArray(resolvedReferences)) {
      return resolvedReferences[index] || {};
    }
    if (index === 0) {
      return resolvedReferences || {};
    }
    return {};
  };

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const resolvedRef = getResolvedRef(i);
    const recordErrors = [];

    if (!record.title || !record.title.trim()) {
      recordErrors.push('Title is required');
    }
    if (!record.description || !record.description.trim()) {
      recordErrors.push('Description is required');
    }
    if (!record.type) {
      recordErrors.push('Type is required');
    } else if (!VALID_PROPERTY_TYPES.includes(record.type)) {
      recordErrors.push(`Type must be one of: ${VALID_PROPERTY_TYPES.join(', ')}`);
    }
    if (!record.status) {
      recordErrors.push('Status is required');
    } else if (!VALID_PROPERTY_STATUSES.includes(record.status)) {
      recordErrors.push(`Status must be one of: ${VALID_PROPERTY_STATUSES.join(', ')}`);
    }
    if (record.developerStatus && !VALID_DEVELOPER_STATUSES.includes(record.developerStatus)) {
      recordErrors.push(`Developer status must be one of: ${VALID_DEVELOPER_STATUSES.join(', ')}`);
    }
    if (!record.price || typeof record.price !== 'number' || record.price < 0) {
      recordErrors.push('Price is required and must be a positive number');
    }
    if (record.currency && !VALID_CURRENCIES.includes(record.currency)) {
      recordErrors.push(`Currency must be one of: ${VALID_CURRENCIES.join(', ')}`);
    }

    const useNewStructure = Boolean(record.governorate_ref || record.city_ref || record.area_ref);
    if (useNewStructure) {
      if (!resolvedRef.governorate_ref) {
        recordErrors.push(
          record.governorate_ref
            ? `Governorate "${record.governorate_ref}" could not be resolved or created`
            : 'Governorate is required for new location structure (use governorate_ref)',
        );
      }
      if (!resolvedRef.city_ref) {
        recordErrors.push(
          record.city_ref
            ? `City "${record.city_ref}" could not be resolved or created`
            : 'City is required for new location structure (use city_ref)',
        );
      }
      if (!resolvedRef.area_ref) {
        recordErrors.push(
          record.area_ref
            ? `Area "${record.area_ref}" could not be resolved or created (ensure city is valid)`
            : 'Area is required for new location structure (use area_ref)',
        );
      }
      if (!record.location || !record.location.address) {
        recordErrors.push('Location address is required');
      }
    } else {
      if (!record.location) {
        recordErrors.push('Location is required');
      } else {
        if (!record.location.address) {
          recordErrors.push('Location address is required');
        }
        if (!record.location.city) {
          recordErrors.push('Location city is required');
        }
        if (!record.location.state) {
          recordErrors.push('Location state is required');
        }
      }
    }

    if (!record.specifications) {
      recordErrors.push('Specifications are required');
    } else if (!record.specifications.area || record.specifications.area <= 0) {
      recordErrors.push('Specifications area is required and must be positive');
    }

    if (record.createdBy && !resolvedRef.createdBy) {
      recordErrors.push(`User reference "${record.createdBy}" not found`);
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

async function validateLeads(records) {
  const errors = [];
  const warnings = [];
  const skipped = [];

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const recordErrors = [];

    if (!record.name || !record.name.trim()) {
      recordErrors.push('Name is required');
    }
    if (!record.email || !record.email.trim()) {
      recordErrors.push('Email is required');
    } else if (!isValidEmail(record.email)) {
      recordErrors.push('Invalid email format');
    }
    if (!record.phone || !record.phone.trim()) {
      recordErrors.push('Phone is required');
    } else if (!isValidPhone(record.phone)) {
      recordErrors.push('Invalid phone format');
    }
    if (!record.requiredService) {
      recordErrors.push('Required service is required');
    } else if (!VALID_LEAD_SERVICES.includes(record.requiredService)) {
      recordErrors.push(`Required service must be one of: ${VALID_LEAD_SERVICES.join(', ')}`);
    }
    if (!record.propertyType) {
      recordErrors.push('Property type is required');
    } else if (!VALID_PROPERTY_TYPES.includes(record.propertyType)) {
      recordErrors.push(`Property type must be one of: ${VALID_PROPERTY_TYPES.join(', ')}`);
    }
    if (!record.purpose) {
      recordErrors.push('Purpose is required');
    } else if (!VALID_LEAD_PURPOSES.includes(record.purpose)) {
      recordErrors.push(`Purpose must be one of: ${VALID_LEAD_PURPOSES.join(', ')}`);
    }

    if (record.timeline && !VALID_LEAD_TIMELINES.includes(record.timeline)) {
      recordErrors.push(`Timeline must be one of: ${VALID_LEAD_TIMELINES.join(', ')}`);
    }
    if (record.status && !VALID_LEAD_STATUSES.includes(record.status)) {
      recordErrors.push(`Status must be one of: ${VALID_LEAD_STATUSES.join(', ')}`);
    }
    if (record.priority && !VALID_LEAD_PRIORITIES.includes(record.priority)) {
      recordErrors.push(`Priority must be one of: ${VALID_LEAD_PRIORITIES.join(', ')}`);
    }
    if (record.source && !VALID_LEAD_SOURCES.includes(record.source)) {
      recordErrors.push(`Source must be one of: ${VALID_LEAD_SOURCES.join(', ')}`);
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

async function validateLaunches(records, resolvedReferences = {}) {
  const errors = [];
  const warnings = [];
  const skipped = [];

  const getResolvedRef = (index) => {
    if (Array.isArray(resolvedReferences)) {
      return resolvedReferences[index] || {};
    }
    if (index === 0) {
      return resolvedReferences || {};
    }
    return {};
  };

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const resolvedRef = getResolvedRef(i);
    const recordErrors = [];

    if (!record.title || !record.title.trim()) {
      recordErrors.push('Title is required');
    }
    if (!record.developer || !record.developer.trim()) {
      recordErrors.push('Developer is required');
    }
    if (!record.description || !record.description.trim()) {
      recordErrors.push('Description is required');
    }
    if (!record.content || !record.content.trim()) {
      recordErrors.push('Content is required');
    }
    if (!record.image || !record.image.trim()) {
      recordErrors.push('Image is required');
    }
    if (!record.location || !record.location.trim()) {
      recordErrors.push('Location is required');
    }
    if (!record.propertyType) {
      recordErrors.push('Property type is required');
    } else if (!VALID_LAUNCH_TYPES.includes(record.propertyType)) {
      recordErrors.push(`Property type must be one of: ${VALID_LAUNCH_TYPES.join(', ')}`);
    }
    if (!record.status) {
      recordErrors.push('Status is required');
    } else if (!VALID_LAUNCH_STATUSES.includes(record.status)) {
      recordErrors.push(`Status must be one of: ${VALID_LAUNCH_STATUSES.join(', ')}`);
    }
    if (!record.startingPrice || typeof record.startingPrice !== 'number' || record.startingPrice < 0) {
      recordErrors.push('Starting price is required and must be a positive number');
    }
    if (!record.currency) {
      recordErrors.push('Currency is required');
    } else if (!VALID_LAUNCH_CURRENCIES.includes(record.currency)) {
      recordErrors.push(`Currency must be one of: ${VALID_LAUNCH_CURRENCIES.join(', ')}`);
    }
    if (!record.launchDate) {
      recordErrors.push('Launch date is required');
    }
    if (!record.area || typeof record.area !== 'number' || record.area < 0) {
      recordErrors.push('Area is required and must be a positive number');
    }
    if (!record.areaUnit) {
      recordErrors.push('Area unit is required');
    } else if (!VALID_AREA_UNITS.includes(record.areaUnit)) {
      recordErrors.push(`Area unit must be one of: ${VALID_AREA_UNITS.join(', ')}`);
    }
    if (record.createdBy && !resolvedRef.createdBy) {
      recordErrors.push(`User reference "${record.createdBy}" not found`);
    }

    if (recordErrors.length) {
      errors.push({ index: i, record, errors: recordErrors });
    }
  }

  return { errors, warnings, skipped };
}

const entityCreationCache = {
  developers: new Map(),
  governorates: new Map(),
  cities: new Map(),
  areas: new Map(),
};

async function findByNameWithNormalization(model, name, where = {}) {
  if (!name) return null;
  const trimmed = name.toString().trim();
  const normalized = normalizeNameForMatching(trimmed);

  const exact = await model.findFirst({
    where: {
      ...where,
      name: { equals: trimmed, mode: 'insensitive' },
    },
  });
  if (exact) return exact;

  const searchTerm = trimmed.split(' ')[0] || trimmed;
  const candidates = await model.findMany({
    where: {
      ...where,
      name: { contains: searchTerm, mode: 'insensitive' },
    },
    take: 50,
  });

  return candidates.find((candidate) => normalizeNameForMatching(candidate.name) === normalized) || null;
}

async function resolveUserReference(value) {
  if (!value) return null;
  if (isValidObjectId(value)) {
    const user = await prisma.user.findUnique({ where: { id: value } });
    return user?.id || null;
  }
  const user = await prisma.user.findUnique({
    where: { email: value.toLowerCase() },
    select: { id: true },
  });
  return user?.id || null;
}

async function resolveDeveloperReference(value, autoCreate = true) {
  if (!value) return null;
  if (isValidObjectId(value)) {
    const developer = await prisma.developer.findUnique({ where: { id: value } });
    return developer?.id || null;
  }

  const key = value.toString().trim().toLowerCase();
  if (entityCreationCache.developers.has(key)) {
    return entityCreationCache.developers.get(key);
  }

  let developer = await findByNameWithNormalization(prisma.developer, value);
  if (!developer && autoCreate) {
    try {
      developer = await prisma.developer.create({
        data: {
          name: value.toString().trim(),
          slug: slugify(value),
          description: `Developer: ${value.toString().trim()}`,
        },
      });
      console.log(`  ✓ Auto-created developer: ${value}`);
    } catch (error) {
      developer = await findByNameWithNormalization(prisma.developer, value);
      if (!developer) {
        console.error(`  ✗ Failed to auto-create developer "${value}": ${error.message}`);
      }
    }
  }

  if (developer) {
    entityCreationCache.developers.set(key, developer.id);
    return developer.id;
  }

  return null;
}

async function resolveGovernorateReference(value, autoCreate = true) {
  if (!value) return null;
  if (isValidObjectId(value)) {
    const governorate = await prisma.governorate.findUnique({ where: { id: value } });
    return governorate?.id || null;
  }

  const key = value.toString().trim().toLowerCase();
  if (entityCreationCache.governorates.has(key)) {
    return entityCreationCache.governorates.get(key);
  }

  let governorate = await findByNameWithNormalization(prisma.governorate, value);
  if (!governorate && autoCreate) {
    try {
      governorate = await prisma.governorate.create({
        data: {
          name: value.toString().trim(),
          slug: slugify(value),
          annualAppreciationRate: 0,
          description: `Governorate: ${value.toString().trim()}`,
        },
      });
      console.log(`  ✓ Auto-created governorate: ${value}`);
    } catch (error) {
      governorate = await findByNameWithNormalization(prisma.governorate, value);
      if (!governorate) {
        console.error(`  ✗ Failed to auto-create governorate "${value}": ${error.message}`);
      }
    }
  }

  if (governorate) {
    entityCreationCache.governorates.set(key, governorate.id);
    return governorate.id;
  }

  return null;
}

async function resolveCityReference(value, governorateId, autoCreate = true) {
  if (!value) return null;
  if (isValidObjectId(value)) {
    const city = await prisma.city.findUnique({ where: { id: value } });
    return city?.id || null;
  }

  const key = `${value.toString().trim().toLowerCase()}|${governorateId || 'any'}`;
  if (entityCreationCache.cities.has(key)) {
    return entityCreationCache.cities.get(key);
  }

  const where = governorateId ? { governorateId } : {};
  let city = await findByNameWithNormalization(prisma.city, value, where);
  if (!city && autoCreate) {
    try {
      city = await prisma.city.create({
        data: {
          name: value.toString().trim(),
          slug: slugify(`${value}-${Date.now()}`),
          governorateId: governorateId || null,
          annualAppreciationRate: 0,
          description: `City: ${value.toString().trim()}`,
        },
      });
      console.log(`  ✓ Auto-created city: ${value}${governorateId ? ' (linked to governorate)' : ''}`);
    } catch (error) {
      city = await findByNameWithNormalization(prisma.city, value, where);
      if (!city) {
        console.error(`  ✗ Failed to auto-create city "${value}": ${error.message}`);
      }
    }
  }

  if (city) {
    entityCreationCache.cities.set(key, city.id);
    return city.id;
  }

  return null;
}

async function resolveAreaReference(value, cityId, autoCreate = true) {
  if (!value) return null;
  if (isValidObjectId(value)) {
    const area = await prisma.area.findUnique({ where: { id: value } });
    return area?.id || null;
  }

  const key = `${value.toString().trim().toLowerCase()}|${cityId || 'any'}`;
  if (entityCreationCache.areas.has(key)) {
    return entityCreationCache.areas.get(key);
  }

  const where = cityId ? { cityId } : {};
  let area = cityId ? await findByNameWithNormalization(prisma.area, value, where) : null;

  if (!area && autoCreate && cityId) {
    try {
      area = await prisma.area.create({
        data: {
          name: value.toString().trim(),
          slug: slugify(`${value}-${Date.now()}`),
          cityId,
          annualAppreciationRate: 0,
          description: `Area: ${value.toString().trim()}`,
        },
      });
      console.log(`  ✓ Auto-created area: ${value}`);
    } catch (error) {
      area = await findByNameWithNormalization(prisma.area, value, where);
      if (!area) {
        console.error(`  ✗ Failed to auto-create area "${value}": ${error.message}`);
      }
    }
  }

  if (area) {
    entityCreationCache.areas.set(key, area.id);
    return area.id;
  }

  return null;
}

async function resolveEntityReferences(record, entityType, autoCreate = false) {
  const resolved = {};

  if (record.developer) {
    resolved.developer = await resolveDeveloperReference(record.developer, autoCreate);
  }

  if (record.createdBy) {
    resolved.createdBy = await resolveUserReference(record.createdBy);
  }

  if (record.assignedTo) {
    resolved.assignedTo = await resolveUserReference(record.assignedTo);
  }

  if (record.updatedBy) {
    resolved.updatedBy = await resolveUserReference(record.updatedBy);
  }

  const governorateInput = record.governorate || record.governorate_ref;
  if (governorateInput) {
    resolved.governorate_ref = await resolveGovernorateReference(governorateInput, autoCreate);
    resolved.governorate = resolved.governorate_ref;
  }

  const cityInput = record.city || record.city_ref;
  if (cityInput) {
    resolved.city_ref = await resolveCityReference(cityInput, resolved.governorate_ref, autoCreate);
    resolved.city = resolved.city_ref;
  }

  if (record.area_ref) {
    resolved.area_ref = await resolveAreaReference(record.area_ref, resolved.city_ref, autoCreate);
  }

  return resolved;
}

function clearEntityCreationCache() {
  entityCreationCache.developers.clear();
  entityCreationCache.governorates.clear();
  entityCreationCache.cities.clear();
  entityCreationCache.areas.clear();
}

module.exports = {
  validateUsers,
  validateDevelopers,
  validateGovernorates,
  validateCities,
  validateAreas,
  validateProperties,
  validateLeads,
  validateLaunches,
  resolveEntityReferences,
  clearEntityCreationCache,
  isValidEmail,
  isValidPhone,
  isValidObjectId,
};

