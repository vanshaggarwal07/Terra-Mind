"""Document Intelligence pipeline (blueprint §3.4): PDF/DPR -> structured JSON.

Flow: layout-aware parse -> TOC-aware chunking -> strict-JSON LLM extraction
(with confidence) -> geocode -> embed -> route (review queue vs warehouse).

The LLM extracts under a strict schema and must ground every field in the
provided text. It never invents domain numbers like prices (blueprint §5/§6).
"""

from ingestion.docintel.router import CONFIDENCE_THRESHOLD, RouteDecision, route
from ingestion.docintel.schema import ExtractedInfraEvent, ExtractionResult

__all__ = [
    "ExtractedInfraEvent",
    "ExtractionResult",
    "route",
    "RouteDecision",
    "CONFIDENCE_THRESHOLD",
]
