"""News/social tier tests (blueprint §3.6): corroboration-only, never auto-published."""

from __future__ import annotations

from dataclasses import dataclass, field

from ingestion.docintel.pipeline import DocIntelPipeline
from ingestion.docintel.router import route_for_tier
from ingestion.docintel.schema import ExtractedInfraEvent
from ingestion.news.extractor import NEWS_CONFIDENCE_CEILING, NewsSignalExtractor
from warehouse.enums import ReviewReason, SourceTier


def test_news_confidence_is_capped():
    ext = NewsSignalExtractor()
    events = ext.extract("Metro line approved near Sector 22D, operational by 2027.")
    assert events
    assert all(e.extraction_confidence <= NEWS_CONFIDENCE_CEILING for e in events)


def test_news_tier_always_routes_to_review_even_when_confident():
    ev = ExtractedInfraEvent(project_type="metro", status="proposed", extraction_confidence=0.99)
    decision = route_for_tier(ev, SourceTier.news)
    assert decision.to_review is True
    assert decision.reason == ReviewReason.unverifiable_source


def test_official_tier_confident_event_not_reviewed():
    ev = ExtractedInfraEvent(project_type="metro", status="proposed", extraction_confidence=0.99)
    assert route_for_tier(ev, SourceTier.official).to_review is False


@dataclass
class FakePersister:
    chunks: list = field(default_factory=list)
    events: list = field(default_factory=list)
    reviews: list = field(default_factory=list)

    def add_chunk(self, **kw) -> str:
        self.chunks.append(kw)
        return "c"

    def create_infra_event(self, **kw) -> str:
        self.events.append(kw)
        return "e"

    def enqueue_review(self, **kw) -> str:
        self.reviews.append(kw)
        return "r"


def test_news_pipeline_writes_nothing_directly_all_to_review():
    persister = FakePersister()
    pipeline = DocIntelPipeline(
        persister=persister,
        extractor=NewsSignalExtractor(),
        source_tier=SourceTier.news,
    )
    result = pipeline.run(
        content=b"A new metro line was approved near Sector 18, operational by 2027.",
        content_type="text/plain",
        source_id="news-1",
    )
    assert result.events_written == 0
    assert result.events_to_review >= 1
    assert persister.reviews[0]["reason"] == ReviewReason.unverifiable_source
