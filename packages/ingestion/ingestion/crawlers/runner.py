"""Executes one source through its crawler + the cache/verify service.

This is the single entrypoint a Dagster op (or a manual run) calls. Keeping the
wiring here means the orchestrator stays thin and this is unit-testable.
"""

from __future__ import annotations

from typing import Any

from common.http import HttpClient
from common.logging import get_logger
from ingestion.cache.raw_store_writer import RawStoreWriter
from ingestion.cache.service import CacheResult, CacheService, LoadFn, ParseFn
from ingestion.crawlers.base import get_crawler
from ingestion.observability import metrics as observability
from warehouse.repositories import RawCacheRepo

log = get_logger(__name__)


def run_source(
    source: Any,
    session: Any,
    *,
    parse: ParseFn | None = None,
    load_structured: LoadFn | None = None,
    http: HttpClient | None = None,
) -> CacheResult:
    """Run ingestion for one source. ``session`` is a live DB session."""
    if not source.crawler_key:
        raise ValueError(f"source {source.id} has no crawler_key")
    crawler = get_crawler(source.crawler_key, http=http)
    repo = RawCacheRepo(session)
    writer = RawStoreWriter(repo)
    service = CacheService(
        repo=repo,
        writer=writer,
        fetcher=crawler,
        parse=parse,
        load_structured=load_structured,
    )
    try:
        result = service.get_source_data(source)
    except Exception:
        observability.record_crawl(source.id, ok=False)
        log.warning("source_run_failed", source_id=source.id)
        raise
    observability.record_crawl(source.id, ok=True)
    log.info("source_run_complete", source_id=source.id, decision=result.decision)
    return result
