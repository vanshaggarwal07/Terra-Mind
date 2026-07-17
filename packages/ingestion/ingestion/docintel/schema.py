"""Strict extraction schema (blueprint §3.4.3).

The LLM MUST return JSON matching this schema — no free text. Malformed output
is rejected/repaired by the extractor before anything is persisted.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from warehouse.enums import InfraEventStatus, InfraEventType

ProjectType = Literal[
    "metro", "road", "airport", "mall", "school", "hospital", "industrial", "rrts", "other"
]
Status = Literal["proposed", "approved", "under_construction", "operational"]


class ExtractedLocation(BaseModel):
    sector: str = ""
    lat: float | None = None
    lng: float | None = None


class ExtractedInfraEvent(BaseModel):
    """One infra project extracted from a document chunk."""

    project_type: ProjectType
    location: ExtractedLocation = Field(default_factory=ExtractedLocation)
    status: Status
    expected_completion_year: int | None = None
    budget_inr_cr: float | None = None
    source_document: str = ""
    extraction_confidence: float = 0.0

    @field_validator("extraction_confidence")
    @classmethod
    def _clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, v))

    def to_infra_type(self) -> InfraEventType:
        try:
            return InfraEventType(self.project_type)
        except ValueError:
            return InfraEventType.other

    def to_status(self) -> InfraEventStatus:
        return InfraEventStatus(self.status)


class ExtractionResult(BaseModel):
    events: list[ExtractedInfraEvent] = Field(default_factory=list)
