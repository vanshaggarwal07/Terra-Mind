"""Price model (blueprint §5 price row, P3.3) — XGBoost gradient boosting.

NOT an LLM for the number. Target is price/sqft framed as a *range* with calibrated
confidence, never a point number (§5, §13). ``contributing_factors`` come from the
model's real feature importances so the copilot explanation matches the drivers.
"""

from __future__ import annotations

from typing import Any

from xgboost import XGBRegressor

from ml.models.base import BaseRegressionModel


class PriceModel(BaseRegressionModel):
    domain = "price"
    unit = "INR/sqft"
    confidence_ceiling = 0.85  # advisory-adjacent — never over-claim (§0.2)

    def _make_estimator(self) -> Any:  # noqa: ANN401
        return XGBRegressor(
            n_estimators=350,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=0,
            n_jobs=2,
        )
