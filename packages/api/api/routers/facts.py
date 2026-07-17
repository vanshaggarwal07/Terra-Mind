"""Digital Twin facts API (blueprint §1 feature 1, §4).

Exposes ONLY verified facts, each with a citation and a ``data_layer:"factual"``
marker. No predictions here (that is Phase 3)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from api.deps import DbSession
from api.schemas import InfraEventList, TimelineResponse
from warehouse.enums import InfraEventStatus, InfraEventType
from warehouse.repositories import InfraEventRepo, LocalityRepo
from warehouse.schemas import InfraEventRead, LocalityRead

router = APIRouter(tags=["facts"])


@router.get("/localities", response_model=list[LocalityRead])
def list_localities(
    db: DbSession,
    limit: int = Query(200, le=500),
    offset: int = 0,
) -> list[LocalityRead]:
    return LocalityRepo(db).list_read(limit=limit, offset=offset)


@router.get("/localities/{locality_id}", response_model=LocalityRead)
def get_locality(locality_id: str, db: DbSession) -> LocalityRead:
    loc = LocalityRepo(db).get_read(locality_id)
    if loc is None:
        raise HTTPException(404, "locality not found")
    return loc


@router.get("/localities/{locality_id}/timeline", response_model=TimelineResponse)
def locality_timeline(locality_id: str, db: DbSession) -> TimelineResponse:
    """Verified infra events affecting the locality, ordered for a Gantt render."""
    if LocalityRepo(db).get(locality_id) is None:
        raise HTTPException(404, "locality not found")
    events = InfraEventRepo(db).affecting_locality(locality_id)
    years = sorted({e.expected_year for e in events if e.expected_year is not None})
    return TimelineResponse(locality_id=locality_id, events=events, years=years)


@router.get("/infra-events", response_model=InfraEventList)
def list_infra_events(
    db: DbSession,
    type: InfraEventType | None = None,
    status: InfraEventStatus | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = Query(None, gt=0, le=100),
    limit: int = Query(100, le=500),
    offset: int = 0,
) -> InfraEventList:
    repo = InfraEventRepo(db)
    if lat is not None and lng is not None and radius_km is not None:
        items: list[InfraEventRead] = repo.within_km(lat, lng, radius_km, type=type)
        # status filter applied in-memory for the geospatial path
        if status is not None:
            items = [i for i in items if i.status == status.value]
        page = items[offset : offset + limit]
        return InfraEventList(total=len(items), limit=limit, offset=offset, items=page)

    items = repo.list_read(type=type, status=status, limit=limit, offset=offset)
    return InfraEventList(total=len(items), limit=limit, offset=offset, items=items)
