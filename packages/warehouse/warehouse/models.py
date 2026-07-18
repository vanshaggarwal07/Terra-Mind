"""SQLAlchemy 2.0 ORM models for the knowledge-graph warehouse.

Mirrors blueprint §4 (entities + edges) and §3.3 (raw cache). Geospatial
columns use PostGIS via GeoAlchemy2; embeddings use pgvector.

The embedding dimension is read from ``LLM_EMBEDDING_DIM`` (default 1536) so it
can be matched to the chosen embedding model without editing code.
"""

from __future__ import annotations

import datetime as dt
import os
import uuid
from typing import Any

from geoalchemy2 import Geography
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from warehouse.enums import (
    InfraEventStatus,
    InfraEventType,
    RawCacheStatus,
    ReviewEntityType,
    ReviewReason,
    ReviewStatus,
    SourceCategory,
    SourceTier,
)

EMBEDDING_DIM = int(os.getenv("LLM_EMBEDDING_DIM", "1536"))


def _uuid() -> str:
    return str(uuid.uuid4())


def _pg_enum(py_enum: type, name: str) -> Enum:
    # Store enum *values* (not names) and validate them in the DB.
    return Enum(py_enum, name=name, values_callable=lambda e: [m.value for m in e])


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Source(Base, TimestampMixin):
    """A data source (blueprint §3.1). Sources are DATA, never hardcoded logic —
    adding source #41 is an INSERT, not a code change."""

    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[SourceCategory] = mapped_column(
        _pg_enum(SourceCategory, "source_category"), nullable=False
    )
    access_method: Mapped[str | None] = mapped_column(String(120))
    refresh_cadence: Mapped[str | None] = mapped_column(String(60))  # daily/weekly/monthly/...
    legal_basis: Mapped[str | None] = mapped_column(String(255))
    base_url: Mapped[str | None] = mapped_column(Text)
    crawler_key: Mapped[str | None] = mapped_column(String(80))  # resolves to a crawler class
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (
        UniqueConstraint("source_name", name="uq_sources_name"),
        Index("ix_sources_active", "is_active"),
    )


class RawCache(Base):
    """Raw-fetch cache index (blueprint §3.3). Bytes live in object storage;
    this row tracks the hash, keys, and freshness metadata."""

    __tablename__ = "raw_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_id: Mapped[str] = mapped_column(
        ForeignKey("sources.id", ondelete="CASCADE"), nullable=False
    )
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    raw_object_key: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_md_key: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_verified_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    http_etag: Mapped[str | None] = mapped_column(String(255))
    http_last_modified: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[RawCacheStatus] = mapped_column(
        _pg_enum(RawCacheStatus, "raw_cache_status"), default=RawCacheStatus.fresh, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("source_id", "content_hash", name="uq_raw_cache_source_hash"),
        Index("ix_raw_cache_source", "source_id"),
    )


class Locality(Base, TimestampMixin):
    __tablename__ = "localities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    geom: Mapped[Any | None] = mapped_column(Geography(geometry_type="POLYGON", srid=4326))
    centroid: Mapped[Any | None] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    meta: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    __table_args__ = (Index("ix_localities_geom", "geom", postgresql_using="gist"),)


class Property(Base, TimestampMixin):
    __tablename__ = "properties"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    locality_id: Mapped[str | None] = mapped_column(
        ForeignKey("localities.id", ondelete="SET NULL")
    )
    geom: Mapped[Any | None] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    address: Mapped[str | None] = mapped_column(Text)
    listing: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (Index("ix_properties_geom", "geom", postgresql_using="gist"),)


class InfraEvent(Base):
    """An infrastructure event/project (blueprint §4). Only rows with
    ``verified=True`` may be exposed to end users (enforced in the API)."""

    __tablename__ = "infra_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    type: Mapped[InfraEventType] = mapped_column(
        _pg_enum(InfraEventType, "infra_event_type"), nullable=False
    )
    status: Mapped[InfraEventStatus] = mapped_column(
        _pg_enum(InfraEventStatus, "infra_event_status"), nullable=False
    )
    expected_year: Mapped[int | None] = mapped_column(Integer)
    budget_inr_cr: Mapped[float | None] = mapped_column(Numeric(14, 2))
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), default=0.0, nullable=False)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id", ondelete="SET NULL"))
    source_document: Mapped[str | None] = mapped_column(Text)  # citation URL / doc ref
    source_tier: Mapped[SourceTier] = mapped_column(
        _pg_enum(SourceTier, "source_tier"), default=SourceTier.official, nullable=False
    )
    geom: Mapped[Any | None] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    locality_id: Mapped[str | None] = mapped_column(
        ForeignKey("localities.id", ondelete="SET NULL")
    )
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    first_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    extraction: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_infra_confidence_unit"),
        Index("ix_infra_events_geom", "geom", postgresql_using="gist"),
        Index("ix_infra_events_status_verified", "status", "verified"),
        Index("ix_infra_events_type", "type"),
    )


class Builder(Base):
    """A builder/promoter. Facts only — NO derived trust score (blueprint §0)."""

    __tablename__ = "builders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rera_id: Mapped[str | None] = mapped_column(String(120), index=True)
    project_history: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id", ondelete="SET NULL"))
    source_document: Mapped[str | None] = mapped_column(Text)
    first_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("rera_id", name="uq_builders_rera_id"),)


class GovBody(Base):
    __tablename__ = "gov_bodies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    jurisdiction: Mapped[str | None] = mapped_column(String(255))


class ModelRegistryEntry(Base):
    """Versioned metadata for a trained Phase-3 model (blueprint §5, P3.2).

    Artifacts live in object storage / the filesystem registry; this row is the
    queryable index (metrics, calibration, feature-set version) so a served
    prediction is always traceable to a reproducible model version."""

    __tablename__ = "model_registry"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    domain: Mapped[str] = mapped_column(String(40), nullable=False)  # price/traffic/flood/...
    model_version: Mapped[str] = mapped_column(String(120), nullable=False)
    feature_set_version: Mapped[str] = mapped_column(String(120), nullable=False)
    algorithm: Mapped[str | None] = mapped_column(String(120))
    unit: Mapped[str | None] = mapped_column(String(60))
    artifact_key: Mapped[str | None] = mapped_column(Text)  # object-storage / fs path
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    calibration: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    trained_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("domain", "model_version", name="uq_model_registry_domain_version"),
        Index("ix_model_registry_domain_active", "domain", "is_active"),
    )


class ReviewQueue(Base):
    """Human-in-the-loop queue (blueprint §3.4.4). Low-confidence or high-stakes
    extractions land here and must be human-approved before going public."""

    __tablename__ = "review_queue"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    entity_type: Mapped[ReviewEntityType] = mapped_column(
        _pg_enum(ReviewEntityType, "review_entity_type"), nullable=False
    )
    entity_ref: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id", ondelete="SET NULL"))
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3))
    reason: Mapped[ReviewReason] = mapped_column(
        _pg_enum(ReviewReason, "review_reason"), nullable=False
    )
    status: Mapped[ReviewStatus] = mapped_column(
        _pg_enum(ReviewStatus, "review_status"), default=ReviewStatus.pending, nullable=False
    )
    reviewer: Mapped[str | None] = mapped_column(String(255))
    decided_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_review_queue_status", "status"),)


class DocChunk(Base):
    """A section-level chunk of a normalized document, with its embedding
    (blueprint §3.3 vector index / §3.4 chunking) for RAG retrieval."""

    __tablename__ = "doc_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id", ondelete="SET NULL"))
    raw_cache_id: Mapped[str | None] = mapped_column(ForeignKey("raw_cache.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section_title: Mapped[str | None] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Any | None] = mapped_column(Vector(EMBEDDING_DIM))
    meta: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    __table_args__ = (Index("ix_doc_chunks_source", "source_id"),)


# --- Edge / relationship tables (blueprint §4 edges) ---------------------------


class InfraEventAffectsLocality(Base):
    __tablename__ = "infra_event_affects_locality"

    infra_event_id: Mapped[str] = mapped_column(
        ForeignKey("infra_events.id", ondelete="CASCADE"), primary_key=True
    )
    locality_id: Mapped[str] = mapped_column(
        ForeignKey("localities.id", ondelete="CASCADE"), primary_key=True
    )
    distance_km: Mapped[float | None] = mapped_column(Float)


class BuilderDevelopsProperty(Base):
    __tablename__ = "builder_develops_property"

    builder_id: Mapped[str] = mapped_column(
        ForeignKey("builders.id", ondelete="CASCADE"), primary_key=True
    )
    property_id: Mapped[str] = mapped_column(
        ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True
    )


class InfraEventApprovedBy(Base):
    __tablename__ = "infra_event_approved_by"

    infra_event_id: Mapped[str] = mapped_column(
        ForeignKey("infra_events.id", ondelete="CASCADE"), primary_key=True
    )
    gov_body_id: Mapped[str] = mapped_column(
        ForeignKey("gov_bodies.id", ondelete="CASCADE"), primary_key=True
    )


__all__ = [
    "Base",
    "Source",
    "RawCache",
    "Locality",
    "Property",
    "InfraEvent",
    "Builder",
    "GovBody",
    "ModelRegistryEntry",
    "ReviewQueue",
    "DocChunk",
    "InfraEventAffectsLocality",
    "BuilderDevelopsProperty",
    "InfraEventApprovedBy",
    "EMBEDDING_DIM",
]
