"""Satellite pattern-signal API (blueprint §3.5, P4.5).

Surfaces ``construction_detected`` signals derived from satellite imagery — clearly
labelled as PATTERN signals (not official facts) so users understand the trust tier.
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from api.deps import DbSession
from warehouse.repositories import InfraEventRepo
from warehouse.schemas import InfraEventRead

router = APIRouter(prefix="/signals", tags=["signals"])

PATTERN_DISCLAIMER = (
    "These are satellite-derived PATTERN signals detected by a change-detection "
    "model — not official records. They are unverified early indicators, subject to "
    "human review, and never used alone to confirm a fact."
)


class ConstructionSignalList(BaseModel):
    data_layer: str = "pattern_cv"
    disclaimer: str = PATTERN_DISCLAIMER
    total: int
    items: list[InfraEventRead] = Field(default_factory=list)


@router.get("/construction", response_model=ConstructionSignalList)
def construction_signals(
    db: DbSession,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> ConstructionSignalList:
    items = InfraEventRepo(db).list_pattern_signals(limit=limit, offset=offset)
    return ConstructionSignalList(total=len(items), items=items)
