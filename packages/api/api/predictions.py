"""Prediction serving helpers shared by the API (blueprint §5, P3.8).

A process-wide ``PredictionService`` (models load once), plus a helper that
assembles a feature vector for a locality and returns a band+disclaimer-enforced
envelope. Enforcement happens at THIS boundary, not just in the UI (§13).
"""

from __future__ import annotations

from functools import lru_cache

from ml.monitoring.guards import GuardViolation, enforce_serving_envelope
from ml.serving import PredictionService, demo_features_for
from warehouse.schemas import PredictionEnvelope

DOMAINS = ("price", "traffic", "flood", "water", "aqi")

# Default horizon (years) per domain for the corridor product.
DEFAULT_HORIZON = {"price": 3, "traffic": 2, "flood": 1, "water": 3, "aqi": 1}


@lru_cache(maxsize=1)
def get_service() -> PredictionService:
    return PredictionService()


def predict_for_locality(
    domain: str,
    *,
    locality_id: str | None,
    horizon_years: int | None = None,
    overrides: dict[str, float] | None = None,
    version: str | None = None,
) -> PredictionEnvelope:
    horizon = horizon_years if horizon_years is not None else DEFAULT_HORIZON.get(domain, 3)
    features = demo_features_for(locality_id)
    if overrides:
        features.update(overrides)
    env = get_service().predict(domain, features, horizon_years=horizon, version=version)
    # Boundary guarantee: no bare number, disclaimer present, ceilings respected.
    try:
        return enforce_serving_envelope(env, domain=domain)
    except GuardViolation:
        # A malformed model output must never reach the client as-is (P3.8).
        from ml.envelope import unavailable_envelope

        return unavailable_envelope(model_version=f"{domain}-guarded", unit=env.unit or "")
