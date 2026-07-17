"""Retrieval for the copilot (blueprint §6 step 2).

Structured facts from the warehouse (PostGIS) + top-k doc chunks by pgvector
similarity. Everything retrieved is from OUR data and carries a citation.
"""

from __future__ import annotations

from typing import Protocol

from sqlalchemy.orm import Session

from api.copilot.schemas import ChunkHit, RetrievedContext
from common.logging import get_logger
from warehouse.models import Source
from warehouse.repositories import (
    BuilderRepo,
    DocChunkRepo,
    InfraEventRepo,
    LocalityRepo,
)
from warehouse.schemas import Citation

log = get_logger(__name__)


class Retriever(Protocol):
    def retrieve(self, query: str, *, locality_id: str | None = None) -> RetrievedContext: ...


class DBRetriever:
    """Retrieves from Postgres + pgvector. Embeds the query via the LLM client."""

    def __init__(self, session: Session, *, embedder=None, top_k: int = 6) -> None:  # noqa: ANN001
        self.session = session
        self.top_k = top_k
        self._embedder = embedder

    def _embed(self, text: str) -> list[float] | None:
        try:
            if self._embedder is None:
                from common.llm import LLMClient

                self._embedder = LLMClient()
            return self._embedder.embed([text])[0]
        except Exception as exc:  # noqa: BLE001 - retrieval degrades gracefully
            log.warning("copilot_embed_failed", error=str(exc))
            return None

    def retrieve(self, query: str, *, locality_id: str | None = None) -> RetrievedContext:
        ctx = RetrievedContext()
        loc_repo = LocalityRepo(self.session)
        infra_repo = InfraEventRepo(self.session)

        locality = None
        if locality_id:
            locality = loc_repo.get(locality_id)
        if locality is None:
            matches = loc_repo.search_by_name(_likely_place(query))
            locality = matches[0] if matches else None

        if locality is not None:
            ctx.locality = loc_repo.get_read(locality.id)
            ctx.facts = infra_repo.affecting_locality(locality.id)

        # Builder mention
        builders = BuilderRepo(self.session).search_by_name(query)
        if builders:
            ctx.builder = BuilderRepo(self.session).get_read(builders[0].id)

        # Vector chunk retrieval
        embedding = self._embed(query)
        if embedding is not None:
            chunks = DocChunkRepo(self.session).search(embedding, limit=self.top_k)
            ctx.chunks = [self._chunk_hit(c) for c in chunks]
        return ctx

    def _chunk_hit(self, chunk) -> ChunkHit:  # noqa: ANN001
        source = self.session.get(Source, chunk.source_id) if chunk.source_id else None
        return ChunkHit(
            chunk_id=chunk.id,
            text=chunk.text,
            citation=Citation(
                source_id=chunk.source_id,
                source_name=source.source_name if source else None,
                source_document=(source.base_url if source else None),
            ),
        )


def _likely_place(query: str) -> str:
    """Cheap heuristic: pull a 'Sector N' mention, else use the whole query."""
    import re

    m = re.search(r"sector\s+\d+[A-Za-z]?", query, re.I)
    return m.group(0) if m else query
