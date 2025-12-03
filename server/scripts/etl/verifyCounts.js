#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { prisma } = require('../_prisma');

const argv = yargs(hideBin(process.argv))
  .option('collections', {
    type: 'string',
    describe: 'Comma-separated list of collections/tables to compare',
  })
  .help()
  .alias('help', 'h')
  .parse();

const DEFAULT_TARGETS = [
  { collection: 'users', table: 'user' },
  { collection: 'properties', table: 'property' },
  { collection: 'inquiries', table: 'inquiry' },
  { collection: 'leads', table: 'lead' },
  { collection: 'launches', table: 'launch' },
  { collection: 'conversations', table: 'conversation' },
  { collection: 'searches', table: 'search' },
];

function resolveTargets() {
  if (!argv.collections) return DEFAULT_TARGETS;
  const names = argv.collections.split(',').map((c) => c.trim()).filter(Boolean);
  return DEFAULT_TARGETS.filter((target) => names.includes(target.collection));
}

async function countMongo(db, collection) {
  return db.collection(collection).countDocuments();
}

async function countPostgres(table) {
  return prisma[table].count();
}

async function aggregateMongo(db) {
  const pipeline = [
    {
      $group: {
        _id: '$cityId',
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 5 },
  ];
  return db.collection('properties').aggregate(pipeline).toArray();
}

async function aggregatePostgres() {
  return prisma.property.groupBy({
    by: ['cityId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
}

async function aggregatePropertyStatusMongo(db) {
  return db.collection('properties').aggregate([
    { $group: { _id: '$status', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]).toArray();
}

async function aggregatePropertyStatusPostgres() {
  return prisma.property.groupBy({
    by: ['status'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
}

async function aggregateLeadSourceMongo(db) {
  return db.collection('leads').aggregate([
    { $group: { _id: '$source', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]).toArray();
}

async function aggregateLeadSourcePostgres() {
  return prisma.lead.groupBy({
    by: ['source'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
}

async function main() {
  if (!process.env.MONGO_URI || !process.env.DATABASE_URL) {
    console.error('❌ MONGO_URI and DATABASE_URL must be set for verification');
    process.exit(1);
  }

  const mongoClient = new MongoClient(process.env.MONGO_URI, {
    maxPoolSize: 5,
    minPoolSize: 1,
    connectTimeoutMS: 10_000,
  });

  const targets = resolveTargets();
  const results = [];

  try {
    await mongoClient.connect();
    const db = mongoClient.db();
    console.log(`🔎 Comparing counts between Mongo (${db.databaseName}) and Postgres`);

    for (const target of targets) {
      const [mongoCount, postgresCount] = await Promise.all([
        countMongo(db, target.collection),
        countPostgres(target.table),
      ]);
      const delta = postgresCount - mongoCount;
      const status = delta === 0 ? '✅' : '⚠️';
      results.push({ ...target, mongoCount, postgresCount, delta });
      console.log(
        `${status} ${target.collection} → Mongo: ${mongoCount.toLocaleString()} | Postgres: ${postgresCount.toLocaleString()} | Δ ${delta}`
      );
    }

    console.log('\n📊 Top cities by property count (Mongo vs Postgres)');
    const [mongoAgg, postgresAgg] = await Promise.all([aggregateMongo(db), aggregatePostgres()]);

    console.log('\nMongoDB:');
    mongoAgg.forEach((row, idx) => {
      console.log(`  ${idx + 1}. City: ${row._id || 'N/A'} → ${row.total}`);
    });

    console.log('\nPostgres:');
    postgresAgg.forEach((row, idx) => {
      console.log(`  ${idx + 1}. City: ${row.cityId || 'N/A'} → ${row._count.id}`);
    });

    console.log('\n🏷️  Property counts by status');
    const [mongoStatus, postgresStatus] = await Promise.all([
      aggregatePropertyStatusMongo(db),
      aggregatePropertyStatusPostgres(),
    ]);

    console.log('\nMongoDB:');
    mongoStatus.forEach((row) => {
      console.log(`  ${row._id || 'N/A'} → ${row.total}`);
    });

    console.log('\nPostgres:');
    postgresStatus.forEach((row) => {
      console.log(`  ${row.status} → ${row._count.id}`);
    });

    console.log('\n📣 Leads by source');
    const [mongoLeads, postgresLeads] = await Promise.all([
      aggregateLeadSourceMongo(db),
      aggregateLeadSourcePostgres(),
    ]);

    console.log('\nMongoDB:');
    mongoLeads.forEach((row) => {
      console.log(`  ${row._id || 'N/A'} → ${row.total}`);
    });

    console.log('\nPostgres:');
    postgresLeads.forEach((row) => {
      console.log(`  ${row.source} → ${row._count.id}`);
    });
  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoClient.close();
    await prisma.$disconnect();
  }
}

main();

