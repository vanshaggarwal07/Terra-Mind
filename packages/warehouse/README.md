# twin-warehouse

The primary store: Postgres + PostGIS + pgvector. Holds the knowledge-graph
schema (SQLAlchemy models) and Alembic migrations.

Core entities (blueprint §4): `sources`, `raw_cache`, `localities`,
`properties`, `infra_events`, `builders`, `gov_bodies`, `review_queue`,
`doc_chunks`, plus edge tables.

Built in prompt **P0.2**; the repository/query layer arrives in **P2.1**.
