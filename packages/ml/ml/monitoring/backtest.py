"""Backtesting: compare past predictions to realized outcomes (P3.10).

As real data arrives, we replay the model over a held-out chronological tail and
track MAE / MAPE / calibration (share of realized values inside the band). Feeds
the per-model accuracy trend on the /ops dashboard.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ml.features.base import PERIOD_COL, FeatureSet
from ml.models.base import BaseRegressionModel, mape


@dataclass
class BacktestResult:
    domain: str
    n: int
    mae: float
    mape: float
    coverage: float  # fraction of realized values inside the predicted band
    model_version: str


def backtest_regression(
    model: BaseRegressionModel,
    fs: FeatureSet,
    *,
    tail_fraction: float = 0.2,
    horizon_years: int = 1,
) -> BacktestResult:
    """Replay ``model`` over the most-recent ``tail_fraction`` of ``fs`` and score."""
    ordered = fs.frame.sort_values(PERIOD_COL)
    n_tail = max(1, int(len(ordered) * tail_fraction))
    tail = ordered.tail(n_tail)

    y_true = tail[fs.target].to_numpy(dtype=float)
    points = np.empty(n_tail)
    inside = np.zeros(n_tail, dtype=bool)
    for i, (_, row) in enumerate(tail.iterrows()):
        feats = {c: float(row[c]) for c in fs.feature_names}
        env = model.predict(feats, horizon_years=horizon_years)
        points[i] = env.prediction
        if env.has_band():
            inside[i] = env.prediction_low <= y_true[i] <= env.prediction_high

    mae = float(np.mean(np.abs(points - y_true)))
    return BacktestResult(
        domain=model.domain,
        n=n_tail,
        mae=round(mae, 4),
        mape=round(mape(y_true, points), 4),
        coverage=round(float(np.mean(inside)), 4),
        model_version=model.model_version,
    )
