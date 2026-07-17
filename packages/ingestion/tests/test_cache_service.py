"""Unit tests for the Search -> Cache -> Verify algorithm (blueprint §3.3).

All dependencies are faked so we can assert exactly how many network/parse calls
each branch makes.
"""

from __future__ import annotations

import datetime as dt
from types import SimpleNamespace

from ingestion.cache import metrics
from ingestion.cache.change_hasher import LightweightSignal, content_hash
from ingestion.cache.raw_store_writer import RawStoreWriter
from ingestion.cache.service import CacheDecision, CacheService, RawFetch
from warehouse.enums import SourceCategory


class FakeStorage:
    def __init__(self) -> None:
        self.objs: dict[str, bytes] = {}
        self.put_calls = 0

    def exists(self, key: str) -> bool:
        return key in self.objs

    def put_object(self, key: str, data: bytes, content_type: str = "") -> str:
        self.put_calls += 1
        self.objs[key] = data
        return key

    def get_object(self, key: str) -> bytes:
        return self.objs[key]


class FakeRow:
    def __init__(self, **kw) -> None:
        self.__dict__.update(kw)


class FakeRepo:
    def __init__(self) -> None:
        self.rows: list[FakeRow] = []

    def get_latest(self, source_id: str) -> FakeRow | None:
        matches = [r for r in self.rows if r.source_id == source_id]
        return matches[-1] if matches else None

    def get_by_hash(self, source_id: str, content_hash: str) -> FakeRow | None:
        for r in self.rows:
            if r.source_id == source_id and r.content_hash == content_hash:
                return r
        return None

    def upsert(
        self,
        *,
        source_id,
        content_hash,
        raw_object_key,
        normalized_md_key=None,
        http_etag=None,
        http_last_modified=None,
    ):
        existing = self.get_by_hash(source_id, content_hash)
        if existing is not None:
            existing.last_verified_at = dt.datetime.now(dt.UTC)
            return existing, False
        row = FakeRow(
            id=f"rc-{len(self.rows)}",
            source_id=source_id,
            content_hash=content_hash,
            raw_object_key=raw_object_key,
            normalized_md_key=normalized_md_key,
            http_etag=http_etag,
            http_last_modified=http_last_modified,
            last_verified_at=dt.datetime.now(dt.UTC),
        )
        self.rows.append(row)
        return row, True

    def touch_verified(self, row: FakeRow) -> FakeRow:
        row.last_verified_at = dt.datetime.now(dt.UTC)
        return row


class FakeFetcher:
    def __init__(self, full: RawFetch, signal: LightweightSignal) -> None:
        self._full = full
        self._signal = signal
        self.full_calls = 0
        self.light_calls = 0

    def fetch_full(self, source) -> RawFetch:  # noqa: ANN001
        self.full_calls += 1
        return self._full

    def fetch_lightweight(self, source) -> LightweightSignal:  # noqa: ANN001
        self.light_calls += 1
        return self._signal


def _source(category=SourceCategory.planning, cadence="monthly"):
    return SimpleNamespace(id="src-1", category=category, refresh_cadence=cadence)


def _service(repo, storage, fetcher, **kw):
    writer = RawStoreWriter(repo, storage_module=storage)
    return CacheService(repo=repo, writer=writer, fetcher=fetcher, **kw)


def setup_function() -> None:
    metrics.reset()


def test_miss_triggers_full_fetch_and_stores():
    repo, storage = FakeRepo(), FakeStorage()
    content = b"master plan v1"
    fetcher = FakeFetcher(RawFetch(content=content, normalized_md="# plan"), LightweightSignal())
    svc = _service(repo, storage, fetcher, parse=lambda s, f, rid: {"parsed": True})

    result = svc.get_source_data(_source())

    assert result.decision == CacheDecision.miss_full_fetch
    assert fetcher.full_calls == 1 and fetcher.light_calls == 0
    assert result.structured == {"parsed": True}
    assert len(repo.rows) == 1
    assert storage.put_calls == 2  # raw + normalized md


def test_within_ttl_returns_cache_with_no_network():
    repo, storage = FakeRepo(), FakeStorage()
    repo.rows.append(
        FakeRow(
            id="rc-0",
            source_id="src-1",
            content_hash="h",
            raw_object_key="k",
            http_etag=None,
            last_verified_at=dt.datetime.now(dt.UTC),
        )
    )
    fetcher = FakeFetcher(RawFetch(content=b"x"), LightweightSignal())
    svc = _service(repo, storage, fetcher, load_structured=lambda s, rid: {"cached": True})

    result = svc.get_source_data(_source())  # planning TTL = 30 days

    assert result.decision == CacheDecision.fresh_cache_hit
    assert fetcher.full_calls == 0 and fetcher.light_calls == 0
    assert result.structured == {"cached": True}


def test_expired_but_unchanged_uses_only_lightweight_check():
    repo, storage = FakeRepo(), FakeStorage()
    cached_hash = content_hash(b"unchanged")
    stale = dt.datetime.now(dt.UTC) - dt.timedelta(days=40)
    repo.rows.append(
        FakeRow(
            id="rc-0",
            source_id="src-1",
            content_hash=cached_hash,
            raw_object_key="k",
            http_etag=None,
            last_verified_at=stale,
        )
    )
    fetcher = FakeFetcher(
        RawFetch(content=b"unchanged"), LightweightSignal(content_hash=cached_hash)
    )
    svc = _service(repo, storage, fetcher)

    result = svc.get_source_data(_source())

    assert result.decision == CacheDecision.verified_unchanged
    assert fetcher.light_calls == 1 and fetcher.full_calls == 0
    # last_verified_at was refreshed (cheap touch).
    assert repo.rows[0].last_verified_at > stale


def test_expired_and_changed_triggers_full_fetch():
    repo, storage = FakeRepo(), FakeStorage()
    stale = dt.datetime.now(dt.UTC) - dt.timedelta(days=40)
    repo.rows.append(
        FakeRow(
            id="rc-0",
            source_id="src-1",
            content_hash=content_hash(b"old"),
            raw_object_key="k",
            http_etag=None,
            last_verified_at=stale,
        )
    )
    fetcher = FakeFetcher(
        RawFetch(content=b"new content"),
        LightweightSignal(content_hash=content_hash(b"new content")),
    )
    svc = _service(repo, storage, fetcher, parse=lambda s, f, rid: {"v": 2})

    result = svc.get_source_data(_source())

    assert result.decision == CacheDecision.changed_full_fetch
    assert fetcher.light_calls == 1 and fetcher.full_calls == 1
    assert result.structured == {"v": 2}


def test_identical_content_does_not_duplicate_object_or_row():
    repo, storage = FakeRepo(), FakeStorage()
    writer = RawStoreWriter(repo, storage_module=storage)
    h = content_hash(b"same")

    first = writer.write(source_id="src-1", content=b"same", content_hash=h)
    second = writer.write(source_id="src-1", content=b"same", content_hash=h)

    assert first.created is True and second.created is False
    assert len(repo.rows) == 1
    assert storage.put_calls == 1  # object written once


def test_metrics_record_each_decision():
    repo, storage = FakeRepo(), FakeStorage()
    fetcher = FakeFetcher(RawFetch(content=b"a"), LightweightSignal())
    svc = _service(repo, storage, fetcher)
    svc.get_source_data(_source())  # miss
    assert metrics.snapshot().get("miss_full_fetch") == 1
