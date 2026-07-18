"""Shared regression-model machinery (blueprint §5, P3.2/P3.3).

``BaseRegressionModel`` handles: a time-based (no-leakage) train/validation split,
calibrated prediction *bands* from validation residuals, confidence derived from
validation error (never a guess), and ``contributing_factors`` derived from real
feature importances so the copilot's "why" can never drift from the number.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from ml.envelope import (
    HORIZON_DIRECTIONAL,
    banded_envelope,
    horizon_for_years,
)
from ml.features.base import PERIOD_COL, FeatureSet
from ml.registry import ModelMetadata, new_version
from warehouse.schemas import ContributingFactor, PredictionEnvelope

# z-scores for one-sided normal quantiles -> symmetric interval width.
_Z_80 = 1.2816  # ~80% central interval


@dataclass
class TrainReport:
    domain: str
    model_version: str
    metrics: dict[str, float]
    calibration: dict[str, float]
    n_train: int
    n_val: int
    feature_names: list[str] = field(default_factory=list)


def time_split(frame: pd.DataFrame, val_fraction: float = 0.2) -> tuple[pd.Index, pd.Index]:
    """Chronological split — validation is the most-recent slice (no leakage)."""
    ordered = frame.sort_values(PERIOD_COL)
    n_val = max(1, int(len(ordered) * val_fraction))
    return ordered.index[:-n_val], ordered.index[-n_val:]


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = np.clip(np.abs(y_true), 1e-6, None)
    return float(np.mean(np.abs((y_true - y_pred) / denom)))


class BaseRegressionModel:
    domain: str = "base"
    unit: str = ""
    # widen the band by this fraction per year of horizon beyond the near term.
    horizon_widen_per_year: float = 0.06
    confidence_ceiling: float = 0.9

    def __init__(self) -> None:
        self.estimator: Any = None
        self.feature_names: list[str] = []
        self.feature_medians: dict[str, float] = {}
        self.residual_std: float = 0.0
        self.val_mape: float = 1.0
        self.model_version: str = ""
        self.synthetic: bool = True

    # -- subclasses provide the estimator ------------------------------------
    def _make_estimator(self) -> Any:  # noqa: ANN401
        raise NotImplementedError

    def _confidence(self) -> float:
        """Confidence from validation error, capped (§5 never claim certainty)."""
        conf = 1.0 - min(self.val_mape, 1.0)
        return float(max(0.05, min(conf, self.confidence_ceiling)))

    # -- training ------------------------------------------------------------
    def train(self, fs: FeatureSet) -> TrainReport:
        self.feature_names = list(fs.feature_names)
        self.unit = fs.unit
        self.synthetic = fs.card.synthetic
        X = fs.X()
        y = fs.y().to_numpy(dtype=float)
        self.feature_medians = {c: float(X[c].median()) for c in self.feature_names}

        tr_idx, va_idx = time_split(fs.frame)
        self.estimator = self._make_estimator()
        self.estimator.fit(X.loc[tr_idx], y[fs.frame.index.get_indexer(tr_idx)])

        preds_va = self.estimator.predict(X.loc[va_idx])
        y_va = y[fs.frame.index.get_indexer(va_idx)]
        residuals = y_va - preds_va
        self.residual_std = float(np.std(residuals)) or float(np.std(y) * 0.1 + 1e-6)
        mae = float(np.mean(np.abs(residuals)))
        self.val_mape = mape(y_va, preds_va)
        self.model_version = new_version(self.domain)

        return TrainReport(
            domain=self.domain,
            model_version=self.model_version,
            metrics={"mae": round(mae, 4), "mape": round(self.val_mape, 4)},
            calibration={"residual_std": round(self.residual_std, 4), "z80": _Z_80},
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
            metrics={"mape": round(self.val_mape, 4)},
            calibration={"residual_std": round(self.residual_std, 4)},
            feature_names=self.feature_names,
            synthetic=self.synthetic,
        )

    # -- factors from importances -------------------------------------------
    def _factors(self, max_factors: int = 6) -> list[ContributingFactor]:
        importances = getattr(self.estimator, "feature_importances_", None)
        if importances is None:
            coefs = getattr(self.estimator, "coef_", None)
            importances = np.abs(np.ravel(coefs)) if coefs is not None else None
        if importances is None or len(importances) != len(self.feature_names):
            return [
                ContributingFactor(factor=f, weight=0.0) for f in self.feature_names[:max_factors]
            ]
        total = float(np.sum(importances)) or 1.0
        pairs = sorted(
            zip(self.feature_names, importances, strict=False),
            key=lambda p: p[1],
            reverse=True,
        )
        return [
            ContributingFactor(factor=_label(name), weight=round(float(imp) / total, 3))
            for name, imp in pairs[:max_factors]
        ]

    # -- feature-vector assembly (fills gaps with training medians) ----------
    def _row(self, features: dict[str, float]) -> pd.DataFrame:
        data = {
            c: [float(features.get(c, self.feature_medians.get(c, 0.0)))]
            for c in self.feature_names
        }
        return pd.DataFrame(data)

    def _point(self, features: dict[str, float]) -> float:
        return float(self.estimator.predict(self._row(features))[0])

    # -- serving -------------------------------------------------------------
    def predict(self, features: dict[str, float], *, horizon_years: int = 3) -> PredictionEnvelope:
        point = self._point(features)
        horizon = horizon_for_years(horizon_years)
        widen = 1.0 + self.horizon_widen_per_year * max(0, horizon_years - 1)
        half = _Z_80 * self.residual_std * widen
        low, high = point - half, point + half

        # 10yr+ is directional only — never a specific number (§5). We still return
        # a (wide) band but drop the misleadingly-precise point to the band centre.
        if horizon == HORIZON_DIRECTIONAL:
            point = (low + high) / 2.0
        # confidence attenuates with horizon distance
        confidence = self._confidence() * (widen if widen < 1 else 1.0 / widen)

        return banded_envelope(
            point=point,
            low=low,
            high=high,
            confidence=confidence,
            factors=self._factors(),
            model_version=self.model_version,
            unit=self.unit,
            horizon=horizon,
            confidence_ceiling=self.confidence_ceiling,
        )


_LABELS = {
    "price_sqft_lag12": "recent price trend",
    "traffic_lag12": "recent traffic trend",
    "gw_level_lag12": "recent groundwater trend",
    "infra_progress": "infrastructure progress nearby",
    "inflation_index": "inflation",
    "rental_yield": "rental yield",
    "builder_track_record": "builder track record",
    "dist_metro_km": "distance to metro",
    "dist_expressway_km": "distance to expressway",
    "dist_airport_km": "distance to airport",
    "dist_highway_km": "distance to highway",
    "road_width_m": "road width",
    "elevation_m": "ground elevation",
    "drainage_quality": "drainage quality",
    "rainfall_mm": "rainfall",
    "near_industry": "proximity to industry",
    "month_index": "seasonality/time trend",
}


def _label(name: str) -> str:
    return _LABELS.get(name, name.replace("_", " "))
