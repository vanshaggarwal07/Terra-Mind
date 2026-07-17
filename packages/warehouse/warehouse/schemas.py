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
