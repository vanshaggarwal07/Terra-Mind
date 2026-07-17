"""Repository for ``builders`` — FACTS ONLY (blueprint §0, §13).

There is deliberately NO method that computes a trust score, ranking, or verdict.
The read model surfaces cited UP-RERA facts and a disclaimer, nothing more.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.models import Builder, Source
from warehouse.schemas import BuilderProject, BuilderRead, Citation


def to_read(builder: Builder, source: Source | None = None) -> BuilderRead:
    citation = Citation(
        source_id=builder.source_id,
        source_name=source.source_name if source else "UP-RERA",
        source_document=builder.source_document or (source.base_url if source else None),
        as_of=builder.last_verified_at,
    )
    projects: list[BuilderProject] = []
    delays: list[dict] = []
    complaints: list[dict] = []
    registration_status = None
    for entry in builder.project_history or []:
        kind = entry.get("kind", "project")
        if kind == "delay":
            delays.append(entry)
        elif kind == "complaint":
            complaints.append(entry)
        elif kind == "registration":
            registration_status = entry.get("status")
        else:
            projects.append(
                BuilderProject(
                    name=entry.get("name"),
                    rera_id=entry.get("rera_id"),
                    status=entry.get("status"),
                    promised_completion=entry.get("promised_completion"),
                    actual_completion=entry.get("actual_completion"),
                    citation=Citation(
                        source_id=builder.source_id,
                        source_name=citation.source_name,
                        source_document=entry.get("source_url") or citation.source_document,
                        as_of=builder.last_verified_at,
                    ),
                )
            )
    return BuilderRead(
        id=builder.id,
        name=builder.name,
        rera_id=builder.rera_id,
        registration_status=registration_status,
        projects=projects,
        delay_history=delays,
        complaint_flags=complaints,
        citation=citation,
    )


class BuilderRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, builder_id: str) -> Builder | None:
        return self.session.get(Builder, builder_id)

    def get_by_rera_id(self, rera_id: str) -> Builder | None:
        return self.session.scalar(select(Builder).where(Builder.rera_id == rera_id))

    def search_by_name(self, query: str, *, limit: int = 5) -> list[Builder]:
        stmt = select(Builder).where(Builder.name.ilike(f"%{query}%")).limit(limit)
        return list(self.session.scalars(stmt).all())

    def _with_source(self, builder: Builder) -> Source | None:
        if builder.source_id is None:
            return None
        return self.session.get(Source, builder.source_id)

    def get_read(self, builder_id: str) -> BuilderRead | None:
        builder = self.get(builder_id)
        if builder is None:
            return None
        return to_read(builder, self._with_source(builder))

    def get_read_by_rera_id(self, rera_id: str) -> BuilderRead | None:
        builder = self.get_by_rera_id(rera_id)
        if builder is None:
            return None
        return to_read(builder, self._with_source(builder))

    def create(
        self,
        *,
        name: str,
        rera_id: str | None = None,
        project_history: list[dict] | None = None,
        source_id: str | None = None,
        source_document: str | None = None,
    ) -> Builder:
        builder = Builder(
            name=name,
            rera_id=rera_id,
            project_history=project_history or [],
            source_id=source_id,
            source_document=source_document,
        )
        self.session.add(builder)
        self.session.flush()
        return builder
