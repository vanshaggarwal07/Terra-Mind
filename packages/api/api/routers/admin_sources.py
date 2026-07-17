"""Admin CRUD for the source registry (blueprint §3.1).

Adding source #41 is a POST here (or a seed row) — never a code change."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api.deps import DbSession
from warehouse.repositories import SourcesRepo
from warehouse.schemas import SourceCreate, SourceRead, SourceUpdate

router = APIRouter(prefix="/admin/sources", tags=["admin"])


@router.get("", response_model=list[SourceRead])
def list_sources(db: DbSession, active: bool = False) -> list[SourceRead]:
    return [SourceRead.model_validate(s) for s in SourcesRepo(db).list(active_only=active)]


@router.post("", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(payload: SourceCreate, db: DbSession) -> SourceRead:
    source, _ = SourcesRepo(db).upsert_by_name(payload)
    return SourceRead.model_validate(source)


@router.get("/{source_id}", response_model=SourceRead)
def get_source(source_id: str, db: DbSession) -> SourceRead:
    source = SourcesRepo(db).get(source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="source not found")
    return SourceRead.model_validate(source)


@router.patch("/{source_id}", response_model=SourceRead)
def update_source(source_id: str, payload: SourceUpdate, db: DbSession) -> SourceRead:
    source = SourcesRepo(db).update(source_id, payload)
    if source is None:
        raise HTTPException(status_code=404, detail="source not found")
    return SourceRead.model_validate(source)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(source_id: str, db: DbSession) -> None:
    if not SourcesRepo(db).delete(source_id):
        raise HTTPException(status_code=404, detail="source not found")
