"""Accuracy-framing guards enforced at the serving boundary + in CI (P3.8/P3.10).

Users must never see a bare advisory number without a band + disclaimer (§5, §13).
These guards are the single source of truth for that rule, reused by the API
enforcement middleware and by CI guard tests.
"""

from __future__ import annotations

from ml.envelope import HORIZON_DIRECTIONAL
from warehouse.schemas import PredictionEnvelope

FLOOD_CONFIDENCE_CEILING = 0.6
GLOBAL_CONFIDENCE_CEILING = 0.9


class GuardViolation(ValueError):
    """Raised when an envelope violates the accuracy-framing rules."""


def is_advisory(env: PredictionEnvelope) -> bool:
    """Advisory ML output (vs. the Phase-2 rule score or an explicit non-forecast).

    An envelope is advisory when it carries a real band OR declares a unit/horizon.
    Insufficient-data / unavailable envelopes (confidence 0, no band) are exempt —
    they already communicate 'no number'.
    """
    if env.confidence == 0.0 and not env.has_band():
        return False
    return env.has_band() or env.unit is not None


def validate_envelope(env: PredictionEnvelope, *, domain: str | None = None) -> None:
    """Raise ``GuardViolation`` if an advisory envelope breaks the framing rules."""
    if not is_advisory(env):
        return  # score / insufficient / unavailable envelopes are exempt

    if not env.has_band():
        raise GuardViolation("advisory prediction lacks a band (bare number forbidden)")
    if env.prediction_low > env.prediction or env.prediction > env.prediction_high:
        raise GuardViolation("prediction must lie within [low, high]")
    if not env.disclaimer:
        raise GuardViolation("advisory prediction lacks a disclaimer")
    if env.confidence > GLOBAL_CONFIDENCE_CEILING + 1e-9:
        raise GuardViolation("confidence exceeds global ceiling")
    if (domain == "flood" or (env.unit or "").startswith("risk")) and (
        env.confidence > FLOOD_CONFIDENCE_CEILING + 1e-9
    ):
        raise GuardViolation("flood confidence exceeds conservative ceiling")
    if env.horizon == HORIZON_DIRECTIONAL:
        # 10yr+ must be directional: a wide band centred, never falsely precise.
        width = env.prediction_high - env.prediction_low
        if width <= 0:
            raise GuardViolation("directional (10yr+) horizon must still be a range")


def enforce_serving_envelope(
    env: PredictionEnvelope, *, domain: str | None = None
) -> PredictionEnvelope:
    """Boundary enforcement (P3.8): validate, and clamp confidence to the ceiling.

    Confidence is clamped defensively (never raises for that); structural problems
    like a missing band raise ``GuardViolation`` so a bare number can never ship.
    """
    ceiling = (
        FLOOD_CONFIDENCE_CEILING
        if (domain == "flood" or (env.unit or "").startswith("risk"))
        else GLOBAL_CONFIDENCE_CEILING
    )
    if env.confidence > ceiling:
        env = env.model_copy(update={"confidence": ceiling})
    validate_envelope(env, domain=domain)
    return env
