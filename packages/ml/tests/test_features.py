"""Feature-store tests (P3.1): point-in-time correctness + dataset cards."""

from __future__ import annotations

import datetime as dt

import pandas as pd
import pytest

from ml.features import (
    ALL_BUILDERS,
    assert_point_in_time,
    build_price_features,
)
from ml.features.base import KNOWN_AT_COL, PERIOD_COL

AS_OF = dt.date(2024, 6, 1)


def test_no_leakage_all_domains(panel=None):
    for build in ALL_BUILDERS.values():
        fs = build(AS_OF)
        assert_point_in_time(fs.frame, AS_OF)  # raises on leakage


def test_period_never_after_as_of():
    fs = build_price_features(AS_OF)
    assert pd.to_datetime(fs.frame[PERIOD_COL]).max() <= pd.Timestamp(AS_OF)


def test_lag_feature_is_true_past_value():
    """price_sqft_lag12 at period t must equal price_sqft at t-12 (not the future)."""
    fs = build_price_features(dt.date(2024, 12, 1))
    frame = fs.frame.sort_values([*["locality_id"], PERIOD_COL])
    loc = frame["locality_id"].iloc[0]
    sub = frame[frame["locality_id"] == loc].reset_index(drop=True)
    # find a row whose lag we can verify against 12 rows earlier in the full panel
    from ml.features.synthetic import build_panel

    full = build_panel(dt.date(2024, 12, 1))
    full = full[full["locality_id"] == loc].sort_values(PERIOD_COL).reset_index(drop=True)
    row = sub.iloc[-1]
    # locate the same period in the full panel
    idx = full.index[full[PERIOD_COL] == row[PERIOD_COL]][0]
    assert idx >= 12
    assert row["price_sqft_lag12"] == pytest.approx(full.loc[idx - 12, "price_sqft"])


def test_leakage_detector_trips_on_future_row():
    fs = build_price_features(AS_OF)
    bad = fs.frame.copy()
    bad.loc[bad.index[0], KNOWN_AT_COL] = pd.Timestamp(AS_OF) + pd.Timedelta(days=40)
    with pytest.raises(ValueError):
        assert_point_in_time(bad, AS_OF)


def test_dataset_card_reports_coverage_and_synthetic_flag():
    fs = build_price_features(AS_OF)
    card = fs.card
    assert card.n_rows == len(fs.frame)
    assert card.n_entities >= 1
    assert card.target == "price_sqft"
    assert card.unit == "INR/sqft"
    assert card.synthetic is True  # honest flag (§5)
    assert card.feature_names == fs.feature_names


def test_materialize_writes_card(tmp_path):
    fs = build_price_features(AS_OF)
    base = fs.materialize(tmp_path)
    assert (base / "dataset_card.json").exists()
