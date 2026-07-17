"""Enumerations shared across the warehouse schema.

Kept in one module so both the ORM models and Alembic migrations import the
exact same values (avoids drift between code and DB).
"""

from __future__ import annotations

import enum


class SourceCategory(enum.StrEnum):
    planning = "planning"
    metro = "metro"
    highways = "highways"
    rrts = "rrts"
    airport = "airport"
    tenders = "tenders"
    open_data = "open_data"
    rera = "rera"
    air_quality = "air_quality"
    flood = "flood"
    groundwater = "groundwater"
    elevation = "elevation"
    satellite = "satellite"
    news = "news"
    social = "social"
    builder = "builder"


class InfraEventType(enum.StrEnum):
    metro = "metro"
    road = "road"
    airport = "airport"
    mall = "mall"
    school = "school"
    hospital = "hospital"
    industrial = "industrial"
    rrts = "rrts"
    construction_detected = "construction_detected"
    other = "other"


class InfraEventStatus(enum.StrEnum):
    proposed = "proposed"
    approved = "approved"
    under_construction = "under_construction"
    operational = "operational"


class SourceTier(enum.StrEnum):
    """Trust tier of a signal. Official records outrank news, which outranks
    social and satellite-derived pattern signals (blueprint §3.4/§3.6/§3.5)."""

    official = "official"
    news = "news"
    social = "social"
    pattern_cv = "pattern_cv"


class ReviewEntityType(enum.StrEnum):
    infra_event = "infra_event"
    builder = "builder"
    news = "news"


class ReviewReason(enum.StrEnum):
    low_confidence = "low_confidence"
    high_stakes = "high_stakes"
    unverifiable_source = "unverifiable_source"  # news/social — cannot self-verify (§3.6)


class ReviewStatus(enum.StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    edited = "edited"


class RawCacheStatus(enum.StrEnum):
    fresh = "fresh"
    stale = "stale"
    error = "error"
