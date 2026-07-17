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

`make help` lists everything. Common ones: `make lint`, `make fmt`, `make typecheck`, `make test`, `make migrate`, `make seed`.

## Build order

Follow [`prompts/README.md`](prompts/README.md) top to bottom. Phase 0 (this scaffold) → Phase 1 (ingestion) → Phase 2 (digital twin MVP) → Phase 3 (ML) → Phase 4 (simulation + CV), with Phase 5 (infra/compliance) woven throughout.
