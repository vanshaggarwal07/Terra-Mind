"""Traffic model (blueprint §5 traffic row, P3.4).

Time-series style gradient boosting over lagged traffic + road/infra features,
gated on data sufficiency: with less than ~18 months of accumulated history the
model REFUSES to forecast and returns an explicit insufficient-data envelope
rather than a misleading number (§5).
"""

from __future__ import annotations

from typing import Any

from sklearn.ensemble import GradientBoostingRegressor

from ml.envelope import insufficient_data_envelope
from ml.features.base import PERIOD_COL, FeatureSet
from ml.models.base import BaseRegressionModel, TrainReport
from warehouse.schemas import PredictionEnvelope

MIN_MONTHS = 18


class TrafficModel(BaseRegressionModel):
    domain = "traffic"
    unit = "vehicles/hour"
    confidence_ceiling = 0.8

    def __init__(self) -> None:
        super().__init__()
        self.trained_months: int = 0

    def _make_estimator(self) -> Any:  # noqa: ANN401
        return GradientBoostingRegressor(
            n_estimators=250, max_depth=3, learning_rate=0.05, random_state=0
        )

    def train(self, fs: FeatureSet) -> TrainReport:
        self.trained_months = int(fs.frame[PERIOD_COL].nunique())
        return super().train(fs)

    def predict(self, features: dict[str, float], *, horizon_years: int = 1) -> PredictionEnvelope:
        if self.trained_months < MIN_MONTHS:
            return insufficient_data_envelope(
                model_version=self.model_version or "traffic-insufficient",
                unit=self.unit,
                reason=f"only {self.trained_months} months of traffic history (need >= {MIN_MONTHS})",
            )
        return super().predict(features, horizon_years=horizon_years)
