"""Document Intelligence pipeline orchestration (blueprint §3.4).

parse -> chunk -> extract (strict JSON) -> embed chunks -> per event:
geocode -> route (review gate) -> persist.

Every dependency is injected so the whole flow is unit-testable with fakes and
so a production layout-aware parser / real LLM can be swapped in cleanly.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from common.logging import get_logger
from ingestion.docintel.chunker import chunk_document
from ingestion.docintel.embedder import Embedder, HashingEmbedder
from ingestion.docintel.extractor import Extractor, HeuristicExtractor
from ingestion.docintel.geocoder import Geocoder, StaticGeocoder
from ingestion.docintel.parser import DefaultDocumentParser, DocumentParser
from ingestion.docintel.persist import Persister
from ingestion.docintel.router import route_for_tier
from ingestion.docintel.schema import ExtractedInfraEvent
from ingestion.observability import metrics as observability
from warehouse.enums import SourceTier

log = get_logger(__name__)


@dataclass
class DocIntelResult:
    chunks_embedded: int = 0
    events_extracted: int = 0
    events_to_review: int = 0
    events_written: int = 0
    review_ids: list[str] = field(default_factory=list)
    event_ids: list[str] = field(default_factory=list)


@dataclass
class DocIntelPipeline:
    persister: Persister
    parser: DocumentParser = field(default_factory=DefaultDocumentParser)
    extractor: Extractor = field(default_factory=HeuristicExtractor)
    embedder: Embedder = field(default_factory=HashingEmbedder)
    geocoder: Geocoder = field(default_factory=StaticGeocoder)
    source_tier: SourceTier = SourceTier.official
    max_chunk_chars: int = 4000

    def run(
        self,
        *,
        content: bytes,
        content_type: str = "",
        source_id: str | None = None,
        raw_cache_id: str | None = None,
        source_document: str = "",
    ) -> DocIntelResult:
        result = DocIntelResult()

        text = self.parser.to_text(content, content_type)
        chunks = chunk_document(text, max_chars=self.max_chunk_chars)

        # Embed + persist chunks for RAG retrieval.
        if chunks:
            vectors = self.embedder.embed([c.text for c in chunks])
            for chunk, vector in zip(chunks, vectors, strict=True):
                self.persister.add_chunk(
                    source_id=source_id,
                    raw_cache_id=raw_cache_id,
                    index=chunk.index,
                    section_title=chunk.section_title,
                    text=chunk.text,
                    embedding=vector,
                )
                result.chunks_embedded += 1

        # Extract structured events per chunk and route each through the gate.
        for chunk in chunks:
            events = self.extractor.extract(chunk.text, source_document=source_document)
            for event in events:
                result.events_extracted += 1
                observability.record_extraction_confidence(event.extraction_confidence)
                self._handle_event(event, source_id, result)

        log.info(
            "docintel_complete",
            source_id=source_id,
            chunks=result.chunks_embedded,
            extracted=result.events_extracted,
            to_review=result.events_to_review,
            written=result.events_written,
        )
        return result

    def _handle_event(
        self, event: ExtractedInfraEvent, source_id: str | None, result: DocIntelResult
    ) -> None:
        decision = route_for_tier(event, self.source_tier)
        if decision.to_review:
            assert decision.reason is not None  # to_review always carries a reason
            rid = self.persister.enqueue_review(
                event=event, reason=decision.reason, source_id=source_id
            )
            result.events_to_review += 1
            result.review_ids.append(rid)
            return
        geo = self.geocoder.geocode_sector(event.location.sector)
        eid = self.persister.create_infra_event(
            event=event,
            geo=geo,
            source_id=source_id,
            source_tier=self.source_tier,
            verified=False,  # even confident extractions stay unverified until confirmed
        )
        result.events_written += 1
        result.event_ids.append(eid)
