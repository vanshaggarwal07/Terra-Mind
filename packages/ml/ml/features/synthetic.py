"""Deterministic synthetic corridor panel (P3.1 dev/training substrate).

Blueprint §1/§5 warn against shipping ML on thin data. Until Phases 1-2 have run
live long enough to accumulate real history, this generator produces a
*deterministic, clearly-labelled synthetic* monthly panel for the corridor so the
Phase-3 models are fully trainable, testable, and reproducible end-to-end. Every
dataset card and model metadata built from it carries ``synthetic=True`` so the
honesty framing (§5) is never lost.

The panel encodes genuine, learnable relationships (e.g. price rises with infra
proximity/progress + inflation; AQI rises near highways/airport/industry; flood
risk rises as elevation falls and rainfall spikes) so trained models produce
meaningful feature importances and calibrated bands.
"""

from __future__ import annotations

import datetime as dt

import numpy as np
import pandas as pd

from ml.features.base import KNOWN_AT_COL, PERIOD_COL

SEED = 20260718
N_LOCALITIES = 14
START = dt.date(2019, 1, 1)


def _month_ends(start: dt.date, as_of: dt.date) -> pd.DatetimeIndex:
    return pd.date_range(start=pd.Timestamp(start), end=pd.Timestamp(as_of), freq="MS")


def _localities(rng: np.random.Generator) -> pd.DataFrame:
    """Static locality attributes for the corridor (deterministic)."""
    ids = [f"loc-{i:02d}" for i in range(N_LOCALITIES)]
    return pd.DataFrame(
        {
            "locality_id": ids,
            # corridor-ish coordinates (Noida -> Jewar band)
            "lat": rng.uniform(28.30, 28.60, N_LOCALITIES),
            "lng": rng.uniform(77.30, 77.75, N_LOCALITIES),
            "dist_metro_km": rng.uniform(0.3, 8.0, N_LOCALITIES).round(2),
            "dist_airport_km": rng.uniform(2.0, 35.0, N_LOCALITIES).round(2),
            "dist_expressway_km": rng.uniform(0.2, 6.0, N_LOCALITIES).round(2),
            "dist_highway_km": rng.uniform(0.1, 5.0, N_LOCALITIES).round(2),
            "elevation_m": rng.uniform(180.0, 220.0, N_LOCALITIES).round(1),
            "drainage_quality": rng.uniform(0.2, 1.0, N_LOCALITIES).round(2),  # 1=good
            "near_industry": rng.integers(0, 2, N_LOCALITIES),
            "road_width_m": rng.uniform(12.0, 60.0, N_LOCALITIES).round(1),
            "builder_track_record": rng.uniform(0.4, 0.95, N_LOCALITIES).round(2),
            "base_price_sqft": rng.uniform(3500, 9000, N_LOCALITIES).round(0),
            "base_traffic": rng.uniform(400, 1800, N_LOCALITIES).round(0),
            "base_gw_level_m": rng.uniform(8.0, 25.0, N_LOCALITIES).round(1),
        }
    )


def build_panel(as_of: dt.date, *, seed: int = SEED) -> pd.DataFrame:
    """Return a locality-month panel with all domain signals + lagged features.

    Every row carries ``period`` (the month it describes) and ``known_at`` (end of
    that month) so point-in-time correctness can be asserted (§5, P3.1).
    """
    rng = np.random.default_rng(seed)
    locs = _localities(rng)
    months = _month_ends(START, as_of)

    rows: list[dict] = []
    # infra progress ramps up over time per locality (proxy for accumulating events)
    infra_speed = rng.uniform(0.004, 0.02, N_LOCALITIES)
    pop_growth = rng.uniform(0.002, 0.01, N_LOCALITIES)

    for li, loc in locs.iterrows():
        for mi, period in enumerate(months):
            t = mi / 12.0  # years since start
            month = period.month
            season = np.sin(2 * np.pi * (month / 12.0))  # +1 mid-year

            # exogenous, known-at-period signals
            inflation_index = 100.0 * (1.03**t)
            rainfall_mm = max(0.0, 40.0 + 120.0 * max(0.0, season) + rng.normal(0, 15))
            infra_progress = float(np.clip(infra_speed[li] * mi, 0.0, 1.0))
            rental_yield = 0.025 + 0.01 * loc["builder_track_record"]

            # --- price per sqft (target for price model) ---
            proximity_boost = (
                1.6 / (1.0 + loc["dist_metro_km"])
                + 0.9 / (1.0 + loc["dist_expressway_km"])
                + 0.4 / (1.0 + 0.1 * loc["dist_airport_km"])
            )
            price = loc["base_price_sqft"] * (inflation_index / 100.0) * (
                1.0 + 0.28 * infra_progress
            ) * (1.0 + 0.06 * proximity_boost) * (
                1.0 + 0.05 * (loc["builder_track_record"] - 0.6)
            ) + rng.normal(0, 90)

            # --- traffic index ---
            traffic = loc["base_traffic"] * (1.0 + pop_growth[li] * mi) * (
                1.0 + 0.5 * infra_progress
            ) * (1.0 + 30.0 / loc["road_width_m"]) + rng.normal(0, 40)

            # --- flood event (binary) ---
            flood_logit = (
                4.5
                - 0.06 * (loc["elevation_m"] - 180.0)
                - 1.8 * loc["drainage_quality"]
                + 0.012 * rainfall_mm
            )
            flood_prob = 1.0 / (1.0 + np.exp(-flood_logit + 5.0))
            flood_event = int(rng.uniform() < flood_prob)

            # --- groundwater level (m below surface; rises = worse) ---
            gw_level = (
                loc["base_gw_level_m"]
                + 0.18 * mi / 12.0 * (1.0 + pop_growth[li] * 50)
                - 0.01 * rainfall_mm
                + rng.normal(0, 0.3)
            )

            # --- AQI ---
            aqi = (
                80.0
                + 60.0 / (1.0 + loc["dist_highway_km"])
                + 40.0 / (1.0 + 0.1 * loc["dist_airport_km"])
                + 35.0 * loc["near_industry"]
                + 45.0 * max(0.0, -season)  # winter spike
                + rng.normal(0, 8)
            )

            rows.append(
                {
                    "locality_id": loc["locality_id"],
                    PERIOD_COL: period,
                    # monthly data is attributed to the month it describes; features
                    # in a row are lagged/contemporaneous, never from the future.
                    KNOWN_AT_COL: period,
                    "month_index": mi,
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "dist_metro_km": loc["dist_metro_km"],
                    "dist_airport_km": loc["dist_airport_km"],
                    "dist_expressway_km": loc["dist_expressway_km"],
                    "dist_highway_km": loc["dist_highway_km"],
                    "elevation_m": loc["elevation_m"],
                    "drainage_quality": loc["drainage_quality"],
                    "near_industry": int(loc["near_industry"]),
                    "road_width_m": loc["road_width_m"],
                    "builder_track_record": loc["builder_track_record"],
                    "rental_yield": rental_yield,
                    "inflation_index": inflation_index,
                    "rainfall_mm": rainfall_mm,
                    "infra_progress": infra_progress,
                    "price_sqft": max(500.0, price),
                    "traffic_index": max(50.0, traffic),
                    "flood_event": flood_event,
                    "groundwater_level_m": max(1.0, gw_level),
                    "aqi": max(20.0, aqi),
                }
            )

    panel = pd.DataFrame(rows).sort_values(["locality_id", PERIOD_COL]).reset_index(drop=True)

    # Lagged features (strictly past values -> no leakage): price 12 months ago.
    panel["price_sqft_lag12"] = panel.groupby("locality_id")["price_sqft"].shift(12)
    panel["traffic_lag12"] = panel.groupby("locality_id")["traffic_index"].shift(12)
    panel["gw_level_lag12"] = panel.groupby("locality_id")["groundwater_level_m"].shift(12)
    return panel


def months_available(as_of: dt.date) -> int:
    return len(_month_ends(START, as_of))
