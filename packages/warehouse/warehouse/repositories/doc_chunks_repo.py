"""Repository for ``doc_chunks`` (vector index for RAG)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.models import DocChunk


class DocChunkRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(
        self,
        *,
        source_id: str | None,
        raw_cache_id: str | None,
        chunk_index: int,
        section_title: str | None,
        text: str,
        embedding: list[float] | None,
        metadata: dict[str, Any] | None = None,
    ) -> DocChunk:
        chunk = DocChunk(
            source_id=source_id,
            raw_cache_id=raw_cache_id,
            chunk_index=chunk_index,
            section_title=section_title,
            text=text,
            embedding=embedding,
            meta=metadata or {},
        )
        self.session.add(chunk)
        self.session.flush()
        return chunk

    def search(self, embedding: list[float], *, limit: int = 8) -> list[DocChunk]:
        """Cosine-distance nearest neighbors (pgvector)."""
        stmt = (
            select(DocChunk)
            .where(DocChunk.embedding.is_not(None))
            .order_by(DocChunk.embedding.cosine_distance(embedding))
            .limit(limit)
        )
        return list(self.session.scalars(stmt).all())
