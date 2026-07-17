"""LLM extraction under a strict JSON schema (blueprint §3.4.3).

``LLMExtractor`` calls a vendor-agnostic LLM constrained to the schema and
grounds every field in the provided chunk text. ``HeuristicExtractor`` is a
deterministic, offline fallback used for tests and as a cheap first pass.
"""

from __future__ import annotations

import re
from typing import Protocol, cast

from common.logging import get_logger
from ingestion.docintel.schema import (
    ExtractedInfraEvent,
    ExtractedLocation,
    ExtractionResult,
    ProjectType,
    Status,
)

log = get_logger(__name__)

_SYSTEM_PROMPT = (
    "You are a precise information-extraction system for Indian urban-planning "
    "and infrastructure documents. Extract ONLY facts explicitly stated in the "
    "provided text. Never infer or invent values (especially numbers). If a "
    "field is not present, use null. Return a JSON object with an 'events' array "
    "matching the given schema. Set extraction_confidence honestly (0-1)."
)

_SCHEMA_HINT = """
Return JSON: {"events": [{
  "project_type": "metro|road|airport|mall|school|hospital|industrial|rrts|other",
  "location": {"sector": "", "lat": null, "lng": null},
  "status": "proposed|approved|under_construction|operational",
  "expected_completion_year": null,
  "budget_inr_cr": null,
  "source_document": "",
  "extraction_confidence": 0.0
}]}
"""


class Extractor(Protocol):
    def extract(self, text: str, source_document: str = "") -> list[ExtractedInfraEvent]: ...


class LLMExtractor:
    def __init__(self, client=None) -> None:  # noqa: ANN001
        self._client = client

    def _get_client(self):  # noqa: ANN202
        if self._client is None:
            from common.llm import LLMClient

            self._client = LLMClient()
        return self._client

    def extract(self, text: str, source_document: str = "") -> list[ExtractedInfraEvent]:
        user = f"{_SCHEMA_HINT}\n\nDOCUMENT TEXT:\n{text}"
        try:
            data = self._get_client().complete_json(_SYSTEM_PROMPT, user)
            result = ExtractionResult.model_validate(data)
        except Exception as exc:  # noqa: BLE001 - malformed output is rejected, not persisted
            log.warning("llm_extraction_failed", error=str(exc))
            return []
        for ev in result.events:
            if not ev.source_document:
                ev.source_document = source_document
        return result.events


class HeuristicExtractor:
    """Deterministic keyword/regex extraction. Offline; good for tests + eval baseline."""

    _TYPE_KEYWORDS = {
        "metro": "metro",
        "rrts": "rrts",
        "rapid rail": "rrts",
        "airport": "airport",
        "expressway": "road",
        "highway": "road",
        "road": "road",
        "mall": "mall",
        "school": "school",
        "hospital": "hospital",
        "industrial": "industrial",
    }
    _STATUS_KEYWORDS = {
        "operational": "operational",
        "under construction": "under_construction",
        "approved": "approved",
        "sanctioned": "approved",
        "proposed": "proposed",
        "planned": "proposed",
    }

    def extract(self, text: str, source_document: str = "") -> list[ExtractedInfraEvent]:
        low = text.lower()
        ptype = next((v for k, v in self._TYPE_KEYWORDS.items() if k in low), None)
        if ptype is None:
            return []
        status = next((v for k, v in self._STATUS_KEYWORDS.items() if k in low), "proposed")
        year = self._find_year(text)
        sector = self._find_sector(text)
        budget = self._find_budget(low)
        confidence = 0.9 if (year and sector) else 0.6
        return [
            ExtractedInfraEvent(
                project_type=cast(ProjectType, ptype),
                location=ExtractedLocation(sector=sector),
                status=cast(Status, status),
                expected_completion_year=year,
                budget_inr_cr=budget,
                source_document=source_document,
                extraction_confidence=confidence,
            )
        ]

    @staticmethod
    def _find_year(text: str) -> int | None:
        m = re.search(r"\b(20[2-5]\d)\b", text)
        return int(m.group(1)) if m else None

    @staticmethod
    def _find_sector(text: str) -> str:
        m = re.search(r"[Ss]ector\s+([0-9]+[A-Za-z]?)", text)
        return f"Sector {m.group(1)}" if m else ""

    @staticmethod
    def _find_budget(low: str) -> float | None:
        m = re.search(r"(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)\s*cr", low)
        if not m:
            return None
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            return None
