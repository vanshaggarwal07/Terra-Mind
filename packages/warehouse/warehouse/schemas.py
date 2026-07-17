"""Shared Pydantic DTOs for warehouse entities.

Kept in the base package so every consumer (ingestion, api) uses the same
request/response shapes without depending on each other.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from warehouse.enums import (
    ReviewEntityType,
    ReviewReason,
    ReviewStatus,
    SourceCategory,
)


class SourceBase(BaseModel):
    source_name: str
    category: SourceCategory
    access_method: str | None = None
    refresh_cadence: str | None = None
    legal_basis: str | None = None
    base_url: str | None = None
    crawler_key: str | None = None
    is_active: bool = True
    config: dict[str, Any] = Field(default_factory=dict)


class SourceCreate(SourceBase):
    pass


class SourceUpdate(BaseModel):
    source_name: str | None = None
    category: SourceCategory | None = None
    access_method: str | None = None
    refresh_cadence: str | None = None
    legal_basis: str | None = None
    base_url: str | None = None
    crawler_key: str | None = None
    is_active: bool | None = None
    config: dict[str, Any] | None = None


class SourceRead(SourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str


# --- Review queue --------------------------------------------------------------
class ReviewItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entity_type: ReviewEntityType
    reason: ReviewReason
    status: ReviewStatus
    confidence: float | None = None
    source_id: str | None = None
    entity_ref: dict[str, Any] = Field(default_factory=dict)
    reviewer: str | None = None
    created_at: dt.datetime | None = None
    decided_at: dt.datetime | None = None


class ReviewDecision(BaseModel):
    """A human reviewer's decision. ``edited`` optionally corrects fields before
    approval (blueprint §3.4.4 human-in-the-loop)."""

    reviewer: str
    edited: dict[str, Any] | None = None


# --- Knowledge-graph read models (blueprint §4, §0 "cite sources") -------------
class Citation(BaseModel):
    """Every user-visible fact carries one (blueprint §0: report facts, cite sources)."""

    source_id: str | None = None
    source_name: str | None = None
    source_document: str | None = None  # direct URL / doc ref
    as_of: dt.datetime | None = None  # last_verified_at / fetch date


class LocalityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    centroid_lat: float | None = None
    centroid_lng: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class InfraEventRead(BaseModel):
    """A verified infra fact. ``data_layer`` is always 'factual' at MVP (§0/§1)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    status: str
    expected_year: int | None = None
    budget_inr_cr: float | None = None
    confidence: float
    source_tier: str
    lat: float | None = None
    lng: float | None = None
    locality_id: str | None = None
    verified: bool
    data_layer: str = "factual"
    citation: Citation = Field(default_factory=Citation)
    distance_km: float | None = None  # populated by proximity/geospatial queries


class BuilderProject(BaseModel):
    name: str | None = None
    rera_id: str | None = None
    status: str | None = None
    promised_completion: str | None = None
    actual_completion: str | None = None
    citation: Citation = Field(default_factory=Citation)


class BuilderRead(BaseModel):
    """UP-RERA builder record — FACTS ONLY. No trust score / ranking / verdict
    field is permitted here (blueprint §0, §13)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    rera_id: str | None = None
    registration_status: str | None = None
    projects: list[BuilderProject] = Field(default_factory=list)
    delay_history: list[dict[str, Any]] = Field(default_factory=list)
    complaint_flags: list[dict[str, Any]] = Field(default_factory=list)
    citation: Citation = Field(default_factory=Citation)
    disclaimer: str = (
        "Records sourced verbatim from UP-RERA public data. Facts only — not a "
        "rating, ranking, or recommendation."
    )


class GovBodyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    jurisdiction: str | None = None


# --- Standard prediction envelope (blueprint §5) -------------------------------
class ContributingFactor(BaseModel):
    factor: str
    weight: float


class PredictionEnvelope(BaseModel):
    """The ONE shape every prediction/score returns (blueprint §5, §8).

    The UI reads ``contributing_factors`` directly, so the 'why' can never drift
    from the number. Used by the rule-weighted score (Phase 2) and every ML model
    (Phase 3)."""

    prediction: float
    confidence: float
    contributing_factors: list[ContributingFactor] = Field(default_factory=list)
    model_version: str
