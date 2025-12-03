const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');
const { authMiddleware, hierarchyMiddleware } = require('../middleware/auth');
const { resolveImageUrl, resolveImageObject } = require('../utils/cloudinaryHelpers');
const { getHierarchyForRole, buildPermissionsForRole, toPrismaUserRole } = require('../utils/userRoleUtils');
const {
  validateUsers,
  validateDevelopers,
  validateGovernorates,
  validateCities,
  validateAreas,
  validateProperties,
  validateLeads,
  validateLaunches,
  resolveEntityReferences,
  clearEntityCreationCache
} = require('../utils/bulkValidation');
const {
  STATUS_MAP,
  TYPE_MAP,
  DEVELOPER_STATUS_MAP,
  APPROVAL_STATUS_MAP,
  ensureArray: ensureArrayValue
} = require('../utils/prisma/propertyQueries');

// Constants
const MAX_RECORDS = 1000;
const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `slug-${Date.now()}`;
const toDecimalOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  try {
    return new Prisma.Decimal(value);
  } catch {
    return null;
  }
};
const normalizeCurrency = (value) => {
  const upper = (value || 'EGP').toUpperCase();
  return ['EGP', 'AED', 'USD', 'EUR'].includes(upper) ? upper : 'EGP';
};
const normalizeStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};
const LAUNCH_STATUS_MAP = {
  'available': Prisma.LaunchStatus?.AVAILABLE || 'AVAILABLE',
  'coming soon': Prisma.LaunchStatus?.COMING_SOON || 'COMING_SOON',
  'pre-launch': Prisma.LaunchStatus?.PRE_LAUNCH || 'PRE_LAUNCH',
  'sold out': Prisma.LaunchStatus?.SOLD_OUT || 'SOLD_OUT',
};
const LAUNCH_PROPERTY_TYPE_MAP = {
  villa: Prisma.LaunchPropertyType?.VILLA || 'VILLA',
  apartment: Prisma.LaunchPropertyType?.APARTMENT || 'APARTMENT',
  townhouse: Prisma.LaunchPropertyType?.TOWNHOUSE || 'TOWNHOUSE',
  penthouse: Prisma.LaunchPropertyType?.PENTHOUSE || 'PENTHOUSE',
  duplex: Prisma.LaunchPropertyType?.DUPLEX || 'DUPLEX',
  studio: Prisma.LaunchPropertyType?.STUDIO || 'STUDIO',
  commercial: Prisma.LaunchPropertyType?.COMMERCIAL || 'COMMERCIAL',
  land: Prisma.LaunchPropertyType?.LAND || 'LAND',
};

/**
 * Get template data for a given entity type
 * @param {String} entityType - Type of entity
 * @returns {Array|undefined} Template array or undefined if not found
 */
const getTemplateData = (entityType) => {
  // Templates are defined inline in the JSON endpoint route handler
  // This function will be called from within the route to avoid duplication
  // For now, return null and use inline definition
  return null;
};

/**
 * POST /api/bulk-uploads/users
 * Bulk upload users (Admin only)
 */
router.post('/users', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of user objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Validate all records
    const validation = await validateUsers(records);

    // If there are validation errors (not just skipped duplicates), return them
    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - validation.errors.length - validation.skipped.length,
          failed: validation.errors.length,
          skipped: validation.skipped.length
        },
        errors: validation.errors,
        skipped: validation.skipped
      });
    }

    // If ALL records are duplicates, return early
    if (validation.skipped.length === records.length) {
      return res.status(200).json({
        success: true,
        message: 'All records are duplicates - nothing to import',
        summary: {
          total: records.length,
          imported: 0,
          skipped: validation.skipped.length,
          failed: 0
        },
        skippedRecords: validation.skipped
      });
    }

    // Prepare records for insertion (excluding skipped ones)
    const skippedIndices = new Set(validation.skipped.map(s => s.index));
    const validRecords = records.filter((_, index) => !skippedIndices.has(index));

    // Process profile images
    const imageWarnings = [];
    for (let i = 0; i < validRecords.length; i++) {
      if (validRecords[i].profileImage) {
        const resolvedUrl = await resolveImageUrl(validRecords[i].profileImage);
        if (resolvedUrl) {
          validRecords[i].profileImage = resolvedUrl;
        } else {
          imageWarnings.push({
            record: validRecords[i],
            field: 'profileImage',
            reason: `Image '${validRecords[i].profileImage}' not found in Cloudinary`
          });
          validRecords[i].profileImage = null;
        }
      }
    }

    // Hash passwords before insertion (insertMany bypasses pre-save hooks)
    for (let i = 0; i < validRecords.length; i++) {
      if (validRecords[i].password) {
        const salt = await bcrypt.genSalt(12);
        validRecords[i].password = await bcrypt.hash(validRecords[i].password, salt);
      }
    }

    const preparedRecords = validRecords.map((record) => {
      const roleKey = (record.role || 'user').toLowerCase();
      const prismaRole = toPrismaUserRole(roleKey);
      const hierarchy = record.hierarchy ?? getHierarchyForRole(roleKey);
      const permissions = record.permissions ?? buildPermissionsForRole(roleKey);

      return {
        name: record.name?.trim(),
        email: record.email.toLowerCase(),
        phone: record.phone,
        password: record.password,
        role: prismaRole,
        hierarchy,
        permissions,
        isActive: record.isActive ?? true,
        profileImage: record.profileImage || null,
        preferences: record.preferences ?? Prisma.JsonNull,
        lastLogin: record.lastLogin ? new Date(record.lastLogin) : null,
        isEmailVerified: record.isEmailVerified ?? false,
        bio: record.bio || null,
        location: record.location || null,
        subscribeToNewsletter: record.subscribeToNewsletter ?? false,
        activityStats: record.activityStats ?? Prisma.JsonNull,
      };
    });

    let insertedUsersCount = 0;
    if (preparedRecords.length > 0) {
      const result = await prisma.user.createMany({
        data: preparedRecords,
        skipDuplicates: true,
      });
      insertedUsersCount = result.count;
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedUsersCount} users`,
      summary: {
        total: records.length,
        imported: insertedUsersCount,
        skipped: validation.skipped.length,
        failed: 0
      },
      skippedRecords: validation.skipped,
      imageWarnings: imageWarnings
    });
  } catch (error) {
    console.error('Bulk upload users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload users',
      error: error.message
    });
  }
});

/**
 * POST /api/bulk-uploads/developers
 * Bulk upload developers
 */
router.post('/developers', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of developer objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Validate all records
    const validation = await validateDevelopers(records);

    // If there are validation errors, return them
    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - validation.errors.length - validation.skipped.length,
          failed: validation.errors.length,
          skipped: validation.skipped.length
        },
        errors: validation.errors,
        skipped: validation.skipped
      });
    }

    // If ALL records are duplicates, return early
    if (validation.skipped.length === records.length) {
      return res.status(200).json({
        success: true,
        message: 'All records are duplicates - nothing to import',
        summary: {
          total: records.length,
          imported: 0,
          skipped: validation.skipped.length,
          failed: 0
        },
        skippedRecords: validation.skipped
      });
    }

    // Prepare records for insertion (excluding skipped ones)
    const skippedIndices = new Set(validation.skipped.map(s => s.index));
    const validRecords = records.filter((_, index) => !skippedIndices.has(index));

    // Process logo images
    const imageWarnings = [];
    for (let i = 0; i < validRecords.length; i++) {
      if (validRecords[i].logo) {
        const resolvedUrl = await resolveImageUrl(validRecords[i].logo);
        if (resolvedUrl) {
          validRecords[i].logo = resolvedUrl;
        } else {
          imageWarnings.push({
            record: validRecords[i],
            field: 'logo',
            reason: `Image '${validRecords[i].logo}' not found in Cloudinary`
          });
          validRecords[i].logo = null;
        }
      }
    }

    const preparedRecords = validRecords.map((record) => ({
      name: record.name?.trim(),
      slug: slugify(record.slug || record.name || `developer-${Date.now()}`),
      logo: record.logo || null,
      description: record.description || null
    }));

    let insertedDevelopersCount = 0;
    if (preparedRecords.length > 0) {
      const result = await prisma.developer.createMany({
        data: preparedRecords,
        skipDuplicates: true
      });
      insertedDevelopersCount = result.count;
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedDevelopersCount} developers`,
      summary: {
        total: records.length,
        imported: insertedDevelopersCount,
        skipped: validation.skipped.length,
        failed: 0
      },
      skippedRecords: validation.skipped,
      imageWarnings: imageWarnings
    });
  } catch (error) {
    console.error('Bulk upload developers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload developers',
      error: error.message
    });
  }
});

/**
 * POST /api/bulk-uploads/governorates
 * Bulk upload governorates
 */
router.post('/governorates', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of governorate objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Validate all records
    const validation = await validateGovernorates(records);

    // If there are validation errors, return them
    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - validation.errors.length - validation.skipped.length,
          failed: validation.errors.length,
          skipped: validation.skipped.length
        },
        errors: validation.errors,
        skipped: validation.skipped
      });
    }

    // If ALL records are duplicates, return early
    if (validation.skipped.length === records.length) {
      return res.status(200).json({
        success: true,
        message: 'All records are duplicates - nothing to import',
        summary: {
          total: records.length,
          imported: 0,
          skipped: validation.skipped.length,
          failed: 0
        },
        skippedRecords: validation.skipped
      });
    }

    // Prepare records for insertion (excluding skipped ones)
    const skippedIndices = new Set(validation.skipped.map(s => s.index));
    const validRecords = records.filter((_, index) => !skippedIndices.has(index));

    const preparedRecords = validRecords.map((record) => ({
      name: record.name?.trim(),
      slug: slugify(record.slug || record.name || `governorate-${Date.now()}`),
      annualAppreciationRate: record.annualAppreciationRate ?? 0,
      description: record.description || null
    }));

    let insertedGovernoratesCount = 0;
    if (preparedRecords.length > 0) {
      const result = await prisma.governorate.createMany({
        data: preparedRecords,
        skipDuplicates: true
      });
      insertedGovernoratesCount = result.count;
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedGovernoratesCount} governorates`,
      summary: {
        total: records.length,
        imported: insertedGovernoratesCount,
        skipped: validation.skipped.length,
        failed: 0
      },
      skippedRecords: validation.skipped
    });
  } catch (error) {
    console.error('Bulk upload governorates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload governorates',
      error: error.message
    });
  }
});

/**
 * POST /api/bulk-uploads/cities
 * Bulk upload cities
 */
router.post('/cities', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of city objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Validate all records
    const validation = await validateCities(records);

    // If there are validation errors, return them
    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - validation.errors.length - validation.skipped.length,
          failed: validation.errors.length,
          skipped: validation.skipped.length
        },
        errors: validation.errors,
        skipped: validation.skipped
      });
    }

    // If ALL records are duplicates, return early
    if (validation.skipped.length === records.length) {
      return res.status(200).json({
        success: true,
        message: 'All records are duplicates - nothing to import',
        summary: {
          total: records.length,
          imported: 0,
          skipped: validation.skipped.length,
          failed: 0
        },
        skippedRecords: validation.skipped
      });
    }

    // Prepare records for insertion (excluding skipped ones)
    const skippedIndices = new Set(validation.skipped.map(s => s.index));
    const validRecords = records.filter((_, index) => !skippedIndices.has(index));

    for (let i = 0; i < validRecords.length; i += 1) {
      if (validRecords[i].governorate) {
        const resolved = await resolveEntityReferences(validRecords[i], 'city');
        if (resolved.governorate_ref || resolved.governorate) {
          validRecords[i].governorateId = resolved.governorate_ref || resolved.governorate;
        } else {
          validRecords[i].governorateId = null;
        }
      } else {
        validRecords[i].governorateId = null;
      }
      delete validRecords[i].governorate;
    }

    const preparedRecords = validRecords.map((record) => ({
      name: record.name?.trim(),
      slug: slugify(record.slug || record.name || `city-${Date.now()}`),
      governorateId: record.governorateId,
      annualAppreciationRate: record.annualAppreciationRate ?? 0,
      description: record.description || null
    }));

    let insertedCitiesCount = 0;
    if (preparedRecords.length > 0) {
      const result = await prisma.city.createMany({
        data: preparedRecords,
        skipDuplicates: true
      });
      insertedCitiesCount = result.count;
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedCitiesCount} cities`,
      summary: {
        total: records.length,
        imported: insertedCitiesCount,
        skipped: validation.skipped.length,
        failed: 0
      },
      skippedRecords: validation.skipped
    });
  } catch (error) {
    console.error('Bulk upload cities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload cities',
      error: error.message
    });
  }
});

/**
 * POST /api/bulk-uploads/areas
 * Bulk upload areas
 */
router.post('/areas', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of area objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Resolve entity references for all records
    const resolvedReferences = [];
    for (const record of records) {
      const resolved = await resolveEntityReferences(record, 'area');
      resolvedReferences.push(resolved);
    }

    // Validate all records
    const validationResults = [];
    for (let i = 0; i < records.length; i++) {
      const validation = await validateAreas([records[i]], [resolvedReferences[i]]);
      if (validation.errors.length > 0) {
        validationResults.push({
          index: i,
          record: records[i],
          errors: validation.errors[0].errors
        });
      }
      if (validation.skipped.length > 0) {
        validationResults.push({
          index: i,
          record: records[i],
          skipped: true,
          reason: validation.skipped[0].reason
        });
      }
    }

    // Separate errors and skipped
    const errors = validationResults.filter(v => v.errors);
    const skipped = validationResults.filter(v => v.skipped);

    // If there are validation errors, return them
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - errors.length - skipped.length,
          failed: errors.length,
          skipped: skipped.length
        },
        errors: errors,
        skipped: skipped
      });
    }

    // If ALL records are duplicates, return early
    if (skipped.length === records.length) {
      return res.status(200).json({
        success: true,
        message: 'All records are duplicates - nothing to import',
        summary: {
          total: records.length,
          imported: 0,
          skipped: skipped.length,
          failed: 0
        },
        skippedRecords: skipped
      });
    }

    // Prepare records for insertion (excluding skipped ones)
    const skippedIndices = new Set(skipped.map(s => s.index));
    const validRecords = [];
    const validResolvedRefs = [];
    
    for (let i = 0; i < records.length; i += 1) {
      if (!skippedIndices.has(i)) {
        validRecords.push(records[i]);
        validResolvedRefs.push(resolvedReferences[i]);
      }
    }

    const preparedRecords = validRecords.map((record, index) => ({
      name: record.name?.trim(),
      slug: slugify(record.slug || record.name || `area-${Date.now()}-${index}`),
      cityId: validResolvedRefs[index]?.city_ref || validResolvedRefs[index]?.city || null,
      annualAppreciationRate: record.annualAppreciationRate ?? 0,
      description: record.description || null
    }));

    let insertedAreasCount = 0;
    if (preparedRecords.length > 0) {
      const result = await prisma.area.createMany({
        data: preparedRecords,
        skipDuplicates: true
      });
      insertedAreasCount = result.count;
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedAreasCount} areas`,
      summary: {
        total: records.length,
        imported: insertedAreasCount,
        skipped: skipped.length,
        failed: 0
      },
      skippedRecords: skipped
    });
  } catch (error) {
    console.error('Bulk upload areas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload areas',
      error: error.message
    });
  }
});

/**
 * POST /api/bulk-uploads/properties
 * Bulk upload properties
 */
router.post('/properties', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of property objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Clear entity creation cache before processing this batch
    clearEntityCreationCache();
    
    // Resolve entity references for all records (with auto-creation enabled)
    console.log('Resolving entity references (with auto-creation)...');
    const resolvedReferences = [];
    for (let i = 0; i < records.length; i++) {
      const resolved = await resolveEntityReferences(records[i], 'property', true); // autoCreate = true
      resolvedReferences.push(resolved);
      if ((i + 1) % 10 === 0) {
        console.log(`  Processed ${i + 1}/${records.length} records...`);
      }
    }

    // Validate all records
    const validationResults = [];
    for (let i = 0; i < records.length; i++) {
      const validation = await validateProperties([records[i]], resolvedReferences[i]);
      if (validation.errors.length > 0) {
        validationResults.push({
          index: i,
          record: records[i],
          errors: validation.errors[0].errors
        });
      }
    }

    // If there are validation errors, return them
    if (validationResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - validationResults.length,
          failed: validationResults.length,
          skipped: 0
        },
        errors: validationResults
      });
    }

    // Process all records with optimized parallel processing
    console.log(`Processing ${records.length} properties with optimized batch processing...`);
    const startTime = Date.now();
    
    const validRecords = [];
    const imageWarnings = [];

    // Helper function to process a single record
    const processRecord = async (record, resolvedRef, index) => {
      const processedRecord = { ...record };

      processedRecord.developerId = resolvedRef.developer || null;
      delete processedRecord.developer;

      const userHierarchy = req.user.hierarchy || 5;
      let canAutoApprove = false;
      if (req.user.role === 'admin' || userHierarchy === 1) {
        canAutoApprove = true;
      } else if (userHierarchy <= 3) {
        canAutoApprove = req.user.permissions?.canApproveProperties === true;
      }

      const typeKey = processedRecord.type?.toLowerCase?.();
      const statusKey = processedRecord.status?.toLowerCase?.();
      const developerStatusKey = processedRecord.developerStatus?.toLowerCase?.();

      processedRecord.type = TYPE_MAP[typeKey] || TYPE_MAP.apartment;
      processedRecord.status = STATUS_MAP[statusKey] || STATUS_MAP['for-sale'];
      processedRecord.developerStatus = developerStatusKey ? DEVELOPER_STATUS_MAP[developerStatusKey] || null : null;

      processedRecord.price = toDecimalOrNull(processedRecord.price);
      processedRecord.currency = normalizeCurrency(processedRecord.currency);

      processedRecord.features = ensureArrayValue(processedRecord.features);
      processedRecord.amenities = ensureArrayValue(processedRecord.amenities);

      processedRecord.createdById = resolvedRef.createdBy || req.user.id;
      processedRecord.submittedById = req.user.id;
      processedRecord.approvalStatus = canAutoApprove
        ? APPROVAL_STATUS_MAP.approved
        : APPROVAL_STATUS_MAP.pending;
      processedRecord.approvedById = canAutoApprove ? req.user.id : null;
      processedRecord.approvalDate = canAutoApprove ? new Date() : null;
      processedRecord.rejectionReason = null;

      processedRecord.governorateId = resolvedRef.governorate_ref || null;
      processedRecord.cityId = resolvedRef.city_ref || null;
      processedRecord.areaId = resolvedRef.area_ref || null;
      processedRecord.useNewLocationStructure = Boolean(
        resolvedRef.governorate_ref || resolvedRef.city_ref || resolvedRef.area_ref
      );

      delete processedRecord.governorate_ref;
      delete processedRecord.city_ref;
      delete processedRecord.area_ref;
      delete processedRecord.createdBy;
      delete processedRecord.submittedBy;
      delete processedRecord.approvedBy;

      // Process images array in parallel
      if (processedRecord.images && Array.isArray(processedRecord.images)) {
        try {
          // Process all images in parallel instead of sequentially
          const imageResults = await Promise.allSettled(
            processedRecord.images.map(img => resolveImageObject(img))
          );
          
          const resolvedImages = [];
          imageResults.forEach((result, imgIndex) => {
            if (result.status === 'fulfilled' && result.value) {
              resolvedImages.push(result.value);
            } else {
              const originalImg = processedRecord.images[imgIndex];
              imageWarnings.push({
                record: processedRecord.title,
                field: 'images',
                reason: `Image '${typeof originalImg === 'string' ? originalImg : originalImg.url || originalImg.publicId}' not found or invalid`
              });
            }
          });
          
          processedRecord.images = resolvedImages;
        } catch (error) {
          console.error(`Error processing images for record ${index}:`, error);
          processedRecord.images = [];
        }
      }

      // Process video thumbnail
      if (processedRecord.video && processedRecord.video.thumbnail) {
        try {
          const resolvedUrl = await resolveImageUrl(processedRecord.video.thumbnail);
          if (resolvedUrl) {
            processedRecord.video.thumbnail = resolvedUrl;
          } else {
            imageWarnings.push({
              record: processedRecord.title,
              field: 'video.thumbnail',
              reason: `Thumbnail '${processedRecord.video.thumbnail}' not found`
            });
            delete processedRecord.video.thumbnail;
          }
        } catch (error) {
          console.error(`Error processing video thumbnail for record ${index}:`, error);
          delete processedRecord.video.thumbnail;
        }
      }

      processedRecord.location = processedRecord.location || null;
      processedRecord.specifications = processedRecord.specifications || null;
      processedRecord.images = processedRecord.images || [];
      processedRecord.video = processedRecord.video || null;
      processedRecord.virtualTour = processedRecord.virtualTour || null;
      processedRecord.floorPlan = processedRecord.floorPlan || null;
      processedRecord.masterPlan = processedRecord.masterPlan || null;
      processedRecord.nearbyFacilities = processedRecord.nearbyFacilities || null;
      processedRecord.investment = processedRecord.investment || null;
      processedRecord.documents = processedRecord.documents || null;

      return processedRecord;
    };

    // Process records in chunks for better performance and memory management
    const CHUNK_SIZE = 50; // Process 50 records at a time
    const chunks = [];
    
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      chunks.push({
        records: records.slice(i, i + CHUNK_SIZE),
        references: resolvedReferences.slice(i, i + CHUNK_SIZE),
        startIndex: i
      });
    }

    console.log(`Processing ${chunks.length} chunks of ${CHUNK_SIZE} records each...`);

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} (records ${chunk.startIndex + 1}-${Math.min(chunk.startIndex + CHUNK_SIZE, records.length)})...`);
      
      try {
        // Process all records in this chunk in parallel
        const chunkResults = await Promise.allSettled(
          chunk.records.map((record, index) => 
            processRecord(record, chunk.references[index], chunk.startIndex + index)
          )
        );

        // Collect successful results
        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            validRecords.push(result.value);
          } else {
            console.error(`Failed to process record ${chunk.startIndex + index}:`, result.reason);
            imageWarnings.push({
              record: chunk.records[index].title || `Record ${chunk.startIndex + index + 1}`,
              field: 'processing',
              reason: `Failed to process record: ${result.reason.message || result.reason}`
            });
          }
        });
        
        console.log(`Chunk ${chunkIndex + 1} completed. Processed: ${chunkResults.filter(r => r.status === 'fulfilled').length}/${chunk.records.length}`);
      } catch (error) {
        console.error(`Error processing chunk ${chunkIndex + 1}:`, error);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`Image processing completed in ${processingTime}ms. Valid records: ${validRecords.length}`);

    let insertedPropertiesCount = 0;
    if (validRecords.length > 0) {
      console.log(`Inserting ${validRecords.length} properties into database...`);
      const insertStartTime = Date.now();
      try {
        const result = await prisma.property.createMany({
          data: validRecords,
          skipDuplicates: false
        });
        insertedPropertiesCount = result.count;
        const insertTime = Date.now() - insertStartTime;
        console.log(`Database insertion completed in ${insertTime}ms. Inserted: ${insertedPropertiesCount} properties`);
      } catch (error) {
        console.error('Database insertion error:', error);
        throw error;
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedPropertiesCount} properties`,
      summary: {
        total: records.length,
        imported: insertedPropertiesCount,
        skipped: 0,
        failed: 0
      },
      imageWarnings: imageWarnings
    });
  } catch (error) {
    console.error('Bulk upload properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload properties',
      error: error.message
    });
  }
});

/**
 * POST /api/bulk-uploads/leads
 * Bulk upload leads
 */
router.post('/leads', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of lead objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Validate all records
    const validation = await validateLeads(records);

    // If there are validation errors, return them
    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - validation.errors.length - validation.skipped.length,
          failed: validation.errors.length,
          skipped: validation.skipped.length
        },
        errors: validation.errors,
        skipped: validation.skipped
      });
    }

    // If ALL records are duplicates, return early
    if (validation.skipped.length === records.length) {
      return res.status(200).json({
        success: true,
        message: 'All records are duplicates - nothing to import',
        summary: {
          total: records.length,
          imported: 0,
          skipped: validation.skipped.length,
          failed: 0
        },
        skippedRecords: validation.skipped
      });
    }

    // Prepare records for insertion (excluding skipped ones)
    const skippedIndices = new Set(validation.skipped.map(s => s.index));
    const validRecords = records.filter((_, index) => !skippedIndices.has(index));

    for (let i = 0; i < validRecords.length; i += 1) {
      if (validRecords[i].assignedTo) {
        const resolved = await resolveEntityReferences(validRecords[i], 'lead');
        validRecords[i].assignedToId = resolved.assignedTo || null;
      } else {
        validRecords[i].assignedToId = null;
      }
      delete validRecords[i].assignedTo;
    }

    const preparedRecords = validRecords.map((record) => ({
      name: record.name?.trim(),
      email: record.email?.toLowerCase(),
      phone: record.phone,
      requiredService: record.requiredService,
      propertyType: TYPE_MAP[record.propertyType?.toLowerCase?.()] || TYPE_MAP.apartment,
      purpose: record.purpose,
      budget: record.budget || null,
      preferredLocation: normalizeStringArray(record.preferredLocation),
      location: record.location || null,
      timeline: record.timeline || 'flexible',
      status: record.status || 'new',
      priority: record.priority || 'medium',
      assignedToId: record.assignedToId,
      source: record.source || 'landing-page',
      notes: record.notes || null,
      followUpDate: record.followUpDate ? new Date(record.followUpDate) : null,
      isRead: record.isRead ?? false,
      lastContactDate: record.lastContactDate ? new Date(record.lastContactDate) : null,
      isArchived: record.isArchived ?? false,
      archivedAt: record.archivedAt ? new Date(record.archivedAt) : null
    }));

    let insertedLeadsCount = 0;
    if (preparedRecords.length > 0) {
      const result = await prisma.lead.createMany({
        data: preparedRecords,
        skipDuplicates: false
      });
      insertedLeadsCount = result.count;
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedLeadsCount} leads`,
      summary: {
        total: records.length,
        imported: insertedLeadsCount,
        skipped: validation.skipped.length,
        failed: 0
      },
      skippedRecords: validation.skipped
    });
  } catch (error) {
    console.error('Bulk upload leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload leads',
      error: error.message
    });
  }
});

/**
 * POST /api/bulk-uploads/launches
 * Bulk upload launches
 */
router.post('/launches', authMiddleware, hierarchyMiddleware(1), async (req, res) => {
  try {
    const records = req.body;

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of launch objects'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided'
      });
    }

    if (records.length > MAX_RECORDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECORDS} records allowed per upload`
      });
    }

    // Resolve entity references for all records
    const resolvedReferences = [];
    for (const record of records) {
      const resolved = await resolveEntityReferences(record, 'launch');
      resolvedReferences.push(resolved);
    }

    // Validate all records
    const validationResults = [];
    for (let i = 0; i < records.length; i++) {
      const validation = await validateLaunches([records[i]], resolvedReferences[i]);
      if (validation.errors.length > 0) {
        validationResults.push({
          index: i,
          record: records[i],
          errors: validation.errors[0].errors
        });
      }
    }

    // If there are validation errors, return them
    if (validationResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        summary: {
          total: records.length,
          validated: records.length - validationResults.length,
          failed: validationResults.length,
          skipped: 0
        },
        errors: validationResults
      });
    }

    // Process all records
    const validRecords = [];
    const imageWarnings = [];

    for (let i = 0; i < records.length; i++) {
      const record = { ...records[i] };

      record.createdById = resolvedReferences[i].createdBy || req.user.id;
      record.updatedById = resolvedReferences[i].updatedBy || null;

      // Process main image
      if (record.image) {
        const resolvedUrl = await resolveImageUrl(record.image);
        if (resolvedUrl) {
          record.image = resolvedUrl;
        } else {
          imageWarnings.push({
            record: record.title,
            field: 'image',
            reason: `Image '${record.image}' not found in Cloudinary`
          });
          // Keep the original reference even if not found
        }
      }

      // Process images array
      if (record.images && Array.isArray(record.images)) {
        const resolvedImages = [];
        for (const img of record.images) {
          const resolvedUrl = await resolveImageUrl(img);
          if (resolvedUrl) {
            resolvedImages.push(resolvedUrl);
          } else {
            imageWarnings.push({
              record: record.title,
              field: 'images',
              reason: `Image '${img}' not found in Cloudinary`
            });
          }
        }
        record.images = resolvedImages;
      }

      validRecords.push(record);
    }

    const preparedLaunches = validRecords.map((record) => {
      const statusKey = record.status?.toLowerCase?.();
      const propertyTypeKey = record.propertyType?.toLowerCase?.();
      return {
        title: record.title?.trim(),
        developer: record.developer,
        description: record.description,
        content: record.content,
        image: record.image,
        images: normalizeStringArray(record.images),
        location: record.location,
        propertyType: LAUNCH_PROPERTY_TYPE_MAP[propertyTypeKey] || $Enums.LaunchPropertyType.APARTMENT,
        status: LAUNCH_STATUS_MAP[statusKey] || $Enums.LaunchStatus.AVAILABLE,
        startingPrice: toDecimalOrNull(record.startingPrice) || new Prisma.Decimal(0),
        currency: normalizeCurrency(record.currency),
        launchDate: record.launchDate ? new Date(record.launchDate) : new Date(),
        completionDate: record.completionDate ? new Date(record.completionDate) : null,
        area: Number(record.area) || 0,
        areaUnit: record.areaUnit || 'sqm',
        bedrooms: record.bedrooms !== undefined ? Number(record.bedrooms) : null,
        bathrooms: record.bathrooms !== undefined ? Number(record.bathrooms) : null,
        features: normalizeStringArray(record.features),
        amenities: normalizeStringArray(record.amenities),
        isFeatured: record.isFeatured ?? false,
        isActive: record.isActive ?? true,
        contactInfo: record.contactInfo || null,
        coordinates: record.coordinates || null,
        nearbyFacilities: record.nearbyFacilities || null,
        paymentPlans: record.paymentPlans || null,
        createdById: record.createdById,
        updatedById: record.updatedById
      };
    });

    let insertedLaunchesCount = 0;
    if (preparedLaunches.length > 0) {
      const result = await prisma.launch.createMany({
        data: preparedLaunches,
        skipDuplicates: false
      });
      insertedLaunchesCount = result.count;
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedLaunchesCount} launches`,
      summary: {
        total: records.length,
        imported: insertedLaunchesCount,
        skipped: 0,
        failed: 0
      },
      imageWarnings: imageWarnings
    });
  } catch (error) {
    console.error('Bulk upload launches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload launches',
      error: error.message
    });
  }
});

/**
 * Flatten a nested object into dot-notation keys for Excel columns
 * @param {Object} obj - Object to flatten
 * @param {String} prefix - Prefix for keys
 * @returns {Object} Flattened object
 */
const flattenObject = (obj, prefix = '') => {
  const flattened = {};
  
  for (const key in obj) {
    if (key === '_comment') continue; // Skip comments
    
    const newKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (value === null || value === undefined) {
      continue;
    }
    
    if (Array.isArray(value)) {
      // Handle arrays
      if (value.length === 0) {
        flattened[newKey] = '';
      } else if (typeof value[0] === 'object') {
        // Complex array - convert to JSON string
        flattened[newKey] = JSON.stringify(value);
      } else {
        // Simple array - join with commas
        flattened[newKey] = value.join(', ');
      }
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
};

/**
 * GET /api/bulk-uploads/template/:entityType
 * Download JSON template for entity type
 */
router.get('/template/:entityType', (req, res) => {
  const { entityType } = req.params;

  const templates = {
    governorates: [
      {
        name: 'Cairo',
        annualAppreciationRate: 7.5,
        description: 'The capital and largest city of Egypt, a major metropolitan area'
      },
      {
        name: 'Giza',
        annualAppreciationRate: 6.8,
        description: 'Home to the Great Pyramids and growing residential areas'
      }
    ],
    areas: [
      {
        name: 'Fifth Settlement',
        city: 'New Cairo',
        annualAppreciationRate: 9.2,
        description: 'Premium residential and commercial district in New Cairo'
      },
      {
        _comment: 'city can be either ObjectId or name (will be resolved automatically)',
        name: 'Maadi Degla',
        city: 'Maadi',
        annualAppreciationRate: 6.5,
        description: 'Upscale neighborhood known for expat community'
      }
    ],
    users: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+201234567890',
        password: 'default123',
        role: 'user',
        isActive: true,
        profileImage: 'user-profile-pic',
        bio: 'Sample bio',
        location: 'Cairo, Egypt',
        isEmailVerified: false,
        preferences: {
          propertyTypes: ['villa', 'apartment'],
          locations: ['New Cairo', 'Sheikh Zayed'],
          priceRange: {
            min: 2000000,
            max: 5000000
          }
        }
      },
      {
        _comment: 'Example with sales role - roles: user, admin, sales_manager, sales_team_leader, sales_agent',
        name: 'Ahmed Hassan',
        email: 'ahmed@basira.com',
        phone: '+201234567891',
        password: 'secure123',
        role: 'sales_agent',
        isActive: true,
        bio: 'Real estate sales professional',
        location: 'Dubai, UAE'
      }
    ],
    developers: [
      {
        name: 'Emaar',
        logo: 'emaar-logo',
        description: 'Leading real estate developer in the Middle East'
      },
      {
        name: 'Sodic',
        logo: 'sodic-logo',
        description: 'Premium Egyptian real estate developer'
      }
    ],
    cities: [
      {
        name: 'New Cairo',
        governorate: 'Cairo',
        annualAppreciationRate: 8.5,
        description: 'Modern suburb of Cairo with residential and commercial developments'
      },
      {
        _comment: 'governorate can be either ObjectId or name (will be resolved automatically)',
        name: 'Sheikh Zayed',
        governorate: 'Giza',
        annualAppreciationRate: 7.2,
        description: 'Upscale residential area west of Cairo'
      }
    ],
    properties: [
      {
        _comment: "Example 1: NEW HIERARCHICAL LOCATION STRUCTURE (Recommended)",
        title: 'Luxury Villa in Fifth Settlement',
        description: 'Beautiful 4-bedroom villa with garden and pool. This stunning property offers modern amenities and spacious living areas perfect for families.',
        type: 'villa',
        status: 'for-sale',
        developerStatus: 'on-plan',
        developer: 'Emaar',
        price: 5000000,
        currency: 'EGP',
        governorate_ref: 'Cairo',
        city_ref: 'New Cairo',
        area_ref: 'Fifth Settlement',
        location: {
          address: '123 Main Street, Fifth Settlement',
          country: 'Egypt',
          coordinates: {
            latitude: 30.0444,
            longitude: 31.2357
          }
        },
        specifications: {
          bedrooms: 4,
          bathrooms: 3,
          area: 300,
          areaUnit: 'sqm',
          floors: 2,
          parking: 2,
          furnished: 'semi-furnished'
        },
        features: ['pool', 'garden', 'balcony', 'gym'],
        images: [
          {
            url: 'villa-001-img1',
            caption: 'Front view',
            isHero: true,
            order: 0
          },
          {
            url: 'villa-001-img2',
            caption: 'Living room',
            order: 1
          },
          {
            url: 'villa-001-img3',
            caption: 'Garden area',
            order: 2
          }
        ],
        video: {
          url: 'https://www.youtube.com/watch?v=example',
          thumbnail: 'villa-001-video-thumb'
        },
        virtualTour: {
          url: 'https://tour.example.com/villa-001',
          type: '360'
        },
        amenities: ['security', 'maintenance', 'gym', 'pool'],
        nearbyFacilities: [
          {
            name: 'American International School',
            type: 'school',
            distance: 500
          },
          {
            name: 'Cairo Festival City Mall',
            type: 'mall',
            distance: 1200
          },
          {
            name: 'Cleopatra Hospital',
            type: 'hospital',
            distance: 800
          }
        ],
        investment: {
          expectedROI: 12.5,
          rentalYield: 8.2,
          pricePerSqft: 16667
        },
        documents: [
          {
            name: 'Floor Plan',
            url: 'villa-001-floorplan.pdf',
            type: 'floor-plan'
          },
          {
            name: 'Title Deed',
            url: 'villa-001-deed.pdf',
            type: 'title-deed'
          }
        ],
        isFeatured: true,
        isActive: true,
        
      },
      {
        _comment: "Example 2: OLD LOCATION STRUCTURE (Backward Compatibility)",
        title: 'Modern Apartment in Downtown',
        description: 'Spacious 2-bedroom apartment with city view',
        type: 'apartment',
        status: 'for-rent',
        price: 15000,
        currency: 'EGP',
        location: {
          address: '456 Downtown Street',
          city: 'Cairo',
          state: 'Cairo',
          country: 'Egypt',
          coordinates: {
            latitude: 30.0444,
            longitude: 31.2357
          }
        },
        specifications: {
          bedrooms: 2,
          bathrooms: 2,
          area: 120,
          areaUnit: 'sqm',
          furnished: 'furnished'
        },
        features: ['balcony', 'parking'],
        images: ['apt-002-img1'],
        amenities: ['elevator', 'concierge'],
        nearbyFacilities: [
          {
            name: 'Metro Station',
            type: 'metro',
            distance: 300
          }
        ],
        isFeatured: false,
        isActive: true,
        
      }
    ],
    leads: [
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+201234567890',
        requiredService: 'buy',
        propertyType: 'apartment',
        purpose: 'investment',
        budget: {
          min: 2000000,
          max: 3000000,
          currency: 'AED'
        },
        preferredLocation: ['Dubai Marina', 'Downtown Dubai'],
        location: 'Dubai Marina',
        timeline: '3-6-months',
        status: 'new',
        priority: 'medium',
        source: 'landing-page',
        assignedTo: 'abdulrhman@hotmail.com',
        followUpDate: '2025-11-15',
        isRead: false,
        isArchived: false
      },
      {
        _comment: 'Example with chat source - source options: landing-page, contact-form, phone, referral, social-media, chat, chat-ai',
        name: 'Ahmed Ali',
        email: 'ahmed.ali@example.com',
        phone: '+971501234567',
        requiredService: 'rent',
        propertyType: 'villa',
        purpose: 'personal-use',
        budget: {
          min: 150000,
          max: 250000,
          currency: 'AED'
        },
        preferredLocation: ['Arabian Ranches', 'The Springs'],
        location: 'Arabian Ranches',
        timeline: 'immediate',
        status: 'contacted',
        priority: 'high',
        source: 'chat-ai',
        notes: [
          {
            note: 'Customer interested in 4-bedroom villa with pool',
            createdAt: '2025-11-01T10:30:00Z'
          }
        ],
        assignedTo: 'abdulrhman@hotmail.com',
        followUpDate: '2025-11-05',
        lastContactDate: '2025-11-01',
        isRead: true,
        isArchived: false
      }
    ],
    launches: [
      {
        title: 'Oceanfront Towers',
        developer: 'Emaar Properties',
        description: 'Luxurious beachfront apartments with stunning Mediterranean views',
        content: 'Experience luxury living with stunning ocean views and world-class amenities. Oceanfront Towers offers modern design, premium finishes, and an unbeatable location in the heart of New Cairo.',
        image: 'launch-oceanfront-main',
        images: ['launch-oceanfront-1', 'launch-oceanfront-2', 'launch-oceanfront-3'],
        location: 'New Cairo',
        propertyType: 'Apartment',
        status: 'Available',
        startingPrice: 1500000,
        currency: 'EGP',
        launchDate: '2025-03-01',
        completionDate: '2027-12-31',
        area: 120,
        areaUnit: 'sqm',
        bedrooms: 2,
        bathrooms: 2,
        features: ['Smart home', 'Balcony', 'Storage', 'Walk-in closet'],
        amenities: ['Pool', 'Gym', 'Beach access', 'Parking', 'Concierge', '24/7 Security'],
        coordinates: {
          latitude: 30.0444,
          longitude: 31.2357
        },
        nearbyFacilities: [
          {
            name: 'Cairo International School',
            type: 'School',
            distance: 1500,
            distanceUnit: 'm'
          },
          {
            name: 'El Galaa Hospital',
            type: 'Hospital',
            distance: 2000,
            distanceUnit: 'm'
          },
          {
            name: 'Cairo Festival City Mall',
            type: 'Mall',
            distance: 800,
            distanceUnit: 'm'
          },
          {
            name: 'Metro Station',
            type: 'Transportation',
            distance: 500,
            distanceUnit: 'm'
          }
        ],
        paymentPlans: [
          {
            name: 'Standard Plan',
            description: '10% down payment with flexible installments',
            downPayment: 10,
            installments: 60,
            installmentPeriod: 'monthly'
          },
          {
            name: 'Premium Plan',
            description: '20% down payment with extended payment schedule',
            downPayment: 20,
            installments: 84,
            installmentPeriod: 'monthly'
          }
        ],
        isFeatured: true,
        isActive: true,
        contactInfo: {
          phone: '+201234567890',
          email: 'sales@emaar.com',
          website: 'https://emaar.com'
        },
        createdBy: 'abdulrhman@hotmail.com'
      },
      {
        _comment: 'Example 2: Coming Soon Launch',
        title: 'Green Valley Villas',
        developer: 'Sodic',
        description: 'Exclusive villa community with lush landscapes',
        content: 'Green Valley Villas brings nature to your doorstep with beautifully landscaped gardens, walking trails, and premium villa designs.',
        image: 'launch-greenvalley-main',
        images: ['launch-greenvalley-1', 'launch-greenvalley-2'],
        location: 'Sheikh Zayed',
        propertyType: 'Villa',
        status: 'Coming Soon',
        startingPrice: 8500000,
        currency: 'EGP',
        launchDate: '2025-06-15',
        completionDate: '2028-06-30',
        area: 350,
        areaUnit: 'sqm',
        bedrooms: 4,
        bathrooms: 4,
        features: ['Private garden', 'Maid\'s room', 'Home office', 'Terrace'],
        amenities: ['Club house', 'Kids area', 'Sports courts', 'Jogging track'],
        coordinates: {
          latitude: 30.0131,
          longitude: 30.9746
        },
        nearbyFacilities: [
          {
            name: 'British School',
            type: 'School',
            distance: 3,
            distanceUnit: 'km'
          },
          {
            name: 'Dar El Fouad Hospital',
            type: 'Hospital',
            distance: 5,
            distanceUnit: 'km'
          }
        ],
        paymentPlans: [
          {
            name: 'Early Bird Special',
            description: '15% down payment for early buyers',
            downPayment: 15,
            installments: 72,
            installmentPeriod: 'monthly'
          }
        ],
        isFeatured: true,
        isActive: true,
        contactInfo: {
          phone: '+201098765432',
          email: 'info@sodic.com',
          website: 'https://sodic.com'
        },
        createdBy: 'abdulrhman@hotmail.com'
      }
    ]
  };

  if (!templates[entityType]) {
    return res.status(404).json({
      success: false,
      message: 'Invalid entity type'
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=${entityType}-template.json`);
  res.json(templates[entityType]);
});

/**
 * GET /api/bulk-uploads/template/:entityType/excel
 * Download Excel template for entity type
 */
router.get('/template/:entityType/excel', (req, res) => {
  const { entityType } = req.params;

  // Reuse templates from JSON endpoint
  const templates = {
    governorates: [
      {
        name: 'Cairo',
        annualAppreciationRate: 7.5,
        description: 'The capital and largest city of Egypt, a major metropolitan area'
      },
      {
        name: 'Giza',
        annualAppreciationRate: 6.8,
        description: 'Home to the Great Pyramids and growing residential areas'
      }
    ],
    areas: [
      {
        name: 'Fifth Settlement',
        city: 'New Cairo',
        annualAppreciationRate: 9.2,
        description: 'Premium residential and commercial district in New Cairo'
      },
      {
        name: 'Maadi Degla',
        city: 'Maadi',
        annualAppreciationRate: 6.5,
        description: 'Upscale neighborhood known for expat community'
      }
    ],
    users: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+201234567890',
        password: 'default123',
        role: 'user',
        isActive: true,
        location: 'Cairo, Egypt'
      },
      {
        name: 'Ahmed Hassan',
        email: 'ahmed@basira.com',
        phone: '+201234567891',
        password: 'secure123',
        role: 'sales_agent',
        isActive: true,
        location: 'Dubai, UAE'
      }
    ],
    developers: [
      {
        name: 'Emaar',
        logo: 'emaar-logo',
        description: 'Leading real estate developer in the Middle East'
      },
      {
        name: 'Sodic',
        logo: 'sodic-logo',
        description: 'Premium Egyptian real estate developer'
      }
    ],
    cities: [
      {
        name: 'New Cairo',
        governorate: 'Cairo',
        annualAppreciationRate: 8.5,
        description: 'Modern suburb of Cairo with residential and commercial developments'
      },
      {
        name: 'Sheikh Zayed',
        governorate: 'Giza',
        annualAppreciationRate: 7.2,
        description: 'Upscale residential area west of Cairo'
      }
    ],
    properties: [
      {
        title: 'Luxury Villa in Fifth Settlement',
        description: 'Beautiful 4-bedroom villa with garden and pool.',
        type: 'villa',
        status: 'for-sale',
        developerStatus: 'on-plan',
        developer: 'Emaar',
        price: 5000000,
        currency: 'EGP',
        governorate_ref: 'Cairo',
        city_ref: 'New Cairo',
        area_ref: 'Fifth Settlement',
        'location.address': '123 Main Street, Fifth Settlement',
        'location.country': 'Egypt',
        'location.coordinates.latitude': 30.0444,
        'location.coordinates.longitude': 31.2357,
        'specifications.bedrooms': 4,
        'specifications.bathrooms': 3,
        'specifications.area': 300,
        'specifications.areaUnit': 'sqm',
        'specifications.floors': 2,
        'specifications.parking': 2,
        'specifications.furnished': 'semi-furnished',
        features: 'pool, garden, balcony, gym',
        amenities: 'security, maintenance, gym, pool',
        isFeatured: true,
        isActive: true
      },
      {
        title: 'Modern Apartment in Downtown',
        description: 'Spacious 2-bedroom apartment with city view',
        type: 'apartment',
        status: 'for-rent',
        price: 15000,
        currency: 'EGP',
        'location.address': '456 Downtown Street',
        'location.city': 'Cairo',
        'location.state': 'Cairo',
        'location.country': 'Egypt',
        'location.coordinates.latitude': 30.0444,
        'location.coordinates.longitude': 31.2357,
        'specifications.bedrooms': 2,
        'specifications.bathrooms': 2,
        'specifications.area': 120,
        'specifications.areaUnit': 'sqm',
        'specifications.furnished': 'furnished',
        features: 'balcony, parking',
        amenities: 'elevator, concierge',
        isFeatured: false,
        isActive: true
      }
    ],
    leads: [
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+201234567890',
        requiredService: 'buy',
        propertyType: 'apartment',
        purpose: 'investment',
        'budget.min': 2000000,
        'budget.max': 3000000,
        'budget.currency': 'AED',
        preferredLocation: 'Dubai Marina, Downtown Dubai',
        location: 'Dubai Marina',
        timeline: '3-6-months',
        status: 'new',
        priority: 'medium',
        source: 'landing-page',
        assignedTo: 'abdulrhman@hotmail.com',
        followUpDate: '2025-11-15',
        isRead: false,
        isArchived: false
      }
    ],
    launches: [
      {
        title: 'Oceanfront Towers',
        developer: 'Emaar Properties',
        description: 'Luxurious beachfront apartments with stunning Mediterranean views',
        location: 'New Cairo',
        propertyType: 'Apartment',
        status: 'Available',
        startingPrice: 1500000,
        currency: 'EGP',
        launchDate: '2025-03-01',
        completionDate: '2027-12-31',
        area: 120,
        areaUnit: 'sqm',
        bedrooms: 2,
        bathrooms: 2,
        features: 'Smart home, Balcony, Storage, Walk-in closet',
        amenities: 'Pool, Gym, Beach access, Parking, Concierge, 24/7 Security',
        'coordinates.latitude': 30.0444,
        'coordinates.longitude': 31.2357,
        isFeatured: true,
        isActive: true
      }
    ]
  };

  if (!templates[entityType]) {
    return res.status(404).json({
      success: false,
      message: 'Invalid entity type'
    });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Get template data
    const templateData = templates[entityType];
    
    if (!templateData || templateData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No template data available for this entity type'
      });
    }

    // Flatten all objects to get all possible columns
    const flattenedData = templateData.map(item => {
      const flat = flattenObject(item);
      return flat;
    });

    // Get all unique column names from flattened data
    const allColumns = new Set();
    flattenedData.forEach(row => {
      Object.keys(row).forEach(key => allColumns.add(key));
    });
    const columns = Array.from(allColumns).sort();

    // Set headers
    const headerRow = worksheet.addRow(columns);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font.color = { argb: 'FFFFFFFF' };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    flattenedData.forEach(rowData => {
      const row = columns.map(col => rowData[col] || '');
      worksheet.addRow(row);
    });

    // Auto-size columns
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Freeze header row
    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${entityType}-template.xlsx`);

    // Write to response
    workbook.xlsx.write(res).then(() => {
      res.end();
    }).catch((error) => {
      console.error('Error generating Excel template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Excel template',
        error: error.message
      });
    });
  } catch (error) {
    console.error('Error creating Excel template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Excel template',
      error: error.message
    });
  }
});

module.exports = router;

