"""Repository for the ``sources`` registry table."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.models import Source
from warehouse.schemas import SourceCreate, SourceUpdate


class SourcesRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, source_id: str) -> Source | None:
        return self.session.get(Source, source_id)

    def get_by_name(self, name: str) -> Source | None:
        return self.session.scalar(select(Source).where(Source.source_name == name))

    def get_by_crawler_key(self, crawler_key: str) -> list[Source]:
        return list(
            self.session.scalars(select(Source).where(Source.crawler_key == crawler_key)).all()
        )

    def list(self, *, active_only: bool = False) -> list[Source]:
        stmt = select(Source)
        if active_only:
            stmt = stmt.where(Source.is_active.is_(True))
        return list(self.session.scalars(stmt).all())

    def create(self, data: SourceCreate | dict[str, Any]) -> Source:
        payload = data.model_dump() if isinstance(data, SourceCreate) else dict(data)
        source = Source(**payload)
        self.session.add(source)
        self.session.flush()
        return source

    def upsert_by_name(self, data: SourceCreate | dict[str, Any]) -> tuple[Source, bool]:
        """Insert or update by unique source_name. Returns (source, created)."""
        payload = data.model_dump() if isinstance(data, SourceCreate) else dict(data)
        existing = self.get_by_name(payload["source_name"])
        if existing is None:
            return self.create(payload), True
        for k, v in payload.items():
            setattr(existing, k, v)
        self.session.flush()
        return existing, False

    def update(self, source_id: str, data: SourceUpdate | dict[str, Any]) -> Source | None:
        source = self.get(source_id)
        if source is None:
            return None
        payload = (
            data.model_dump(exclude_unset=True) if isinstance(data, SourceUpdate) else dict(data)
        )
        for k, v in payload.items():
            setattr(source, k, v)
        self.session.flush()
        return source

    def set_active(self, source_id: str, active: bool) -> Source | None:
        return self.update(source_id, {"is_active": active})

    def delete(self, source_id: str) -> bool:
        source = self.get(source_id)
        if source is None:
            return False
        self.session.delete(source)
        self.session.flush()
        return True
