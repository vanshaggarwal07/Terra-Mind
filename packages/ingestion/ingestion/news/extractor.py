"""News/social signal extractor (blueprint §3.6).

Wraps a base extractor and caps confidence to the news ceiling — these are
corroboration signals, not authoritative facts. Combined with tier-aware routing
(``route_for_tier``), every news/social extraction lands in the review queue.
"""

from __future__ import annotations

from ingestion.docintel.extractor import Extractor, HeuristicExtractor
from ingestion.docintel.schema import ExtractedInfraEvent

# News can corroborate but never confirm; hard-cap its confidence (§3.6).
NEWS_CONFIDENCE_CEILING = 0.5


class NewsSignalExtractor:
    def __init__(
        self, base: Extractor | None = None, *, ceiling: float = NEWS_CONFIDENCE_CEILING
    ) -> None:
        self._base = base or HeuristicExtractor()
        self._ceiling = ceiling

    def extract(self, text: str, source_document: str = "") -> list[ExtractedInfraEvent]:
        events = self._base.extract(text, source_document=source_document)
        for ev in events:
            ev.extraction_confidence = min(ev.extraction_confidence, self._ceiling)
        return events
