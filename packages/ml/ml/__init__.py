"""Phase 3 — Prediction / ML Engine (blueprint §5, §6).

Trustworthy forecasts (price, traffic, flood, water, AQI) that:
- emit the SAME standard envelope as the Phase-2 rule score (§5),
- ship advisory numbers as a confidence *band*, never a bare number (§5, §13),
- derive ``contributing_factors`` from real feature importances so the copilot's
  explanation can never drift from the number, and
- refuse to forecast on insufficient data rather than fabricate (§1, §5).

Hard rule (§5): the LLM never produces the numbers. Numbers come from the tabular /
time-series / hydrological models in this package; the LLM only explains them.
"""

from __future__ import annotations

from ml.envelope import (
    HORIZON_DIRECTIONAL,
    HORIZON_SHORT,
    banded_envelope,
    horizon_for_years,
    insufficient_data_envelope,
    unavailable_envelope,
)

__all__ = [
    "banded_envelope",
    "insufficient_data_envelope",
    "unavailable_envelope",
    "horizon_for_years",
    "HORIZON_SHORT",
    "HORIZON_DIRECTIONAL",
]
