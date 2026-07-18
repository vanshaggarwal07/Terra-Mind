"""Per-domain feature builders (P3.1).

Each builder assembles a point-in-time-correct ``FeatureSet`` for one prediction
domain from the corridor panel, drawing on the §5 inputs for that domain, and
attaches a ``DatasetCard`` documenting coverage + gaps. Builders draw from the
synthetic panel today (clearly flagged), and are structured so the same selection
logic maps onto live warehouse features once accumulated.
"""

from __future__ import annotations

import datetime as dt

import pandas as pd

from ml.features.base import PERIOD_COL, DatasetCard, FeatureSet
from ml.features.synthetic import build_panel

FEATURE_SET_VERSION = "fs-2026.07"


def _card(
    name: str,
    frame: pd.DataFrame,
    target: str,
    unit: str,
    feature_names: list[str],
    as_of: dt.date,
    gaps: list[str],
) -> DatasetCard:
    periods = pd.to_datetime(frame[PERIOD_COL])
    return DatasetCard(
        feature_set=name,
        version=FEATURE_SET_VERSION,
        as_of=as_of.isoformat(),
        n_rows=int(len(frame)),
        n_entities=int(frame["locality_id"].nunique()),
        date_range=(periods.min().date().isoformat(), periods.max().date().isoformat()),
        target=target,
        unit=unit,
        feature_names=feature_names,
        known_gaps=gaps,
        synthetic=True,
    )


def _finish(
    *,
    name: str,
    panel: pd.DataFrame,
    features: list[str],
    target: str,
    unit: str,
    as_of: dt.date,
    gaps: list[str],
) -> FeatureSet:
    keep = ["locality_id", PERIOD_COL, "known_at", *features, target]
    frame = panel[keep].dropna(subset=[*features, target]).reset_index(drop=True)
    card = _card(name, frame, target, unit, features, as_of, gaps)
    return FeatureSet(
        name=name,
        version=FEATURE_SET_VERSION,
        as_of=as_of,
        frame=frame,
        feature_names=features,
        target=target,
        unit=unit,
        card=card,
    )


def build_price_features(as_of: dt.date, panel: pd.DataFrame | None = None) -> FeatureSet:
    panel = panel if panel is not None else build_panel(as_of)
    features = [
        "price_sqft_lag12",
        "infra_progress",
        "inflation_index",
        "rental_yield",
        "builder_track_record",
        "dist_metro_km",
        "dist_expressway_km",
        "dist_airport_km",
    ]
    return _finish(
        name="price",
        panel=panel,
        features=features,
        target="price_sqft",
        unit="INR/sqft",
        as_of=as_of,
        gaps=["synthetic panel; no live transaction records yet"],
    )


def build_traffic_features(as_of: dt.date, panel: pd.DataFrame | None = None) -> FeatureSet:
    panel = panel if panel is not None else build_panel(as_of)
    features = [
        "traffic_lag12",
        "road_width_m",
        "infra_progress",
        "month_index",
        "dist_expressway_km",
    ]
    return _finish(
        name="traffic",
        panel=panel,
        features=features,
        target="traffic_index",
        unit="vehicles/hour",
        as_of=as_of,
        gaps=["synthetic panel; needs 12-24 months of live traffic history (§5)"],
    )


def build_flood_features(as_of: dt.date, panel: pd.DataFrame | None = None) -> FeatureSet:
    panel = panel if panel is not None else build_panel(as_of)
    features = ["elevation_m", "drainage_quality", "rainfall_mm", "dist_expressway_km"]
    return _finish(
        name="flood",
        panel=panel,
        features=features,
        target="flood_event",
        unit="risk 0-1",
        as_of=as_of,
        gaps=["synthetic panel; sparse CWC flood records in reality"],
    )


def build_water_features(as_of: dt.date, panel: pd.DataFrame | None = None) -> FeatureSet:
    panel = panel if panel is not None else build_panel(as_of)
    features = ["gw_level_lag12", "rainfall_mm", "month_index", "near_industry"]
    return _finish(
        name="water",
        panel=panel,
        features=features,
        target="groundwater_level_m",
        unit="m below surface",
        as_of=as_of,
        gaps=["synthetic panel; CGWB cadence is quarterly"],
    )


def build_aqi_features(as_of: dt.date, panel: pd.DataFrame | None = None) -> FeatureSet:
    panel = panel if panel is not None else build_panel(as_of)
    features = ["dist_highway_km", "dist_airport_km", "near_industry", "month_index"]
    return _finish(
        name="aqi",
        panel=panel,
        features=features,
        target="aqi",
        unit="AQI",
        as_of=as_of,
        gaps=["synthetic panel; CPCB station coverage varies"],
    )


ALL_BUILDERS = {
    "price": build_price_features,
    "traffic": build_traffic_features,
    "flood": build_flood_features,
    "water": build_water_features,
    "aqi": build_aqi_features,
}
