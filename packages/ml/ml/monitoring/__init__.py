"""Model monitoring + accuracy-framing guards (blueprint §5, §13, P3.10)."""

from __future__ import annotations

from ml.monitoring.backtest import BacktestResult, backtest_regression
from ml.monitoring.drift import population_stability_index, psi_alert
from ml.monitoring.guards import (
    FLOOD_CONFIDENCE_CEILING,
    GuardViolation,
    enforce_serving_envelope,
    is_advisory,
    validate_envelope,
)

__all__ = [
    "validate_envelope",
    "enforce_serving_envelope",
    "is_advisory",
    "GuardViolation",
    "FLOOD_CONFIDENCE_CEILING",
    "backtest_regression",
    "BacktestResult",
    "population_stability_index",
    "psi_alert",
]
