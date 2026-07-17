"""initial knowledge-graph schema

Creates the core entities (blueprint §4), the raw-cache index (§3.3), the
review queue (§3.4.4), the doc-chunk vector table, and the edge tables.

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-16
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from warehouse.models import EMBEDDING_DIM

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# --- Enum type definitions (created once, reused across tables) ----------------
SOURCE_CATEGORY = postgresql.ENUM(
    "planning", "metro", "highways", "rrts", "airport", "tenders", "open_data", "rera",
    "air_quality", "flood", "groundwater", "elevation", "satellite", "news", "social", "builder",
    name="source_category",
)
RAW_CACHE_STATUS = postgresql.ENUM("fresh", "stale", "error", name="raw_cache_status")
INFRA_EVENT_TYPE = postgresql.ENUM(
    "metro", "road", "airport", "mall", "school", "hospital", "industrial", "rrts",
    "construction_detected", "other",
    name="infra_event_type",
)
INFRA_EVENT_STATUS = postgresql.ENUM(
    "proposed", "approved", "under_construction", "operational", name="infra_event_status"
)
SOURCE_TIER = postgresql.ENUM("official", "news", "social", "pattern_cv", name="source_tier")
REVIEW_ENTITY_TYPE = postgresql.ENUM("infra_event", "builder", "news", name="review_entity_type")
REVIEW_REASON = postgresql.ENUM(
    "low_confidence", "high_stakes", "unverifiable_source", name="review_reason"
)
REVIEW_STATUS = postgresql.ENUM("pending", "approved", "rejected", "edited", name="review_status")

_ALL_ENUMS = [
    SOURCE_CATEGORY, RAW_CACHE_STATUS, INFRA_EVENT_TYPE, INFRA_EVENT_STATUS,
    SOURCE_TIER, REVIEW_ENTITY_TYPE, REVIEW_REASON, REVIEW_STATUS,
]


def upgrade() -> None:
    bind = op.get_bind()
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    for e in _ALL_ENUMS:
        e.create(bind, checkfirst=True)

    ts = lambda: sa.DateTime(timezone=True)  # noqa: E731

    op.create_table(
        "sources",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_name", sa.String(255), nullable=False),
        sa.Column("category", SOURCE_CATEGORY, nullable=False),
        sa.Column("access_method", sa.String(120)),
        sa.Column("refresh_cadence", sa.String(60)),
        sa.Column("legal_basis", sa.String(255)),
        sa.Column("base_url", sa.Text()),
        sa.Column("crawler_key", sa.String(80)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("source_name", name="uq_sources_name"),
    )
    op.create_index("ix_sources_active", "sources", ["is_active"])

    op.create_table(
        "raw_cache",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("raw_object_key", sa.Text(), nullable=False),
        sa.Column("normalized_md_key", sa.Text()),
        sa.Column("fetched_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_verified_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("http_etag", sa.String(255)),
        sa.Column("http_last_modified", sa.String(255)),
        sa.Column("status", RAW_CACHE_STATUS, nullable=False, server_default="fresh"),
        sa.UniqueConstraint("source_id", "content_hash", name="uq_raw_cache_source_hash"),
    )
    op.create_index("ix_raw_cache_source", "raw_cache", ["source_id"])

    op.create_table(
        "localities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("geom", Geography(geometry_type="POLYGON", srid=4326)),
        sa.Column("centroid", Geography(geometry_type="POINT", srid=4326)),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", ts(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_localities_geom", "localities", ["geom"], postgresql_using="gist")

    op.create_table(
        "properties",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("locality_id", sa.String(36), sa.ForeignKey("localities.id", ondelete="SET NULL")),
        sa.Column("geom", Geography(geometry_type="POINT", srid=4326)),
        sa.Column("address", sa.Text()),
        sa.Column("listing", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", ts(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_properties_geom", "properties", ["geom"], postgresql_using="gist")

    op.create_table(
        "infra_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("type", INFRA_EVENT_TYPE, nullable=False),
        sa.Column("status", INFRA_EVENT_STATUS, nullable=False),
        sa.Column("expected_year", sa.Integer()),
        sa.Column("budget_inr_cr", sa.Numeric(14, 2)),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=False, server_default="0"),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("sources.id", ondelete="SET NULL")),
        sa.Column("source_document", sa.Text()),
        sa.Column("source_tier", SOURCE_TIER, nullable=False, server_default="official"),
        sa.Column("geom", Geography(geometry_type="POINT", srid=4326)),
        sa.Column("locality_id", sa.String(36), sa.ForeignKey("localities.id", ondelete="SET NULL")),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("first_seen_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_verified_at", ts()),
        sa.Column("extraction", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_infra_confidence_unit"),
    )
    op.create_index("ix_infra_events_geom", "infra_events", ["geom"], postgresql_using="gist")
    op.create_index("ix_infra_events_status_verified", "infra_events", ["status", "verified"])
    op.create_index("ix_infra_events_type", "infra_events", ["type"])

    op.create_table(
        "builders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("rera_id", sa.String(120)),
        sa.Column("project_history", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("sources.id", ondelete="SET NULL")),
        sa.Column("source_document", sa.Text()),
        sa.Column("first_seen_at", ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_verified_at", ts()),
        sa.UniqueConstraint("rera_id", name="uq_builders_rera_id"),
    )
    op.create_index("ix_builders_rera_id", "builders", ["rera_id"])

    op.create_table(
        "gov_bodies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("jurisdiction", sa.String(255)),
    )

    op.create_table(
        "review_queue",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("entity_type", REVIEW_ENTITY_TYPE, nullable=False),
        sa.Column("entity_ref", postgresql.JSONB(), nullable=False),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("sources.id", ondelete="SET NULL")),
        sa.Column("confidence", sa.Numeric(4, 3)),
        sa.Column("reason", REVIEW_REASON, nullable=False),
        sa.Column("status", REVIEW_STATUS, nullable=False, server_default="pending"),
        sa.Column("reviewer", sa.String(255)),
        sa.Column("decided_at", ts()),
        sa.Column("created_at", ts(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_review_queue_status", "review_queue", ["status"])

    op.create_table(
        "doc_chunks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("sources.id", ondelete="SET NULL")),
        sa.Column("raw_cache_id", sa.String(36), sa.ForeignKey("raw_cache.id", ondelete="CASCADE")),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("section_title", sa.Text()),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM)),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_doc_chunks_source", "doc_chunks", ["source_id"])
    # HNSW index for cosine similarity search over embeddings.
    op.execute(
        "CREATE INDEX ix_doc_chunks_embedding ON doc_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_table(
        "infra_event_affects_locality",
        sa.Column("infra_event_id", sa.String(36), sa.ForeignKey("infra_events.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("locality_id", sa.String(36), sa.ForeignKey("localities.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("distance_km", sa.Float()),
    )
    op.create_table(
        "builder_develops_property",
        sa.Column("builder_id", sa.String(36), sa.ForeignKey("builders.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("property_id", sa.String(36), sa.ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "infra_event_approved_by",
        sa.Column("infra_event_id", sa.String(36), sa.ForeignKey("infra_events.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("gov_body_id", sa.String(36), sa.ForeignKey("gov_bodies.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.execute("DROP INDEX IF EXISTS ix_doc_chunks_embedding")
    for tbl in [
        "infra_event_approved_by",
        "builder_develops_property",
        "infra_event_affects_locality",
        "doc_chunks",
        "review_queue",
        "gov_bodies",
        "builders",
        "infra_events",
        "properties",
        "localities",
        "raw_cache",
        "sources",
    ]:
        op.drop_table(tbl)
    for e in _ALL_ENUMS:
        e.drop(bind, checkfirst=True)
