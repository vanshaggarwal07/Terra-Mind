"""Envelope diffing (blueprint §7, P4.1): baseline vs scenario + factor deltas."""

from __future__ import annotations

from simulation.schemas import EnvelopeDiff, FactorDelta
from warehouse.schemas import PredictionEnvelope


def _round(x: float | None) -> float | None:
    return round(x, 4) if x is not None else None


def diff_envelopes(
    metric: str, baseline: PredictionEnvelope, scenario: PredictionEnvelope
) -> EnvelopeDiff:
    base_factors = {f.factor: f.weight for f in baseline.contributing_factors}
    scen_factors = {f.factor: f.weight for f in scenario.contributing_factors}

    deltas: list[FactorDelta] = []
    for name in sorted(set(base_factors) | set(scen_factors)):
        b = base_factors.get(name, 0.0)
        s = scen_factors.get(name, 0.0)
        deltas.append(
            FactorDelta(
                factor=name,
                baseline_weight=round(b, 4),
                scenario_weight=round(s, 4),
                delta=round(s - b, 4),
            )
        )
    # largest-magnitude change first
    deltas.sort(key=lambda d: abs(d.delta), reverse=True)

    low_delta = None
    high_delta = None
    if baseline.prediction_low is not None and scenario.prediction_low is not None:
        low_delta = _round(scenario.prediction_low - baseline.prediction_low)
    if baseline.prediction_high is not None and scenario.prediction_high is not None:
        high_delta = _round(scenario.prediction_high - baseline.prediction_high)

    return EnvelopeDiff(
        metric=metric,
        baseline=baseline,
        scenario=scenario,
        prediction_delta=round(scenario.prediction - baseline.prediction, 4),
        low_delta=low_delta,
        high_delta=high_delta,
        confidence_delta=round(scenario.confidence - baseline.confidence, 4),
        factor_deltas=deltas,
    )
