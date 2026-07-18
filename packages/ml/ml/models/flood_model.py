"""Flood model (blueprint §5 flood row, P3.5).

Hydrological signal (elevation, drainage, rainfall) + a classifier over flood
events. HIGH LIABILITY if wrong (§5, §13) — so confidence is deliberately capped
low, bands are wide, and a prominent risk disclaimer flag is attached. The model
never emits an overconfident point risk.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier

from ml.envelope import HORIZON_SHORT
from ml.features.base import FeatureSet
from ml.models.base import BaseRegressionModel, TrainReport
from ml.registry import ModelMetadata, new_version
from warehouse.schemas import PredictionEnvelope

FLOOD_CONFIDENCE_CEILING = 0.6  # conservative by design (§5 liability)

_FLOOD_DISCLAIMER = (
    "Flood risk is a conservative, wide-band estimate for guidance only — not a "
    "guarantee or a substitute for a professional hydrological survey. Estimate, "
    "not investment advice."
)


class FloodModel(BaseRegressionModel):
    domain = "flood"
    unit = "risk 0-1"
    confidence_ceiling = FLOOD_CONFIDENCE_CEILING

    def _make_estimator(self) -> Any:  # noqa: ANN401
        return GradientBoostingClassifier(
            n_estimators=200, max_depth=3, learning_rate=0.05, random_state=0
        )

    def train(self, fs: FeatureSet) -> TrainReport:
        self.feature_names = list(fs.feature_names)
        self.unit = fs.unit
        self.synthetic = fs.card.synthetic
        X = fs.X()
        y = fs.y().to_numpy(dtype=int)
        self.feature_medians = {c: float(X[c].median()) for c in self.feature_names}

        from ml.models.base import time_split

        tr_idx, va_idx = time_split(fs.frame)
        self.estimator = self._make_estimator()
        self.estimator.fit(X.loc[tr_idx], y[fs.frame.index.get_indexer(tr_idx)])

        proba_va = self.estimator.predict_proba(X.loc[va_idx])[:, 1]
        y_va = y[fs.frame.index.get_indexer(va_idx)]
        # Brier score as calibration; residual std of prob error for band width.
        brier = float(np.mean((proba_va - y_va) ** 2))
        self.residual_std = float(np.std(proba_va - y_va)) or 0.1
        self.val_mape = brier  # reuse slot; lower is better
        self.model_version = new_version(self.domain)
        return TrainReport(
            domain=self.domain,
            model_version=self.model_version,
            metrics={"brier": round(brier, 4)},
            calibration={"prob_residual_std": round(self.residual_std, 4)},
            n_train=len(tr_idx),
            n_val=len(va_idx),
            feature_names=self.feature_names,
        )

    def metadata(self, feature_set_version: str) -> ModelMetadata:
        return ModelMetadata(
            domain=self.domain,
            model_version=self.model_version,
            feature_set_version=feature_set_version,
            trained_at=dt.datetime.now(dt.UTC).isoformat(),
            unit=self.unit,
            algorithm=type(self.estimator).__name__,
            n_train_rows=0,
            metrics={"brier": round(self.val_mape, 4)},
            calibration={"prob_residual_std": round(self.residual_std, 4)},
            feature_names=self.feature_names,
            synthetic=self.synthetic,
        )

    def _confidence(self) -> float:
        # brier in [0,1], lower better; map to a conservative confidence, capped.
        conf = 1.0 - min(self.val_mape * 2.0, 1.0)
        return float(max(0.05, min(conf, self.confidence_ceiling)))

    def predict(self, features: dict[str, float], *, horizon_years: int = 1) -> PredictionEnvelope:
        proba = float(self.estimator.predict_proba(self._row(features))[0, 1])
        # Deliberately wide band around the probability (liability caution).
        margin = max(0.12, 1.5 * self.residual_std)
        low = max(0.0, proba - margin)
        high = min(1.0, proba + margin)
        return PredictionEnvelope(
            prediction=round(proba, 3),
            prediction_low=round(low, 3),
            prediction_high=round(high, 3),
            confidence=round(self._confidence(), 3),
            contributing_factors=self._factors(),
            model_version=self.model_version,
            unit=self.unit,
            horizon=HORIZON_SHORT,
            disclaimer=_FLOOD_DISCLAIMER,
            data_layer="prediction",
        )
