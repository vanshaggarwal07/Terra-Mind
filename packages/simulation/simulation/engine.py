"""Simulation engine (blueprint §7, P4.1): mutate -> recompute -> diff.

The engine is pure and stateless: it takes the baseline event list + current
feature vector + a scenario, and the score/predict callables (injected by the API
so ``simulation`` never imports ``api``/``ml`` and there is no cycle). It applies
the scenario to an in-memory sandbox, recomputes via the SAME serving path, and
returns baseline-vs-scenario diffs. Identical scenario -> identical result.
"""

from __future__ import annotations

from collections.abc import Callable

from simulation.diff import diff_envelopes
from simulation.features import apply_feature_delta, derive_features
from simulation.sandbox import apply_scenario
from simulation.schemas import Scenario, SimulationResult
from warehouse.schemas import InfraEventRead, PredictionEnvelope

# score_fn(events) -> envelope ; predict_fn(domain, features, horizon_years) -> envelope
ScoreFn = Callable[[list[InfraEventRead]], PredictionEnvelope]
PredictFn = Callable[[str, dict[str, float], int], PredictionEnvelope]


class SimulationEngine:
    def __init__(self, score_fn: ScoreFn, predict_fn: PredictFn) -> None:
        self._score_fn = score_fn
        self._predict_fn = predict_fn

    def run(
        self,
        *,
        baseline_events: list[InfraEventRead],
        base_features: dict[str, float],
        scenario: Scenario,
        locality_id: str | None = None,
    ) -> SimulationResult:
        scenario_events = apply_scenario(baseline_events, scenario)

        # --- Future Intelligence Score: direct function of the event set ---
        score_diff = diff_envelopes(
            "score",
            self._score_fn(baseline_events),
            self._score_fn(scenario_events),
        )

        # --- Phase-3 predictions: apply derived-feature deltas, recompute ---
        derived_base = derive_features(baseline_events)
        derived_scen = derive_features(scenario_events)
        scen_features = apply_feature_delta(base_features, derived_base, derived_scen)
        horizon = scenario.horizon_years or 3

        predictions: dict[str, object] = {}
        for domain in scenario.domains:
            baseline_env = self._predict_fn(domain, base_features, horizon)
            scenario_env = self._predict_fn(domain, scen_features, horizon)
            predictions[domain] = diff_envelopes(domain, baseline_env, scenario_env)

        return SimulationResult(
            locality_id=locality_id,
            score=score_diff,
            predictions=predictions,  # type: ignore[arg-type]
        )
