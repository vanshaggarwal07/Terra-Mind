"""API-level response DTOs (compose the warehouse read models)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from warehouse.schemas import InfraEventRead

FACTUAL = "factual"

_DISCLAIMER = (
    "Factual data sourced from public/government records. Every item is cited to "
    "its source. Not investment advice."
)


class TimelineResponse(BaseModel):
    locality_id: str
    data_layer: str = FACTUAL
    disclaimer: str = _DISCLAIMER
    events: list[InfraEventRead] = Field(default_factory=list)
    years: list[int] = Field(default_factory=list)  # sorted distinct expected_years for the axis


class InfraEventList(BaseModel):
    data_layer: str = FACTUAL
    total: int
    limit: int
    offset: int
    items: list[InfraEventRead] = Field(default_factory=list)
