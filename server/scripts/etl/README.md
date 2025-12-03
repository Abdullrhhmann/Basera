# ETL Pipeline (MongoDB → PostgreSQL)

The ETL helpers in this folder orchestrate the one-time migration from the legacy
MongoDB deployment to the new Prisma/PostgreSQL schema. They are designed to be
idempotent, resumable, and easy to run in both staging and production.

## Overview

1. **Export** – Stream each MongoDB collection to JSONL files stored under
   `server/scripts/etl/output/<timestamp>/`.
2. **Transform/Load** – Read the exported files, normalize them to match the
   Prisma schema (IDs, enums, nested JSON), and upsert them into Postgres via
   Prisma.
3. **Verify** – Compare row counts and key aggregates between Mongo and
   Postgres to confirm parity before cutover.

## Scripts

| Script | Description |
|--------|-------------|
| `exportMongo.js` | Connects to MongoDB (read-only) and writes JSONL exports per collection. |
| `importToPostgres.js` | Reads exported JSONL files and loads them into Postgres using Prisma batches. |
| `verifyCounts.js` | Compares collection/table counts and selected aggregates (properties per city, active users, etc.). |

## Requirements

- `MONGO_URI` – MongoDB connection string with read access.
- `DATABASE_URL` – PostgreSQL connection string used by Prisma.
- Node 18+ (same version as the main project scripts).

Install dependencies at the repo root:

```bash
npm install
```

## Usage

```bash
# 1. Export Mongo collections
node server/scripts/etl/exportMongo.js --collections users,properties,inquiries

# 2. Import into Postgres
node server/scripts/etl/importToPostgres.js --input ./server/scripts/etl/output/latest

# 3. Verify counts & aggregates
node server/scripts/etl/verifyCounts.js --input ./server/scripts/etl/output/latest
```

Each script supports `--dry-run` to print the planned operations without
mutating data, and `--batch-size` to tune performance for large datasets.

## Next Steps

- Fill in the per-collection transformers inside `importToPostgres.js` (users,
  properties, inquiries, launches, conversations, etc.).
- Extend `verifyCounts.js` with the aggregates most relevant for the cutover
  sign-off (active listings, total leads, launches by status).
- Add CI jobs or manual runbook entries that archive the exported JSONL files
  for auditing purposes.

