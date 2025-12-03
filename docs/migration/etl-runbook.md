# ETL Runbook (MongoDB → PostgreSQL)

This runbook captures the end-to-end migration flow from the legacy MongoDB
deployment to the new Prisma/PostgreSQL schema. Use it for dry runs in staging
and as the source of truth for the production cutover window.

---

## 0. Prerequisites

- `MONGO_URI` points to the (read-only) Mongo replica.
- `DATABASE_URL` points to the staging/production Postgres instance.
- Node 18+ with project dependencies installed (`npm install` at repo root).
- Sufficient disk space for JSONL exports (~1–2x the size of the Mongo data).

---

## 1. Export (MongoDB → JSONL)

```bash
npm run etl:export -- \
  --collections users,properties,inquiries,leads,launches,conversations,searches \
  --batch-size 2000
```

- Output directory: `server/scripts/etl/output/<timestamp>/`.
- Files are newline-delimited JSON (`*.jsonl`), one per collection.
- Add `--dry-run` to verify configuration without writing files.

**Checklist**
- [ ] Connected to correct Mongo URI (read-only user).
- [ ] Export directory archived (S3, Artifacts) after completion.
- [ ] Export log saved with start/end timestamps.

---

## 2. Import (JSONL → PostgreSQL)

```bash
npm run etl:import -- \
  --input server/scripts/etl/output/<timestamp> \
  --batch-size 500
```

- Supported collections: `users`, `properties`, `inquiries`, `leads`,
  `launches`, `conversations`, `searches`. Unknown collections are logged/skipped.
- Each importer normalizes enums, IDs, timestamps, and JSON columns to match
  `schema.prisma`.
- Upserts are used so the command can be re-run idempotently.
- Use `--dry-run` to inspect planned inserts without touching Postgres.

**Checklist**
- [ ] Confirm `DATABASE_URL` points to staging/prod as intended.
- [ ] Postgres table counts increase as batches run (monitor via `SELECT COUNT(*)`).
- [ ] Errors logged per batch; rerun specific collections if needed.

---

## 3. Verification

```bash
npm run etl:verify -- \
  --collections users,properties,inquiries,leads,launches,conversations,searches
```

Outputs for each collection:

```
✅ properties → Mongo: 123,456 | Postgres: 123,456 | Δ 0
```

Aggregates (currently top cities by property count) are also printed for sanity
checks. Extend the script if additional aggregates are required (e.g., leads by
source, active listings per status).

**Checklist**
- [ ] All deltas (`Δ`) are 0 (or documented if expected).
- [ ] Aggregates match between Mongo and Postgres.
- [ ] Verification log stored with timestamps.

---

## 4. Dry-Run Timeline

1. **T-48h** – Announce maintenance window and start staging dry run.
2. **Export** – Capture durations per collection; update this doc.
3. **Import** – Monitor Postgres CPU/memory; adjust `--batch-size` if needed.
4. **Verify** – Resolve any deltas; iterate until parity achieved.
5. **Sign-off** – Document successful dry run in project tracker.

---

## 5. Production Cutover

1. Freeze content/scripts 1h before export (write flag off in API).
2. Run export/import/verify using production URIs.
3. Re-enable writes once verification passes and stakeholders sign off.
4. Monitor dashboards + logs (API latency, DB metrics) for 24h.
5. Archive JSONL exports and verification logs for auditing.

---

## 6. Rollback Plan

- If verification fails or API regressions occur, point the API back to MongoDB
  (existing config still available). Keep Postgres data intact for investigation.
- Document the failure, patch scripts/importers, and re-run the import after
  the issue is resolved.

