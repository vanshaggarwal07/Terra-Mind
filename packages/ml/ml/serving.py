"""Model serving (blueprint §5, P3.8 support).

Loads registered models by version and turns a feature vector into the standard
banded envelope. If a model artifact cannot be loaded, returns an explicit
low-confidence *unavailable* envelope rather than raising — the API boundary
(P3.8) then guarantees the client never sees an error it might mishandle.

For demo/offline use, ``demo_features_for`` derives a current feature vector for a
synthetic corridor locality; in production a warehouse-backed provider supplies
point-in-time features (proximity via PostGIS, §P2.1).
"""

from __future__ import annotations

import datetime as dt
from functools import lru_cache

from common.logging import get_logger
from ml.envelope import unavailable_envelope
from ml.features.synthetic import build_panel
from ml.registry import ModelRegistry
from warehouse.schemas import PredictionEnvelope

log = get_logger(__name__)

_UNITS = {
    "price": "INR/sqft",
    "traffic": "vehicles/hour",
    "flood": "risk 0-1",
    "water": "m below surface",
    "aqi": "AQI",
}


class PredictionService:
    def __init__(self, registry: ModelRegistry | None = None) -> None:
        self.registry = registry or ModelRegistry()
        self._cache: dict[tuple[str, str | None], object] = {}

    def _load(self, domain: str, version: str | None):  # noqa: ANN202
        key = (domain, version)
        if key not in self._cache:
            model, _meta = self.registry.load(domain, version)
            self._cache[key] = model
        return self._cache[key]

    def predict(
        self,
        domain: str,
        features: dict[str, float],
        *,
        horizon_years: int = 3,
        version: str | None = None,
    ) -> PredictionEnvelope:
        try:
            model = self._load(domain, version)
        except FileNotFoundError as exc:
            log.warning("model_unavailable", domain=domain, error=str(exc))
            return unavailable_envelope(
                model_version=f"{domain}-unavailable", unit=_UNITS.get(domain, "")
            )
        return model.predict(features, horizon_years=horizon_years)

    def available(self, domain: str) -> bool:
        return self.registry.latest_version(domain) is not None


@lru_cache(maxsize=1)
def _demo_panel_today():  # noqa: ANN202
    return build_panel(dt.date.today())


def demo_features_for(locality_id: str | None) -> dict[str, float]:
    """Latest synthetic feature row for a corridor locality (offline demo).

    Returns the most recent month's row for a matching ``loc-NN`` id, else the
    corridor-wide latest averages. Missing features are backfilled by the model's
    training medians at predict time.
    """
    panel = _demo_panel_today()
    latest = panel.sort_values("period").groupby("locality_id").tail(1)
    if locality_id and locality_id in set(latest["locality_id"]):
        row = latest[latest["locality_id"] == locality_id].iloc[0]
    else:
        row = latest.mean(numeric_only=True)
    return {k: float(v) for k, v in row.items() if isinstance(v, int | float)}
