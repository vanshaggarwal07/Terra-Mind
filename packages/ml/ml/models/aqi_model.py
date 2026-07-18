"""Noise / AQI model (blueprint §5 noise/AQI row, P3.7).

Regression over CPCB-style AQI and proximity to highways/airport/industry
(proximity computed via PostGIS at serving time, P2.1). Emits the standard band.
"""

from __future__ import annotations

from typing import Any

from sklearn.ensemble import GradientBoostingRegressor

from ml.models.base import BaseRegressionModel


class AQIModel(BaseRegressionModel):
    domain = "aqi"
    unit = "AQI"
    confidence_ceiling = 0.8

    def _make_estimator(self) -> Any:  # noqa: ANN401
        return GradientBoostingRegressor(
            n_estimators=250, max_depth=3, learning_rate=0.05, random_state=0
        )
