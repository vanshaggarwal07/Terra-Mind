"""Metro / Airport / Expressway proximity impact card (blueprint §1 feature 3).

Facts only: for each of the three highest-impact infra classes, the nearest
verified event with distance + status + expected year + citation. NO predicted
monetary/price impact is asserted (that is Phase 3)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from api.deps import DbSession
from api.schemas import FACTUAL
from warehouse.enums import InfraEventType
from warehouse.repositories import InfraEventRepo, LocalityRepo
from warehouse.schemas import InfraEventRead

router = APIRouter(tags=["proximity"])

# The three highest-impact classes for this corridor. Expressway/RRTS collapses
# to road + rrts (both count as the "expressway/rrts" slot; nearest wins).
_SLOTS: dict[str, list[InfraEventType]] = {
    "metro": [InfraEventType.metro],
    "airport": [InfraEventType.airport],
    "expressway_rrts": [InfraEventType.road, InfraEventType.rrts],
}


class ProximityResponse(BaseModel):
    data_layer: str = FACTUAL
    disclaimer: str = (
        "Distances and statuses are factual, sourced from public records. This is "
        "not a predicted price impact (facts only at this stage)."
    )
    lat: float
    lng: float
    nearest: dict[str, InfraEventRead | None] = Field(default_factory=dict)


def _nearest_for_slots(repo: InfraEventRepo, lat: float, lng: float) -> dict[str, InfraEventRead | None]:
    out: dict[str, InfraEventRead | None] = {}
    for slot, types in _SLOTS.items():
        candidates = [c for c in (repo.nearest_by_type(lat, lng, t) for t in types) if c]
        candidates.sort(key=lambda e: e.distance_km if e.distance_km is not None else 1e9)
        out[slot] = candidates[0] if candidates else None
    return out


@router.get("/localities/{locality_id}/proximity", response_model=ProximityResponse)
def locality_proximity(locality_id: str, db: DbSession) -> ProximityResponse:
    loc = LocalityRepo(db).get_read(locality_id)
    if loc is None:
        raise HTTPException(404, "locality not found")
    if loc.centroid_lat is None or loc.centroid_lng is None:
        raise HTTPException(422, "locality has no centroid")
    repo = InfraEventRepo(db)
    return ProximityResponse(
        lat=loc.centroid_lat,
        lng=loc.centroid_lng,
        nearest=_nearest_for_slots(repo, loc.centroid_lat, loc.centroid_lng),
    )


@router.get("/proximity", response_model=ProximityResponse)
def proximity_by_point(
    db: DbSession,
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> ProximityResponse:
    repo = InfraEventRepo(db)
    return ProximityResponse(lat=lat, lng=lng, nearest=_nearest_for_slots(repo, lat, lng))
