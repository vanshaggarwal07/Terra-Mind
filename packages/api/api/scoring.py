"""Future Intelligence Score v1 — rule-weighted, NO ML (blueprint §1 feature 2, §5).

A deterministic weighted sum of confirmed signals. It returns the standard
prediction envelope so the "why" (``contributing_factors``) is derived from the
exact same data as the number and can never drift (§8). Weights are explicit,
documented config — no opaque logic.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from warehouse.schemas import ContributingFactor, InfraEventRead, PredictionEnvelope

MODEL_VERSION = "future-intelligence-score-v1-rules"

# Base weight by infra type — corridor priorities (metro/airport/rrts dominate).
TYPE_WEIGHTS: dict[str, float] = {
    "metro": 1.0,
    "rrts": 0.9,
    "airport": 1.0,
    "road": 0.8,
    "industrial": 0.6,
    "hospital": 0.5,
    "school": 0.4,
    "mall": 0.4,
    "construction_detected": 0.2,
    "other": 0.2,
}

# Certainty multiplier by status — operational counts far more than proposed.
STATUS_WEIGHTS: dict[str, float] = {
    "operational": 1.0,
    "under_construction": 0.85,
    "approved": 0.7,
    "proposed": 0.4,
}

DEFAULT_TYPE_WEIGHT = 0.2
DEFAULT_STATUS_WEIGHT = 0.4


@dataclass(frozen=True)
class ScoreConfig:
    version: str = MODEL_VERSION
    proximity_radius_km: float = 5.0  # beyond this, an event barely counts
    horizon_years: int = 15  # completion further out counts less
    current_year: int = 2026
    saturation_k: float = 3.0  # controls how fast the 0-100 score saturates
    type_weights: dict[str, float] = field(default_factory=lambda: dict(TYPE_WEIGHTS))
    status_weights: dict[str, float] = field(default_factory=lambda: dict(STATUS_WEIGHTS))


def _proximity_factor(distance_km: float | None, radius_km: float) -> float:
    if distance_km is None:
        return 0.5  # unknown distance -> neutral
    if distance_km >= radius_km:
        return 0.0
    return 1.0 - (distance_km / radius_km)


def _recency_factor(expected_year: int | None, cfg: ScoreConfig) -> float:
    if expected_year is None:
        return 0.6
    delta = expected_year - cfg.current_year
    if delta <= 0:
        return 1.0  # already due / operational
    return max(0.3, 1.0 - delta / cfg.horizon_years)


def _event_contribution(ev: InfraEventRead, cfg: ScoreConfig) -> float:
    tw = cfg.type_weights.get(ev.type, DEFAULT_TYPE_WEIGHT)
    sw = cfg.status_weights.get(ev.status, DEFAULT_STATUS_WEIGHT)
    prox = _proximity_factor(ev.distance_km, cfg.proximity_radius_km)
    rec = _recency_factor(ev.expected_year, cfg)
    return tw * sw * prox * rec


def compute_score(
    events: list[InfraEventRead],
    cfg: ScoreConfig | None = None,
    *,
    max_factors: int = 8,
) -> PredictionEnvelope:
    cfg = cfg or ScoreConfig()

    contributions: list[tuple[InfraEventRead, float]] = [
        (ev, _event_contribution(ev, cfg)) for ev in events
    ]
    contributions = [(ev, c) for ev, c in contributions if c > 0]

    raw = sum(c for _, c in contributions)
    prediction = round(100.0 * (1.0 - math.exp(-raw / cfg.saturation_k)), 1)

    contributions.sort(key=lambda pair: pair[1], reverse=True)
    factors = [
        ContributingFactor(
            factor=_factor_label(ev),
            weight=round(c, 3),
        )
        for ev, c in contributions[:max_factors]
    ]

    return PredictionEnvelope(
        prediction=prediction,
        confidence=_confidence(events, cfg),
        contributing_factors=factors,
        model_version=cfg.version,
    )


def _factor_label(ev: InfraEventRead) -> str:
    parts = [ev.status.replace("_", " "), ev.type]
    if ev.distance_km is not None:
        parts.append(f"{ev.distance_km:.1f} km away")
    if ev.expected_year is not None:
        parts.append(f"by {ev.expected_year}")
    return " ".join(parts)


def _confidence(events: list[InfraEventRead], cfg: ScoreConfig) -> float:
    """Reflects data completeness/recency, not a guess (§5)."""
    if not events:
        return 0.0
    avg_conf = sum(e.confidence for e in events) / len(events)
    coverage = min(1.0, len(events) / 5.0)  # more corroborating events -> firmer
    return round(avg_conf * (0.5 + 0.5 * coverage), 3)
