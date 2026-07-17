"""UP-RERA builder record API — FACTS ONLY (blueprint §1 feature 4, §0, §13).

Returns cited regulator facts + fetch date + disclaimer. There is NO trust
score / ranking / verdict field anywhere in the response (a test enforces this)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from api.deps import DbSession
from warehouse.repositories import BuilderRepo
from warehouse.schemas import BuilderRead

router = APIRouter(prefix="/builders", tags=["builders"])


@router.get("", response_model=BuilderRead)
def get_builder_by_rera(db: DbSession, rera_id: str = Query(..., min_length=1)) -> BuilderRead:
    builder = BuilderRepo(db).get_read_by_rera_id(rera_id)
    if builder is None:
        raise HTTPException(404, "builder not found")
    return builder


@router.get("/{builder_id}", response_model=BuilderRead)
def get_builder(builder_id: str, db: DbSession) -> BuilderRead:
    builder = BuilderRepo(db).get_read(builder_id)
    if builder is None:
        raise HTTPException(404, "builder not found")
    return builder
