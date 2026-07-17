"""Doc-intelligence tests (blueprint §3.4): chunking, extraction, the review gate,
the pipeline, and the eval harness — all offline via fakes."""

from __future__ import annotations

from dataclasses import dataclass, field

from ingestion.docintel.chunker import chunk_document
from ingestion.docintel.eval_harness import default_labeled_path, evaluate, load_labeled_set
from ingestion.docintel.extractor import HeuristicExtractor
from ingestion.docintel.geocoder import StaticGeocoder
from ingestion.docintel.pipeline import DocIntelPipeline
from ingestion.docintel.router import CONFIDENCE_THRESHOLD, route
from ingestion.docintel.schema import ExtractedInfraEvent, ExtractedLocation
from warehouse.enums import ReviewReason


# --- router (the trust gate) ---------------------------------------------------
def _event(status="proposed", confidence=0.95):
    return ExtractedInfraEvent(
        project_type="metro", status=status, extraction_confidence=confidence
    )


def test_high_stakes_approved_always_reviewed_even_if_confident():
    decision = route(_event(status="approved", confidence=0.99))
    assert decision.to_review is True
    assert decision.reason == ReviewReason.high_stakes


def test_low_confidence_goes_to_review():
    decision = route(_event(status="proposed", confidence=CONFIDENCE_THRESHOLD - 0.01))
    assert decision.to_review is True
    assert decision.reason == ReviewReason.low_confidence


def test_confident_non_high_stakes_not_reviewed():
    decision = route(_event(status="proposed", confidence=0.95))
    assert decision.to_review is False


# --- chunker -------------------------------------------------------------------
def test_chunker_splits_on_sections():
    text = "## Intro\nsome text\n\n## METRO PLANS\nmetro details here\n\n2. Roads\nroad text"
    chunks = chunk_document(text)
    titles = [c.section_title for c in chunks]
    assert any("METRO" in t or "Metro" in t for t in titles)
    assert len(chunks) >= 2


# --- extractor -----------------------------------------------------------------
def test_heuristic_extractor_pulls_type_status_year_sector():
    ext = HeuristicExtractor()
    events = ext.extract("Metro line approved near Sector 22D, operational by 2027.")
    assert events and events[0].project_type == "metro"
    assert events[0].status in {"approved", "operational"}
    assert events[0].expected_completion_year == 2027


# --- geocoder ------------------------------------------------------------------
def test_geocoder_resolves_known_sector():
    geo = StaticGeocoder().geocode_sector("Sector 22D")
    assert geo is not None and 28 < geo.lat < 29


# --- pipeline (fake persister) -------------------------------------------------
@dataclass
class FakePersister:
    chunks: list = field(default_factory=list)
    events: list = field(default_factory=list)
    reviews: list = field(default_factory=list)

    def add_chunk(self, **kw) -> str:
        self.chunks.append(kw)
        return f"chunk-{len(self.chunks)}"

    def create_infra_event(self, **kw) -> str:
        self.events.append(kw)
        return f"event-{len(self.events)}"

    def enqueue_review(self, **kw) -> str:
        self.reviews.append(kw)
        return f"review-{len(self.reviews)}"


def test_pipeline_embeds_chunks_and_routes_events():
    persister = FakePersister()
    pipeline = DocIntelPipeline(persister=persister)
    text = (
        "## METRO\nThe metro extension to Sector 137 was approved for construction by 2027.\n\n"
        "## ROAD\nA new road in Sector 150 is proposed for 2030."
    )
    result = pipeline.run(content=text.encode(), content_type="text/plain", source_id="s1")

    assert result.chunks_embedded >= 2
    # The 'approved' metro is high-stakes -> review; the proposed road -> written.
    assert result.events_to_review >= 1
    assert len(persister.chunks) == result.chunks_embedded
    # every persisted chunk has an embedding vector
    assert all(c["embedding"] is not None for c in persister.chunks)


def test_pipeline_low_confidence_event_is_reviewed_not_written():
    persister = FakePersister()

    class LowConfExtractor:
        def extract(self, text, source_document=""):
            return [
                ExtractedInfraEvent(
                    project_type="mall",
                    status="proposed",
                    location=ExtractedLocation(sector="Sector 18"),
                    extraction_confidence=0.4,
                )
            ]

    pipeline = DocIntelPipeline(persister=persister, extractor=LowConfExtractor())
    result = pipeline.run(content=b"a mall somewhere", content_type="text/plain", source_id="s1")
    assert result.events_to_review == 1
    assert result.events_written == 0


# --- eval harness --------------------------------------------------------------
def test_eval_harness_reports_metrics_on_labeled_set():
    samples = load_labeled_set(default_labeled_path())
    metrics = evaluate(samples, HeuristicExtractor())
    assert metrics.true_positives > 0
    assert 0.0 <= metrics.precision <= 1.0
    assert 0.0 <= metrics.recall <= 1.0
