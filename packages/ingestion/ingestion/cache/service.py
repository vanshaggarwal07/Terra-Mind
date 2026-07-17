"""The verify-before-refetch cache service (blueprint §3.3).

Implements exactly the algorithm from the blueprint:

    no cache            -> full fetch + parse
    within TTL          -> return cached structured data (NO network)
    TTL expired         -> cheap lightweight signal
        unchanged       -> touch last_verified_at, return cached (NO full fetch)
        changed         -> full fetch + parse (the only expensive path)

Dependencies are injected (Protocols) so the algorithm is unit-testable without
network, storage, or a database.
"""

from __future__ import annotations

import datetime as dt
import enum
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Protocol

from common.logging import get_logger
from ingestion.cache import metrics
from ingestion.cache.change_hasher import LightweightSignal, content_hash, signal_matches
from ingestion.cache.raw_store_writer import RawStoreWriter
from ingestion.cache.ttl import ttl_for_category
from warehouse.enums import SourceCategory
from warehouse.repositories import RawCacheRepo

log = get_logger(__name__)


@dataclass
class RawFetch:
    """The result of an expensive full fetch."""

    content: bytes
    content_type: str = "application/octet-stream"
    extension: str = "bin"
    normalized_md: str | None = None
    http_etag: str | None = None
    http_last_modified: str | None = None

    @property
    def hash(self) -> str:
        return content_hash(self.content)


class SourceLike(Protocol):
    id: str
    category: SourceCategory
    refresh_cadence: str | None


class Fetcher(Protocol):
    """What a crawler provides to the cache service."""

    def fetch_full(self, source: SourceLike) -> RawFetch: ...

    def fetch_lightweight(self, source: SourceLike) -> LightweightSignal: ...


class CacheDecision(enum.StrEnum):
    miss_full_fetch = "miss_full_fetch"
    fresh_cache_hit = "fresh_cache_hit"
    verified_unchanged = "verified_unchanged"
    changed_full_fetch = "changed_full_fetch"


@dataclass
class CacheResult:
    decision: CacheDecision
    raw_cache_id: str | None
    content_hash: str | None
    structured: Any = None
    from_network: bool = False


# Parse turns a fresh raw fetch into structured data (expensive: e.g. LLM).
ParseFn = Callable[[SourceLike, RawFetch, str], Any]
# Load returns previously-parsed structured data for a cache hit (cheap).
LoadFn = Callable[[SourceLike, str], Any]


@dataclass
class CacheService:
    repo: RawCacheRepo
    writer: RawStoreWriter
    fetcher: Fetcher
    parse: ParseFn | None = None
    load_structured: LoadFn | None = None
    now: Callable[[], dt.datetime] = field(default=lambda: dt.datetime.now(dt.UTC))

    def get_source_data(self, source: SourceLike) -> CacheResult:
        cached = self.repo.get_latest(source.id)

        if cached is None:
            return self._full_fetch_and_parse(source, CacheDecision.miss_full_fetch)

        ttl = ttl_for_category(source.category, source.refresh_cadence)
        age = self.now() - _aware(cached.last_verified_at)
        if age < ttl:
            metrics.record_decision(CacheDecision.fresh_cache_hit, source.id)
            log.info("cache_fresh_hit", source_id=source.id, age_s=age.total_seconds())
            return CacheResult(
                decision=CacheDecision.fresh_cache_hit,
                raw_cache_id=cached.id,
                content_hash=cached.content_hash,
                structured=self._load(source, cached.id),
                from_network=False,
            )

        # TTL expired -> cheap check before an expensive re-fetch.
        signal = self.fetcher.fetch_lightweight(source)
        if signal_matches(signal, cached.content_hash, cached.http_etag):
            self.repo.touch_verified(cached)
            metrics.record_decision(CacheDecision.verified_unchanged, source.id)
            log.info("cache_verified_unchanged", source_id=source.id)
            return CacheResult(
                decision=CacheDecision.verified_unchanged,
                raw_cache_id=cached.id,
                content_hash=cached.content_hash,
                structured=self._load(source, cached.id),
                from_network=True,  # only the cheap probe hit the network
            )

        return self._full_fetch_and_parse(source, CacheDecision.changed_full_fetch)

    # -- internals -----------------------------------------------------------
    def _full_fetch_and_parse(self, source: SourceLike, decision: CacheDecision) -> CacheResult:
        fetch = self.fetcher.fetch_full(source)
        stored = self.writer.write(
            source_id=source.id,
            content=fetch.content,
            content_hash=fetch.hash,
            content_type=fetch.content_type,
            normalized_md=fetch.normalized_md,
            extension=fetch.extension,
            http_etag=fetch.http_etag,
            http_last_modified=fetch.http_last_modified,
        )
        structured = None
        if self.parse is not None:
            structured = self.parse(source, fetch, stored.raw_cache.id)
        metrics.record_decision(decision, source.id)
        log.info("cache_full_fetch", source_id=source.id, decision=decision, new=stored.created)
        return CacheResult(
            decision=decision,
            raw_cache_id=stored.raw_cache.id,
            content_hash=fetch.hash,
            structured=structured,
            from_network=True,
        )

    def _load(self, source: SourceLike, raw_cache_id: str) -> Any:
        if self.load_structured is None:
            return None
        return self.load_structured(source, raw_cache_id)


def _aware(value: dt.datetime) -> dt.datetime:
    """Treat naive timestamps as UTC so arithmetic never crashes."""
    if value.tzinfo is None:
        return value.replace(tzinfo=dt.UTC)
    return value
