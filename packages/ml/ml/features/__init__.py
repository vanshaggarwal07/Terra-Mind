"""Feature store / training-data pipeline (blueprint §5, P3.1).

Assembles, versions, and materializes point-in-time-correct feature tables for
each prediction domain. Every feature set ships with a ``DatasetCard`` documenting
coverage, date range, row counts, and known gaps — feeding the honesty framing
required by §5.
"""

from __future__ import annotations

from ml.features.base import DatasetCard, FeatureSet, assert_point_in_time
from ml.features.builders import (
    ALL_BUILDERS,
    build_aqi_features,
    build_flood_features,
    build_price_features,
    build_traffic_features,
    build_water_features,
)

__all__ = [
    "FeatureSet",
    "DatasetCard",
    "assert_point_in_time",
    "build_price_features",
    "build_traffic_features",
    "build_flood_features",
    "build_water_features",
    "build_aqi_features",
    "ALL_BUILDERS",
]
