# Phase 0 — Foundation

**Goal:** stand up the monorepo, the Postgres + PostGIS + pgvector database with the base schema, the shared Python library every service reuses, and CI — so that all later phases have a stable substrate.

**Entry state:** empty repo containing only the blueprint and this `prompts/` folder.
**Exit state:** `make bootstrap && make up && make migrate && make test` succeeds; DB has all core tables; shared `common` package importable; CI green on push.

**Blueprint sections implemented:** §2 (architecture), §4 (schema), §9 (infra/devops), §3.3 (cache tables), §11.2 (define `InfraEvent` + `Builder`).

> Do P0.1 → P0.4 in order. This whole phase is a few days of scaffolding; resist adding features here.

---

### P0.1 — Monorepo, tooling, and docker-compose scaffold

**Context:** Empty repository. We are building a Python-backed monorepo (Poetry workspace) with a Next.js frontend, matching the folder layout in `prompts/README.md`.

**Task:** Create the monorepo skeleton, dependency management, developer commands, and local infrastructure via docker-compose. No business logic yet — just a working, empty, runnable shell.

**Tech constraints:**
- Python 3.11+, Poetry workspace at repo root (`pyproject.toml`) with path dependencies to `packages/*`.
- Create empty importable packages: `packages/common`, `packages/ingestion`, `packages/warehouse`, `packages/api`, `packages/ml`, `packages/cv`, `packages/simulation` (each with its own `pyproject.toml` + `__init__.py` + `README.md` stub).
- `apps/web` = Next.js (TypeScript, App Router) via `create-next-app`, pnpm.
- `docker-compose.yml` with two services: `db` (image `postgis/postgis:16-3.4`, but we will add pgvector in P0.2) and `minio` (S3-compatible object storage emulator for the raw cache tier). Expose standard ports; use named volumes; healthchecks on both.
- `Makefile` targets: `bootstrap` (poetry install + pnpm install), `up`/`down` (docker-compose), `migrate`, `seed`, `lint`, `typecheck`, `test`, `fmt`. Targets that aren't implemented yet should print "not yet implemented" and exit 0.
- `.env.example` documenting every env var (DB URL, MinIO/S3 creds + bucket, LLM API key placeholder — do NOT commit real secrets). Add `.env` to `.gitignore`.
- `.tool-versions` or `.python-version` pinning the Python version.

**Deliverables:**
- `pyproject.toml`, `Makefile`, `docker-compose.yml`, `.env.example`, `.gitignore`, root `README.md` (dev quickstart).
- `packages/*/` skeletons and `apps/web/` scaffold.

**Acceptance criteria:**
- `make up` starts Postgres and MinIO with passing healthchecks.
- `make bootstrap` installs all Python + JS deps with no errors.
- `poetry run python -c "import common, ingestion, warehouse, api, ml, cv, simulation"` succeeds.
- `pnpm --dir apps/web dev` serves the default Next.js page.

**Depends on:** none.

---

### P0.2 — Database: PostGIS + pgvector + Alembic + base schema

**Context:** docker-compose `db` service exists (P0.1). We now install extensions, wire migrations, and create the core knowledge-graph tables from blueprint §4 plus the cache tables from §3.3.

**Task:** Enable PostGIS + pgvector, set up Alembic in `packages/warehouse`, and author the initial migration creating all core tables with correct geospatial + vector column types, indexes, and foreign keys.

**Tech constraints:**
- Extend the DB image / init scripts so `CREATE EXTENSION postgis; CREATE EXTENSION vector;` run on first boot.
- Alembic config lives in `packages/warehouse/alembic/`; DB URL read from env via the `common` config module (stub OK if P0.3 not done — but prefer ordering P0.3 first if convenient).
- Tables (columns are the minimum; add sensible PKs, timestamps, and indexes):
  - `sources` — `id`, `source_name`, `category` (enum: planning/metro/highways/rrts/airport/tenders/open_data/rera/air_quality/flood/groundwater/elevation/satellite/news/social/builder), `access_method`, `refresh_cadence`, `legal_basis`, `base_url`, `crawler_key`, `is_active`, `config` (JSONB), `created_at`, `updated_at`.
  - `raw_cache` — `id`, `source_id` (FK), `content_hash`, `raw_object_key` (object-storage path), `normalized_md_key`, `fetched_at`, `last_verified_at`, `http_etag`, `http_last_modified`, `status`. Unique index on `(source_id, content_hash)`.
  - `localities` — `id`, `name`, `geom GEOGRAPHY(POLYGON, 4326)`, `centroid GEOGRAPHY(POINT,4326)`, `metadata` JSONB. GIST index on geom.
  - `properties` — `id`, `locality_id` (FK), `geom GEOGRAPHY(POINT,4326)`, `address`, `listing` JSONB. GIST index.
  - `infra_events` — `id`, `type` (enum: metro/road/airport/mall/school/hospital/industrial/rrts/other), `status` (enum: proposed/approved/under_construction/operational), `expected_year`, `budget_inr_cr`, `confidence NUMERIC`, `source_id` (FK), `source_document`, `geom GEOGRAPHY(POINT,4326)`, `locality_id` (FK, nullable), `verified BOOLEAN default false`, `first_seen_at`, `last_verified_at`, `extraction` JSONB (raw extracted payload). GIST index on geom; index on `(status, verified)`.
  - `builders` — `id`, `name`, `rera_id`, `project_history` JSONB, `source_id` (FK), `first_seen_at`, `last_verified_at`.
  - `gov_bodies` — `id`, `name`, `jurisdiction`.
  - `review_queue` — `id`, `entity_type` (infra_event/builder/news), `entity_ref` (JSONB payload), `source_id` (FK), `confidence`, `reason` (enum: low_confidence/high_stakes), `status` (enum: pending/approved/rejected/edited), `reviewer`, `decided_at`, `created_at`.
  - Edge/relationship tables where a join is cleaner than a FK: `infra_event_affects_locality` (`infra_event_id`, `locality_id`, `distance_km`), `builder_develops_property` (`builder_id`, `property_id`), `infra_event_approved_by` (`infra_event_id`, `gov_body_id`).
  - `doc_chunks` — `id`, `source_id` (FK), `raw_cache_id` (FK), `chunk_index`, `section_title`, `text`, `embedding VECTOR(<dim>)`, `metadata` JSONB. IVFFlat/HNSW index on `embedding`.
- Provide a downgrade for the migration.

**Deliverables:**
- Alembic setup + the initial migration.
- `packages/warehouse/models.py` (SQLAlchemy models mirroring the schema) OR a documented raw-SQL approach — pick SQLAlchemy for reuse by the API layer.
- Updated docker init to enable extensions.

**Acceptance criteria:**
- `make migrate` applies cleanly on a fresh DB and `make migrate` downgrade+upgrade round-trips.
- `SELECT postgis_version();` and `SELECT extversion FROM pg_extension WHERE extname='vector';` both return values.
- All tables, enums, FKs, GIST indexes, and the vector index exist (verify via `\d+`).

**Depends on:** P0.1.

---

### P0.3 — Shared `common` library (config, logging, DB, storage, HTTP)

**Context:** Every crawler, API, and ML job needs the same primitives. Building them once in `packages/common` prevents divergence and is required before the crawler fleet (P1.x).

**Task:** Implement the shared utility library.

**Tech constraints:**
- `common/config.py` — typed settings via `pydantic-settings`, loaded from env; single `get_settings()` cached accessor. Covers DB URL, object-storage endpoint/creds/bucket, LLM provider + key, default rate limits, log level.
- `common/logging.py` — structured JSON logging (`structlog` or stdlib + JSON formatter), correlation-id support, one `get_logger(name)` helper.
- `common/db.py` — SQLAlchemy engine + session factory + `session_scope()` context manager, reading the URL from config.
- `common/storage.py` — S3-compatible object-storage client (boto3) with `put_object(key, bytes, content_type)`, `get_object(key)`, `exists(key)`, `latest_by_prefix(prefix)`. Works against MinIO locally and S3/GCS/R2 in prod via endpoint config.
- `common/http.py` — resilient HTTP client wrapping `httpx`, with:
  - `rate_limiter` (token-bucket, per-host limits from config),
  - exponential backoff with jitter on 429/5xx,
  - an **honest, identifiable User-Agent** string (blueprint §3.1 — e.g. `PropertyDigitalTwinBot/1.0 (+contact-url)`),
  - `robots.txt` awareness helper (`is_allowed(url)`),
  - conditional-request helpers (send/read `ETag` / `If-None-Match`, `Last-Modified` / `If-Modified-Since`).
- `common/hashing.py` — `content_hash(bytes) -> str` (sha256 hex) used by the cache layer.
- Unit tests for each module (mock network + object storage).

**Deliverables:** the modules above under `packages/common/common/` + `packages/common/tests/`.

**Acceptance criteria:**
- `poetry run pytest packages/common` passes.
- Rate limiter demonstrably caps request rate in a test; backoff retries on simulated 429; UA header present on every request.
- `storage` round-trips an object against the local MinIO container.

**Depends on:** P0.1 (P0.2 helpful but not strictly required).

---

### P0.4 — CI, formatting, type-checking, pre-commit

**Context:** With code starting to land, enforce quality gates so agent-generated changes stay clean.

**Task:** Add linting/formatting/type-checking config, pre-commit hooks, and a CI workflow.

**Tech constraints:**
- Python: `ruff` (lint + format), `mypy` (type-check on `packages/*`), `pytest` (+ coverage). Config in `pyproject.toml`.
- JS/TS: ESLint + Prettier + `tsc --noEmit` for `apps/web`.
- `.pre-commit-config.yaml` running ruff, ruff-format, and prettier on staged files.
- `.github/workflows/ci.yml` — matrix job: (a) Python lint+type+test with a Postgres+PostGIS service container so DB tests run; (b) web lint+typecheck+build. Cache Poetry and pnpm.
- Wire `make lint`, `make typecheck`, `make test`, `make fmt` to the real tools now.

**Deliverables:** tooling config, pre-commit config, CI workflow, updated Makefile targets.

**Acceptance criteria:**
- `make lint && make typecheck && make test` all pass locally.
- CI runs on push/PR and is green; DB-dependent tests execute against the service container.
- Committing a badly-formatted file is auto-fixed/blocked by pre-commit.

**Depends on:** P0.1, P0.2, P0.3.
