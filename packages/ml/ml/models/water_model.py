"""Water / groundwater model (blueprint §5 water row, P3.6).

Regression/trend over CGWB-style groundwater level, rainfall recharge, seasonality,
and demand proxies. Emits the standard banded envelope.
"""

from __future__ import annotations

from typing import Any

from sklearn.ensemble import GradientBoostingRegressor

from ml.models.base import BaseRegressionModel


class WaterModel(BaseRegressionModel):
    domain = "water"
    unit = "m below surface"
    confidence_ceiling = 0.8

    def _make_estimator(self) -> Any:  # noqa: ANN401
        return GradientBoostingRegressor(
            n_estimators=250, max_depth=3, learning_rate=0.05, random_state=0
        )
