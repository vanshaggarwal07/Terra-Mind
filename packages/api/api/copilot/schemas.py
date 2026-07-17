"""Copilot request/response + retrieval DTOs."""

from __future__ import annotations

from pydantic import BaseModel, Field

from warehouse.schemas import BuilderRead, Citation, InfraEventRead, LocalityRead


class CopilotQuery(BaseModel):
    query: str
    locality_id: str | None = None  # optional explicit context


class ChunkHit(BaseModel):
    chunk_id: str
    text: str
    score: float | None = None
    citation: Citation = Field(default_factory=Citation)


class RetrievedContext(BaseModel):
    locality: LocalityRead | None = None
    facts: list[InfraEventRead] = Field(default_factory=list)
    chunks: list[ChunkHit] = Field(default_factory=list)
    builder: BuilderRead | None = None

    def is_empty(self) -> bool:
        return not self.facts and not self.chunks and self.builder is None


class CopilotAnswer(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    grounded: bool
    refused: bool = False
    disclaimer: str = (
        "Answers are grounded only in this platform's cited data and are not "
        "investment advice."
    )
