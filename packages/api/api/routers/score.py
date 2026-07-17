"""Future Intelligence Score endpoint (blueprint §1 feature 2)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.deps import DbSession
from api.scoring import compute_score
from warehouse.repositories import InfraEventRepo, LocalityRepo
from warehouse.schemas import PredictionEnvelope

router = APIRouter(tags=["score"])


@router.get("/localities/{locality_id}/score", response_model=PredictionEnvelope)
def locality_score(locality_id: str, db: DbSession) -> PredictionEnvelope:
    if LocalityRepo(db).get(locality_id) is None:
        raise HTTPException(404, "locality not found")
    events = InfraEventRepo(db).affecting_locality(locality_id)
    return compute_score(events)
