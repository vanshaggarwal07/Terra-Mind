"""What-if simulation API (blueprint §7, P4.1).

Reads a locality's baseline verified events (read-only), then recomputes the
Phase-2 score + Phase-3 predictions under a scenario using the SAME serving path,
and returns baseline-vs-scenario diffs. No scenario state is ever persisted.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.deps import DbSession
from api.predictions import get_service
from api.scoring import compute_score
from ml.envelope import unavailable_envelope
from ml.monitoring.guards import GuardViolation, enforce_serving_envelope
from ml.serving import demo_features_for
from simulation import Scenario, SimulationEngine, SimulationResult
from warehouse.repositories import InfraEventRepo, LocalityRepo
from warehouse.schemas import InfraEventRead, PredictionEnvelope

router = APIRouter(tags=["simulation"])


class SimulateRequest(BaseModel):
    locality_id: str
    scenario: Scenario


def _enforced_predict(domain: str, features: dict[str, float], horizon: int) -> PredictionEnvelope:
    env = get_service().predict(domain, features, horizon_years=horizon)
    try:
        return enforce_serving_envelope(env, domain=domain)
    except GuardViolation:
        return unavailable_envelope(model_version=f"{domain}-guarded", unit=env.unit or "")


def run_simulation(
    *,
    baseline_events: list[InfraEventRead],
    base_features: dict[str, float],
    scenario: Scenario,
    locality_id: str | None = None,
) -> SimulationResult:
    """DB-free core (unit-testable): wires the real score + predict path."""
    engine = SimulationEngine(score_fn=compute_score, predict_fn=_enforced_predict)
    return engine.run(
        baseline_events=baseline_events,
        base_features=base_features,
        scenario=scenario,
        locality_id=locality_id,
    )


@router.post("/simulate", response_model=SimulationResult)
def simulate(payload: SimulateRequest, db: DbSession) -> SimulationResult:
    if LocalityRepo(db).get(payload.locality_id) is None:
        raise HTTPException(404, "locality not found")
    baseline = InfraEventRepo(db).affecting_locality(payload.locality_id)
    base_features = demo_features_for(payload.locality_id)
    return run_simulation(
        baseline_events=baseline,
        base_features=base_features,
        scenario=payload.scenario,
        locality_id=payload.locality_id,
    )
