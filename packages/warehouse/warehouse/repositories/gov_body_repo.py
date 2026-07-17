"""Repository for ``gov_bodies`` (blueprint §4)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.models import GovBody
from warehouse.schemas import GovBodyRead


class GovBodyRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, gov_body_id: str) -> GovBody | None:
        return self.session.get(GovBody, gov_body_id)

    def get_read(self, gov_body_id: str) -> GovBodyRead | None:
        row = self.get(gov_body_id)
        return GovBodyRead.model_validate(row) if row else None

    def get_or_create(self, name: str, jurisdiction: str | None = None) -> GovBody:
        existing = self.session.scalar(select(GovBody).where(GovBody.name == name))
        if existing is not None:
            return existing
        row = GovBody(name=name, jurisdiction=jurisdiction)
        self.session.add(row)
        self.session.flush()
        return row

    def list(self) -> list[GovBody]:
        return list(self.session.scalars(select(GovBody).order_by(GovBody.name)).all())
