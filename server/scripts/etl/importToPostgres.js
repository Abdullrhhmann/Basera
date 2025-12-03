#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { Prisma } = require('../../prisma/generated');
const { prisma } = require('../_prisma');

const argv = yargs(hideBin(process.argv))
  .option('input', {
    type: 'string',
    demandOption: true,
    describe: 'Directory containing JSONL exports (one file per collection)',
  })
  .option('collections', {
    type: 'string',
    describe: 'Comma-separated list of collections to import (default: infer from directory)',
  })
  .option('batch-size', {
    type: 'number',
    default: 500,
    describe: 'Batch size for insert/upsert operations',
  })
  .option('dry-run', {
    type: 'boolean',
    default: false,
    describe: 'List planned imports without mutating Postgres',
  })
  .help()
  .alias('help', 'h')
  .parse();

function listJsonlFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.jsonl'))
    .map((file) => file.replace('.jsonl', ''));
}

function resolveCollections(inputDir) {
  if (argv.collections) {
    return argv.collections.split(',').map((c) => c.trim()).filter(Boolean);
  }
  return listJsonlFiles(inputDir);
}

async function readJsonl(filePath, onBatch, batchSize) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let batch = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= batchSize) {
      await onBatch(batch);
      batch = [];
    }
  }
  if (batch.length) {
    await onBatch(batch);
  }
}

async function importUsers(batch, dryRun) {
  const prepared = batch.map((doc) => ({
    id: doc._id?.toString?.() || undefined,
    name: doc.name,
    email: doc.email?.toLowerCase(),
    phone: doc.phone,
    password: doc.password || '$2a$12$placeholderhashplaceholderhashplacehol',
    role: doc.role ? doc.role.replace('-', '_').toUpperCase() : Prisma.UserRole.USER,
    hierarchy: doc.hierarchy ?? 5,
    permissions: doc.permissions || Prisma.JsonNull,
    isActive: doc.isActive ?? true,
    profileImage: doc.profileImage || null,
    preferences: doc.preferences || Prisma.JsonNull,
    lastLogin: doc.lastLogin ? new Date(doc.lastLogin) : null,
    isEmailVerified: doc.isEmailVerified ?? false,
    bio: doc.bio || null,
    location: doc.location || null,
    subscribeToNewsletter: doc.subscribeToNewsletter ?? false,
    activityStats: doc.activityStats || Prisma.JsonNull,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));

  if (dryRun) {
    console.log(`   → dry-run: would import ${prepared.length} users`);
    return;
  }

  await prisma.user.createMany({
    data: prepared,
    skipDuplicates: true,
  });
}

function mapPropertyEnums(doc) {
  const typeKey = doc.type?.toLowerCase?.();
  const statusKey = doc.status?.toLowerCase?.();
  const approvalKey = doc.approvalStatus?.toLowerCase?.();

  const type = {
    villa: Prisma.PropertyType.VILLA,
    'twin-villa': Prisma.PropertyType.TWIN_VILLA,
    duplex: Prisma.PropertyType.DUPLEX,
    apartment: Prisma.PropertyType.APARTMENT,
    land: Prisma.PropertyType.LAND,
    commercial: Prisma.PropertyType.COMMERCIAL,
  }[typeKey] || Prisma.PropertyType.APARTMENT;

  const status = {
    'for-sale': Prisma.PropertyStatus.FOR_SALE,
    'for-rent': Prisma.PropertyStatus.FOR_RENT,
    sold: Prisma.PropertyStatus.SOLD,
    rented: Prisma.PropertyStatus.RENTED,
  }[statusKey] || Prisma.PropertyStatus.FOR_SALE;

  const approvalStatus = {
    pending: Prisma.PropertyApprovalStatus.PENDING,
    approved: Prisma.PropertyApprovalStatus.APPROVED,
    rejected: Prisma.PropertyApprovalStatus.REJECTED,
  }[approvalKey] || Prisma.PropertyApprovalStatus.PENDING;

  return { type, status, approvalStatus };
}

async function importProperties(batch, dryRun) {
  const prepared = batch.map((doc) => {
    const { type, status, approvalStatus } = mapPropertyEnums(doc);
    return {
      id: doc._id?.toString?.(),
      title: doc.title,
      description: doc.description,
      type,
      status,
      developerStatus: doc.developerStatus ? doc.developerStatus.replace('-', '_').toUpperCase() : null,
      developerId: doc.developer?._id?.toString?.() || doc.developer,
      compoundId: doc.compound?._id?.toString?.() || doc.compound,
      price: doc.price ? new Prisma.Decimal(doc.price) : null,
      currency: doc.currency || 'EGP',
      location: doc.location || Prisma.JsonNull,
      governorateId: doc.governorate?._id?.toString?.() || doc.governorate,
      cityId: doc.city?._id?.toString?.() || doc.city,
      areaId: doc.area?._id?.toString?.() || doc.area,
      useNewLocationStructure: doc.useNewLocationStructure ?? false,
      specifications: doc.specifications || Prisma.JsonNull,
      features: doc.features || [],
      images: doc.images || Prisma.JsonNull,
      video: doc.video || Prisma.JsonNull,
      virtualTour: doc.virtualTour || Prisma.JsonNull,
      floorPlan: doc.floorPlan || Prisma.JsonNull,
      masterPlan: doc.masterPlan || Prisma.JsonNull,
      amenities: doc.amenities || [],
      nearbyFacilities: doc.nearbyFacilities || Prisma.JsonNull,
      investment: doc.investment || Prisma.JsonNull,
      documents: doc.documents || Prisma.JsonNull,
      isFeatured: doc.isFeatured ?? false,
      isActive: doc.isActive ?? true,
      isArchived: doc.isArchived ?? false,
      archivedAt: doc.archivedAt ? new Date(doc.archivedAt) : null,
      createdById: doc.createdBy?._id?.toString?.() || doc.createdBy,
      submittedById: doc.submittedBy?._id?.toString?.() || doc.submittedBy,
      approvedById: doc.approvedBy?._id?.toString?.() || doc.approvedBy,
      approvalStatus,
      approvalDate: doc.approvalDate ? new Date(doc.approvalDate) : null,
      rejectionReason: doc.rejectionReason || null,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    };
  });

  if (dryRun) {
    console.log(`   → dry-run: would import ${prepared.length} properties`);
    return;
  }

  for (const record of prepared) {
    await prisma.property.upsert({
      where: { id: record.id },
      update: record,
      create: record,
    });
  }
}

async function importGeneric(collection, batch) {
  console.warn(`   ⚠️  No importer defined for ${collection}, skipping ${batch.length} docs`);
}

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toString) return value.toString();
  return null;
};

const ensureJson = (value) => (value === undefined || value === null ? Prisma.JsonNull : value);

async function importInquiries(batch, dryRun) {
  const prepared = batch.map((doc) => ({
    id: normalizeId(doc._id) || undefined,
    propertyId: normalizeId(doc.property?._id || doc.propertyId || doc.property),
    userId: normalizeId(doc.user?._id || doc.userId || doc.user),
    contactInfo: ensureJson(doc.contactInfo),
    message: doc.message || '',
    inquiryType: doc.inquiryType || 'general',
    preferredContactMethod: doc.preferredContactMethod || 'phone',
    preferredTime: doc.preferredTime || 'anytime',
    budget: ensureJson(doc.budget),
    timeline: doc.timeline || 'flexible',
    status: doc.status || 'new',
    priority: doc.priority || 'medium',
    assignedToId: normalizeId(doc.assignedTo?._id || doc.assignedToId || doc.assignedTo),
    notes: ensureJson(doc.notes),
    followUpDate: doc.followUpDate ? new Date(doc.followUpDate) : null,
    isRead: doc.isRead ?? false,
    isArchived: doc.isArchived ?? false,
    archivedAt: doc.archivedAt ? new Date(doc.archivedAt) : null,
    source: doc.source || 'website',
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));

  if (dryRun) {
    console.log(`   → dry-run: would import ${prepared.length} inquiries`);
    return;
  }

  for (const record of prepared) {
    await prisma.inquiry.upsert({
      where: { id: record.id },
      update: record,
      create: record,
    });
  }
}

async function importLeads(batch, dryRun) {
  const prepared = batch.map((doc) => ({
    id: normalizeId(doc._id) || undefined,
    name: doc.name,
    email: doc.email?.toLowerCase(),
    phone: doc.phone,
    requiredService: doc.requiredService || 'buy',
    propertyType: doc.propertyType ? doc.propertyType.replace('-', '_').toUpperCase() : Prisma.PropertyType.APARTMENT,
    purpose: doc.purpose || 'personal-use',
    budget: ensureJson(doc.budget),
    preferredLocation: Array.isArray(doc.preferredLocation) ? doc.preferredLocation : (doc.preferredLocation ? [doc.preferredLocation] : []),
    location: doc.location || null,
    timeline: doc.timeline || 'flexible',
    status: doc.status || 'new',
    priority: doc.priority || 'medium',
    assignedToId: normalizeId(doc.assignedTo?._id || doc.assignedToId || doc.assignedTo),
    source: doc.source || 'landing-page',
    notes: ensureJson(doc.notes),
    followUpDate: doc.followUpDate ? new Date(doc.followUpDate) : null,
    isRead: doc.isRead ?? false,
    lastContactDate: doc.lastContactDate ? new Date(doc.lastContactDate) : null,
    isArchived: doc.isArchived ?? false,
    archivedAt: doc.archivedAt ? new Date(doc.archivedAt) : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));

  if (dryRun) {
    console.log(`   → dry-run: would import ${prepared.length} leads`);
    return;
  }

  for (const record of prepared) {
    await prisma.lead.upsert({
      where: { id: record.id },
      update: record,
      create: record,
    });
  }
}

const launchStatusMap = {
  available: Prisma.LaunchStatus.AVAILABLE,
  'coming soon': Prisma.LaunchStatus.COMING_SOON,
  'pre-launch': Prisma.LaunchStatus.PRE_LAUNCH,
  'sold out': Prisma.LaunchStatus.SOLD_OUT,
};

const launchTypeMap = {
  villa: Prisma.LaunchPropertyType.VILLA,
  apartment: Prisma.LaunchPropertyType.APARTMENT,
  townhouse: Prisma.LaunchPropertyType.TOWNHOUSE,
  penthouse: Prisma.LaunchPropertyType.PENTHOUSE,
  duplex: Prisma.LaunchPropertyType.DUPLEX,
  studio: Prisma.LaunchPropertyType.STUDIO,
  commercial: Prisma.LaunchPropertyType.COMMERCIAL,
  land: Prisma.LaunchPropertyType.LAND,
};

async function importLaunches(batch, dryRun) {
  const prepared = batch.map((doc) => ({
    id: normalizeId(doc._id) || undefined,
    title: doc.title,
    developer: doc.developer,
    description: doc.description,
    content: doc.content,
    image: doc.image,
    images: Array.isArray(doc.images) ? doc.images : [],
    location: doc.location || '',
    propertyType: launchTypeMap[doc.propertyType?.toLowerCase?.()] || Prisma.LaunchPropertyType.APARTMENT,
    status: launchStatusMap[doc.status?.toLowerCase?.()] || Prisma.LaunchStatus.AVAILABLE,
    startingPrice: doc.startingPrice ? new Prisma.Decimal(doc.startingPrice) : new Prisma.Decimal(0),
    currency: doc.currency || 'EGP',
    launchDate: doc.launchDate ? new Date(doc.launchDate) : new Date(),
    completionDate: doc.completionDate ? new Date(doc.completionDate) : null,
    area: doc.area || 0,
    areaUnit: doc.areaUnit || 'sqm',
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    features: doc.features || [],
    amenities: doc.amenities || [],
    isFeatured: doc.isFeatured ?? false,
    isActive: doc.isActive ?? true,
    contactInfo: ensureJson(doc.contactInfo),
    coordinates: ensureJson(doc.coordinates),
    nearbyFacilities: ensureJson(doc.nearbyFacilities),
    paymentPlans: ensureJson(doc.paymentPlans),
    createdById: normalizeId(doc.createdBy?._id || doc.createdBy),
    updatedById: normalizeId(doc.updatedBy?._id || doc.updatedBy),
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));

  if (dryRun) {
    console.log(`   → dry-run: would import ${prepared.length} launches`);
    return;
  }

  for (const record of prepared) {
    await prisma.launch.upsert({
      where: { id: record.id },
      update: record,
      create: record,
    });
  }
}

const conversationStatusMap = {
  active: Prisma.ConversationStatus.ACTIVE,
  completed: Prisma.ConversationStatus.COMPLETED,
  abandoned: Prisma.ConversationStatus.ABANDONED,
};

async function importConversations(batch, dryRun) {
  const prepared = batch.map((doc) => ({
    id: normalizeId(doc._id) || undefined,
    sessionId: doc.sessionId,
    userId: normalizeId(doc.userId || doc.user?._id),
    userAgent: doc.userAgent || null,
    ipAddress: doc.ipAddress || null,
    referrer: doc.referrer || null,
    messages: ensureJson(doc.messages),
    userPreferences: ensureJson(doc.userPreferences),
    recommendedProperties: ensureJson(doc.recommendedProperties),
    recommendedLaunches: ensureJson(doc.recommendedLaunches),
    leadCaptured: doc.leadCaptured ?? false,
    leadId: normalizeId(doc.leadId || doc.lead?._id),
    metadata: ensureJson(doc.metadata),
    status: conversationStatusMap[doc.status?.toLowerCase?.()] || Prisma.ConversationStatus.ACTIVE,
    tags: doc.tags || [],
    isActive: doc.isActive ?? true,
    firstMessageAt: doc.firstMessageAt ? new Date(doc.firstMessageAt) : null,
    lastMessageAt: doc.lastMessageAt ? new Date(doc.lastMessageAt) : null,
    totalMessages: doc.totalMessages ?? 0,
    conversationDuration: doc.conversationDuration ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));

  if (dryRun) {
    console.log(`   → dry-run: would import ${prepared.length} conversations`);
    return;
  }

  for (const record of prepared) {
    await prisma.conversation.upsert({
      where: { id: record.id },
      update: record,
      create: record,
    });
  }
}

async function importSearches(batch, dryRun) {
  const prepared = batch.map((doc) => ({
    id: normalizeId(doc._id) || undefined,
    query: doc.query,
    userId: normalizeId(doc.userId || doc.user?._id),
    ipAddress: doc.ipAddress || null,
    userAgent: doc.userAgent || null,
    resultsCount: doc.resultsCount ?? 0,
    filters: ensureJson(doc.filters),
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
  }));

  if (dryRun) {
    console.log(`   → dry-run: would import ${prepared.length} searches`);
    return;
  }

  await prisma.search.createMany({
    data: prepared,
    skipDuplicates: true,
  });
}

const importers = {
  users: importUsers,
  properties: importProperties,
  inquiries: importInquiries,
  leads: importLeads,
  launches: importLaunches,
  conversations: importConversations,
  searches: importSearches,
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL env var is required for import');
    process.exit(1);
  }

  const inputDir = path.resolve(argv.input);
  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const collections = resolveCollections(inputDir);
  console.log(`📁 Importing from: ${inputDir}`);
  console.log(`🗃️  Collections: ${collections.join(', ')}`);
  if (argv['dry-run']) {
    console.log('💡 Dry run enabled – no writes will be performed.\n');
  }

  try {
    for (const collection of collections) {
      const importer = importers[collection] || ((batch) => importGeneric(collection, batch));
      const filePath = path.join(inputDir, `${collection}.jsonl`);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Missing file for ${collection}: ${filePath}`);
        continue;
      }

      console.log(`\n📥 Importing ${collection} from ${filePath}`);
      await readJsonl(filePath, (batch) => importer(batch, argv['dry-run']), argv['batch-size']);
    }

    console.log('\n🎉 Import completed');
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

