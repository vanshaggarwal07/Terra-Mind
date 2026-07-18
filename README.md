# Terra-Mind — Property Digital Twin Platform

Geospatial data-infrastructure platform for the Noida · Greater Noida · Yamuna Expressway · Jewar Airport corridor, with ML forecasting and an LLM explanation layer on top.

> The engineering rationale lives in [`property-digital-twin-engineering-blueprint.md`](property-digital-twin-engineering-blueprint.md).
> The phase-by-phase build prompts live in [`prompts/`](prompts/README.md).

## Repository layout

```
packages/common/       shared lib: config, logging, db, storage, http, hashing
packages/warehouse/    knowledge-graph schema, SQLAlchemy models, Alembic migrations
packages/ingestion/    crawler fleet, Search->Cache->Verify, doc-intelligence, Dagster
packages/api/          FastAPI: facts, score, builder, proximity, copilot, predictions
packages/ml/           Phase 3 models, feature store, training, serving
packages/cv/           Phase 4 satellite change-detection
packages/simulation/   Phase 4 what-if engine
apps/web/              Next.js frontend
infra/                 IaC (Phase 5)
docker/                local DB init
```

## Prerequisites

- Python 3.11+ (`.python-version` pins 3.11)
- Node 18+ and `pnpm` (for `apps/web`)
- Docker + Docker Compose (for local Postgres/PostGIS + MinIO)

## Quickstart

```bash
cp .env.example .env          # then edit secrets
make up                       # start Postgres+PostGIS+pgvector and MinIO
make bootstrap                # create .venv and install all packages editable
make migrate                  # apply the database schema
make test                     # run the Python test suite
```

Run individual services:

```bash
make api        # FastAPI on :8000
make web        # Next.js on :3000
make dagster    # Dagster dev UI (Phase 1+)
```

## Developer commands

`make help` lists everything. Common ones: `make lint`, `make fmt`, `make typecheck`, `make test`, `make migrate`, `make seed`, `make train` (Phase-3 models), `make train-cv` (Phase-4 segmenter), `make deploy ENV=dev` (Phase-5 IaC).

## Operations, deployment & compliance (Phase 5)

- **Infrastructure as code:** [`infra/`](infra/README.md) — Terraform for managed Postgres (PostGIS+pgvector), object storage, ECS Fargate (API + Dagster), Secrets Manager, GPU **spot** batch, budgets, and observability. `dev`/`prod` via tfvars.
- **CD:** [`.github/workflows/cd.yml`](.github/workflows/cd.yml) — build → push → gated migration → deploy dev → manual-approval prod, with circuit-breaker rollback.
- **Observability:** the API `/ops/health`, `/ops/metrics`, `/ops/costs` surface + the web `/ops` dashboard consolidate ingestion, review, ML, cost, and API health. Portable Prometheus/Grafana config in [`infra/observability/`](infra/observability/README.md).
- **Cost guards:** `common.budget` fails the paid line items (X/social, satellite, GPU) safe at their monthly caps; X/social and satellite/CV are off/gated by default.
- **Compliance:** [`COMPLIANCE.md`](COMPLIANCE.md) maps every §0/§13 trust guarantee (facts-not-verdicts, advisory bands, human-verified high-stakes, attribution, robots/UA crawling) to its enforcing code and CI guard test. Run `pytest packages -k compliance`.

## Build order

Follow [`prompts/README.md`](prompts/README.md) top to bottom. Phase 0 (this scaffold) → Phase 1 (ingestion) → Phase 2 (digital twin MVP) → Phase 3 (ML) → Phase 4 (simulation + CV), with Phase 5 (infra/compliance) woven throughout.
