"""TTL policy for the cache/verify layer (blueprint §3.3).

TTLs are derived first from the source's explicit ``refresh_cadence`` string,
falling back to sane per-category defaults:
  gov master plan ~30d, news ~1d, tender ~7d, satellite ~5-10d, air/flood daily.
"""

from __future__ import annotations

import datetime as dt

from warehouse.enums import SourceCategory

# Per-category default TTLs (blueprint §3.3).
_CATEGORY_TTL: dict[SourceCategory, dt.timedelta] = {
    SourceCategory.planning: dt.timedelta(days=30),
    SourceCategory.metro: dt.timedelta(days=7),
    SourceCategory.highways: dt.timedelta(days=7),
    SourceCategory.rrts: dt.timedelta(days=7),
    SourceCategory.airport: dt.timedelta(days=7),
    SourceCategory.tenders: dt.timedelta(days=7),
    SourceCategory.open_data: dt.timedelta(days=7),
    SourceCategory.rera: dt.timedelta(days=7),
    SourceCategory.air_quality: dt.timedelta(days=1),
    SourceCategory.flood: dt.timedelta(days=1),
    SourceCategory.groundwater: dt.timedelta(days=90),
    SourceCategory.elevation: dt.timedelta(days=365),
    SourceCategory.satellite: dt.timedelta(days=7),
    SourceCategory.news: dt.timedelta(days=1),
    SourceCategory.social: dt.timedelta(days=1),
    SourceCategory.builder: dt.timedelta(days=30),
}

# Named cadence strings -> timedelta.
_CADENCE_TTL: dict[str, dt.timedelta] = {
    "daily": dt.timedelta(days=1),
    "weekly": dt.timedelta(days=7),
    "monthly": dt.timedelta(days=30),
    "quarterly": dt.timedelta(days=90),
    "yearly": dt.timedelta(days=365),
    "one-time": dt.timedelta(days=365),
    "5-10 days": dt.timedelta(days=7),
}

_DEFAULT_TTL = dt.timedelta(days=7)


def parse_cadence(cadence: str | None) -> dt.timedelta | None:
    if not cadence:
        return None
    return _CADENCE_TTL.get(cadence.strip().lower())


def ttl_for_category(category: SourceCategory, refresh_cadence: str | None = None) -> dt.timedelta:
    """Resolve the TTL, preferring the explicit cadence over the category default."""
    from_cadence = parse_cadence(refresh_cadence)
    if from_cadence is not None:
        return from_cadence
    return _CATEGORY_TTL.get(category, _DEFAULT_TTL)
