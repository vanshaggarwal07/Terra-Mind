"""Repository for the ``raw_cache`` index table (blueprint §3.3)."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.models import RawCache


class RawCacheRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_latest(self, source_id: str) -> RawCache | None:
        stmt = (
            select(RawCache)
            .where(RawCache.source_id == source_id)
            .order_by(RawCache.fetched_at.desc())
            .limit(1)
        )
        return self.session.scalar(stmt)

    def get_by_hash(self, source_id: str, content_hash: str) -> RawCache | None:
        stmt = select(RawCache).where(
            RawCache.source_id == source_id, RawCache.content_hash == content_hash
        )
        return self.session.scalar(stmt)

    def upsert(
        self,
        *,
        source_id: str,
        content_hash: str,
        raw_object_key: str,
        normalized_md_key: str | None = None,
        http_etag: str | None = None,
        http_last_modified: str | None = None,
    ) -> tuple[RawCache, bool]:
        """Insert or return existing row for (source_id, content_hash).

        Identical content collapses to one row. Returns (row, created)."""
        existing = self.get_by_hash(source_id, content_hash)
        if existing is not None:
            existing.last_verified_at = dt.datetime.now(dt.UTC)
            self.session.flush()
            return existing, False
        row = RawCache(
            source_id=source_id,
            content_hash=content_hash,
            raw_object_key=raw_object_key,
            normalized_md_key=normalized_md_key,
            http_etag=http_etag,
            http_last_modified=http_last_modified,
        )
        self.session.add(row)
        self.session.flush()
        return row, True

    def touch_verified(self, row: RawCache) -> RawCache:
        """Confirmed-unchanged: cheap update of last_verified_at (blueprint §3.3)."""
        row.last_verified_at = dt.datetime.now(dt.UTC)
        self.session.flush()
        return row
