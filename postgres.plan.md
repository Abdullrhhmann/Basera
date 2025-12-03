<!-- 9bbafaab-e723-4dc0-bb60-ab318d1a7aa3 6764d914-0e97-49e1-8b17-0e81b8baf47c -->
# PostgreSQL Migration Plan

## 1. Provision Prisma + Postgres config

- Install `prisma` and `@prisma/client`, initialize `schema.prisma`, and point `DATABASE_URL` to PostgreSQL in [`server/.env`](server/.env) and deployment secrets.
- Replace the Mongo connection block in [`server/index.js`](server/index.js) with a shared Prisma client (drop the mongoose-specific lifecycle hooks shown below) and ensure Express bootstraps only after a successful DB check.
```162:210:server/index.js
// MongoDB-specific connection logic to be removed in favor of Prisma client init
```

## 2. Translate Mongoose schemas to Prisma models

- For each file in [`server/models`](server/models) (e.g., `Property.js`, `User.js`, `Inquiry.js`) map ObjectId refs, embedded documents, arrays, and indexes into relational Prisma models, junction tables, and enums.
- Document assumptions for nested docs (e.g., `property.location` and `images`) and create migration helpers for JSON columns where denormalization is acceptable.
- Generate Prisma migrations to create the new schema and keep them under version control.

## 3. Refactor data access across routes

- Update every route/controller in [`server/routes`](server/routes) to import Prisma instead of the old Mongoose models, rewriting queries, population logic, pagination, and validation.
- Extract shared query builders (e.g., property search filters currently in `routes/properties.js` and `utils/propertySearch.js`) into Prisma-friendly helper modules to avoid duplication.
- Ensure middleware such as [`server/middleware/auth.js`](server/middleware/auth.js) and services under [`server/utils`](server/utils) read/write through Prisma transactions where necessary.

## 4. Update background scripts and automation

- Rebuild the seeding and maintenance scripts in [`server/scripts`](server/scripts) (admin creation, seeders, migration utilities) to call Prisma, consolidating repeated logic via a small script helper (e.g., `scripts/_prisma.js`).
- Provide new SQL-backed bulk upload and reporting utilities so operational flows (bulk property uploads, dashboard metrics) remain functional.

## 5. Data migration & verification

- Define an ETL flow to move existing MongoDB data into PostgreSQL: export collections, transform with Node scripts or `mongoexport` + custom loaders using Prisma’s `createMany` and transactions.
- Add verification steps (row counts, spot-check queries hit by [`client/src/pages`](client/src/pages) dashboards) plus fallback procedures before cutting over.
- Update documentation/README describing new environment setup, migration steps, and rollback considerations.

### To-dos

- [x] Identify remaining Mongo-dependent routes
- [x] Refactor properties API to Prisma
- [x] Outline updates for seeds/scripts
- [x] Add Prisma + Postgres config/env
- [x] Translate Mongoose schemas to Prisma models
- [x] Refactor routes/services to use Prisma
- [x] Rebuild seed & maintenance scripts
- [x] Implement ETL + verification for legacy data

---

## 6. Detailed execution plan for remaining gaps

### 6.1 Refactor properties + search stack

- Create a `prisma/propertyQueries.js` helper that encapsulates filter, sort, pagination, and projection logic now duplicated between `router/properties.js`, `router/compounds.js`, and `utils/propertySearch.js`; lean on Prisma `where` builders plus computed SQL views for expensive aggregations.
- Replace every `Property.find`/`aggregate` call with a Prisma equivalent. Prioritize:
  - `/routes/properties.js`: list/search endpoints (pages, featured, map, admin dashboards).
  - `/routes/search.js` + `/routes/dashboard.js`: ensure the property facets, counts, and saved search flows reuse the new helper.
  - `/routes/uploads.js` bulk property import logic: wrap multi-row upserts in a Prisma transaction to avoid partial writes.
- Introduce Zod schemas (or the existing `bulkValidation` helpers) to validate incoming filters before translating them to Prisma `where`, preventing SQL injection or accidental `contains` misuse.
- Add integration tests (supertest) covering at least: base search, filtered search with pagination, admin creation/update, and property detail fetch to catch parity gaps with Mongo queries.

### 6.2 Secondary route modernization

- After properties/search stabilize, refactor the remaining high-impact routes in waves:
  1. `routes/compounds.js`, `routes/governorates.js`, `routes/cities.js` (shared location data, heavy front-end traffic).
  2. `routes/users.js`, `routes/auth.js`, `routes/chat.js` (security sensitive).
  3. Low-frequency routes (blogs, videos, newsletters) handled last.
- For each wave, define a short-lived feature branch, enable Prisma client injection via middleware, and shadow traffic in staging before merging.
- Where routes currently rely on Mongo population, create explicit Prisma `include` graphs or pre-computed `select` objects stored next to the model definition to keep responses consistent.

### 6.3 Script + automation alignment

- Inventory every file under `server/scripts/` and log whether it reads or writes each collection. Group them into: seeders, admin utilities, verification jobs.
- Build `server/scripts/_prisma.js` that initializes the Prisma client, handles graceful shutdown, and exports helpers like `withTransaction(async (tx) => ...)`.
- Rewrite the highest-priority scripts first (e.g., `seedProperties.js`, `createAdmin.js`, `seedLocations.js`). Ensure they accept CLI flags for batch size and dry-run so the ETL effort (section 5) can reuse them.
- Document how to run each script post-migration within `server/scripts/README.md` and update `package.json` script aliases accordingly.

## 7. Testing, QA, and observability

- **Unit + integration tests**: expand Jest/supertest coverage to assert Prisma queries return the same response shape currently expected by the React client. Focus on `client/src/pages` that hit listings, dashboards, and auth flows.
- **Performance tests**: capture baseline latency for heavy endpoints (property search, dashboard stats) against Mongo, then rerun after Prisma refactor. Use k6 or artillery scripts so regressions are measurable.
- **Data quality checks**: automate row-count + checksum comparisons for critical tables (`Property`, `Compound`, `User`, `Inquiry`). Store scripts beside the ETL tooling.
- **Observability**: add Prisma query logging (warn level) plus App Insights / OpenTelemetry hooks so slow SQL can be detected early in staging.
- **Rollback drills**: document how to temporarily point the API back to Mongo if blockers appear during the first production deployment window.

## 8. Cutover & communication plan

- **Dry run timeline**: execute the full ETL + smoke test flow in staging, freeze deployments, and capture timings (export duration, load duration, validation). This becomes the production runbook.
- **Production freeze**: announce a content freeze window to operations 48h prior. Disable high-risk scripts (bulk uploads) while ETL runs to avoid divergence.
- **Verification gates**:
  - API health & synthetic checks green for 30 minutes.
  - Top 5 client journeys manually tested (search, listing detail, login, inquiry submission, admin dashboard).
  - Background jobs confirmed via log inspection.
- **Post-cut monitoring**: schedule hourly audits during the first 24h (row counts vs. Mongo, error logs, DB metrics).
- **Communication**: circulate status updates in the ops Slack channel at start, mid-ETL, go/no-go, and completion. Prepare a rollback statement in advance.

## 9. Open questions / follow-ups

- Confirm whether legacy Mongo needs to stay writable for a fallback period or become read-only immediately after cutover.
- Decide on the canonical source for historical analytics dashboards; if they continue to read from Mongo exports, specify how data will stay in sync.
- Determine secrets management for the new Postgres credentials across environments (local `.env`, staging, production).
- Clarify ownership: who signs off on the properties API refactor, who maintains ETL scripts long term, and which team monitors DB health post-cutover.

Keeping this document up to date after each milestone will keep the migration aligned and make it easier to onboard additional contributors.

---

## 10. To-do execution playbook

### 10.1 Refactor properties API to Prisma `[todo #1]`

- **Scope**: Endpoints in `routes/properties.js`, related helpers in `utils/propertySearch.js`, and any admin dashboards that read/write `Property`.
- **Steps**
  1. Draft Prisma data mappers (`prisma/propertyQueries.js`) that accept the existing filter payloads and produce a Prisma `where/orderBy/select`.
  2. Swap each `.find()`/`.aggregate()` call with the mapper, ensuring lean payload parity (e.g., projections for cards vs. detail views).
  3. Replace `mongoose.Types.ObjectId` validation with Zod or Joi schemas shared with the upload + search routes.
  4. Add integration tests via supertest hitting: `/properties`, `/properties/:slug`, `/properties/map`, `/properties/admin`.
  5. Benchmark key endpoints (search, featured, admin listing) before/after, keeping notes in `docs/migration/benchmarks.md`.
- **Deliverables**: Updated routes/utilities, new helper module, passing tests, benchmark log, and a short status note in this plan.

### 10.2 Outline updates for seeds/scripts `[todo #2]`

- **Inventory**: List every file in `server/scripts` with purpose, inputs, outputs, collection usage. Store table in `server/scripts/README.md`.
- **Design**: Decide which scripts become Prisma-powered, which can be replaced by SQL views, and which can be dropped.
- **Standards**:
  - Introduce `scripts/_prisma.js` (handles client init + shutdown).
  - Require each script to support `--dry-run`, `--batch-size`, and shared logging.
  - Document environment variables required (e.g., `DATABASE_URL`, admin credentials).
- **Outcome**: Approved outline circulated with engineering + ops before rewriting begins.

### 10.3 Refactor remaining routes/services `[todo #3]`

- **Wave 1 (Locations)**: `routes/compounds.js`, `routes/cities.js`, `routes/governorates.js`. Focus on shared includes and caching strategy.
- **Wave 2 (Core auth & user)**: `routes/users.js`, `routes/auth.js`, `middleware/auth.js`, `utils/userRoleUtils.js`.
- **Wave 3 (Ancillary content)**: blogs, videos, newsletter, launches.
- **Method**:
  - For each wave create a checklist PR template capturing: replaced queries, new Prisma includes/selects, tests run.
  - Add smoke tests hitting the main endpoints of the wave.
  - Update documentation for any payload changes surfaced during refactors.

### 10.4 Rebuild seed & maintenance scripts `[todo #4]`

- **Priority scripts**: `seedProperties.js`, `seedLocations.js`, `createAdmin.js`, `resetAdmins.js`, `seedSearchData.js`.
- **Implementation**:
  1. Port logic to Prisma using `createMany`, `upsert`, and transactions.
  2. Encapsulate repeated transforms (e.g., slug generation, geo parsing) into `/server/scripts/helpers`.
  3. Provide TypeScript typings (or JSDoc) so command-line script arguments are validated.
  4. Ensure scripts exit cleanly and report summary stats (rows inserted/updated, duration).
- **Testing**: Run scripts against a disposable Postgres DB seeded from staging snapshots; capture the commands + outputs in `docs/migration/script-tests.md`.

### 10.5 Implement ETL + verification `[todo #5]`

- **Export**: Use `mongoexport` per collection with consistent timestamp (disable writers during export or run in read-only mode).
- **Transform**:
  - Build Node-based ETL loaders in `server/scripts/etl/` that read exported JSON/CSV, normalize to the Prisma schema, and insert via batching (`createMany` with `skipDuplicates`).
  - Handle legacy references (ObjectIds) by mapping to UUID/sequence IDs stored in lookup tables.
- **Load**: Orchestrate ETL via a single command (`npm run etl:seed`) that runs sequentially with checkpoint logging.
- **Verification**:
  - Automate row count comparisons and critical aggregates (e.g., total active properties per city).
  - Add spot-check scripts that replay saved queries from the React client and diff responses.
  - Produce a sign-off checklist requiring verification from engineering + ops before cutover.

Keeping the to-do list tied to concrete execution steps ensures we can track progress, surface blockers quickly, and give stakeholders predictable updates.

