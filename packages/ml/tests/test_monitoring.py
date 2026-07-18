"""Monitoring tests (P3.10): backtesting + drift detection."""

from __future__ import annotations

import numpy as np

from ml.features import build_price_features
from ml.monitoring import backtest_regression, population_stability_index, psi_alert

AS_OF = __import__("datetime").date(2025, 1, 1)


def test_backtest_reports_metrics_and_coverage(trained):
    registry, _ = trained
    model, _ = registry.load("price")
    fs = build_price_features(AS_OF)
    result = backtest_regression(model, fs, tail_fraction=0.15, horizon_years=1)
    assert result.n > 0
    assert result.mae >= 0
    assert 0.0 <= result.coverage <= 1.0
    assert result.domain == "price"


def test_psi_zero_for_identical_distributions():
    rng = np.random.default_rng(0)
    x = rng.normal(size=1000)
    psi = population_stability_index(x, x.copy())
    assert psi < 1e-6


def test_psi_alert_on_large_shift():
    rng = np.random.default_rng(1)
    ref = rng.normal(0, 1, 1000)
    cur = rng.normal(5, 1, 1000)  # big mean shift
    psi, alert = psi_alert(ref, cur)
    assert psi > 0.2
    assert alert is True


def test_psi_no_alert_on_small_shift():
    rng = np.random.default_rng(2)
    ref = rng.normal(0, 1, 2000)
    cur = rng.normal(0.02, 1, 2000)
    _psi, alert = psi_alert(ref, cur)
    assert alert is False
