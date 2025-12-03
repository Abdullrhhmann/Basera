#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const DEFAULT_COLLECTIONS = [
  'users',
  'properties',
  'inquiries',
  'leads',
  'launches',
  'conversations',
  'searches',
];

const argv = yargs(hideBin(process.argv))
  .option('collections', {
    type: 'string',
    describe: 'Comma-separated list of collections to export',
  })
  .option('output', {
    type: 'string',
    describe: 'Output directory for JSONL exports',
  })
  .option('batch-size', {
    type: 'number',
    default: 1000,
    describe: 'Batch size when streaming documents',
  })
  .option('dry-run', {
    type: 'boolean',
    default: false,
    describe: 'List actions without exporting data',
  })
  .help()
  .alias('help', 'h')
  .parse();

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

function resolveCollections() {
  if (argv.collections) {
    return argv.collections.split(',').map((c) => c.trim()).filter(Boolean);
  }
  return DEFAULT_COLLECTIONS;
}

async function exportCollection(db, collectionName, outputFile, batchSize, dryRun) {
  console.log(`\n📦 Exporting collection: ${collectionName}`);
  if (dryRun) {
    console.log(`   → dry-run: would write to ${outputFile}`);
    return;
  }

  const cursor = db.collection(collectionName).find({});
  const writeStream = fs.createWriteStream(outputFile, { flags: 'w' });
  let count = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    writeStream.write(`${JSON.stringify(doc)}\n`);
    count += 1;

    if (count % batchSize === 0) {
      console.log(`   → exported ${count} documents...`);
    }
  }

  writeStream.end();
  console.log(`   ✅ Finished ${collectionName} (${count} documents)`);
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI env var is required for export');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  const client = new MongoClient(mongoUri, {
    maxPoolSize: 5,
    minPoolSize: 1,
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  });

  const collections = resolveCollections();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = argv.output || path.join(__dirname, 'output', timestamp);

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB at ${mongoUri}`);
    const dbName = client.db().databaseName;
    console.log(`📚 Database: ${dbName}`);

    await ensureDir(outputDir);
    console.log(`📁 Output directory: ${outputDir}`);

    for (const collection of collections) {
      const outputFile = path.join(outputDir, `${collection}.jsonl`);
      await exportCollection(client.db(), collection, outputFile, argv['batch-size'], argv['dry-run']);
    }

    console.log('\n🎉 Export completed');
  } catch (error) {
    console.error('💥 Export failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();

