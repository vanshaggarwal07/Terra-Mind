"""Wires the doc-intel pipeline into the cache service as a ``parse`` callback.

On a full-fetch/changed path the cache service calls this to turn raw bytes into
structured, embedded, routed facts.
"""

from __future__ import annotations

from typing import Any

from ingestion.docintel.embedder import Embedder, HashingEmbedder
from ingestion.docintel.extractor import Extractor, HeuristicExtractor
from ingestion.docintel.persist import DBPersister
from ingestion.docintel.pipeline import DocIntelPipeline, DocIntelResult
from warehouse.enums import SourceCategory, SourceTier


def tier_for_category(category: SourceCategory) -> SourceTier:
    if category == SourceCategory.news:
        return SourceTier.news
    if category == SourceCategory.social:
        return SourceTier.social
    return SourceTier.official


def _default_extractor_for_tier(tier: SourceTier) -> Extractor:
    if tier in (SourceTier.news, SourceTier.social):
        from ingestion.news.extractor import NewsSignalExtractor

        return NewsSignalExtractor()
    return HeuristicExtractor()


def make_parse_fn(
    session: Any,
    *,
    extractor: Extractor | None = None,
    embedder: Embedder | None = None,
):
    """Return a ParseFn(source, RawFetch, raw_cache_id) -> DocIntelResult."""
    persister = DBPersister(session)

    def parse(source: Any, fetch: Any, raw_cache_id: str) -> DocIntelResult:
        tier = tier_for_category(source.category)
        chosen = extractor or _default_extractor_for_tier(tier)
        pipeline = DocIntelPipeline(
            persister=persister,
            extractor=chosen,
            embedder=embedder or HashingEmbedder(),
            source_tier=tier,
        )
        return pipeline.run(
            content=fetch.content,
            content_type=fetch.content_type,
            source_id=source.id,
            raw_cache_id=raw_cache_id,
            source_document=source.base_url or "",
        )

    return parse
