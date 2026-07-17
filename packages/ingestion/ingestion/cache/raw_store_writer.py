"""Writes raw + normalized content to object storage and upserts the index.

Keyed by ``{source_id}/{content_hash}`` so identical content collapses to one
object automatically (blueprint §3.3).
"""

from __future__ import annotations

from dataclasses import dataclass

from common import storage
from warehouse.models import RawCache
from warehouse.repositories import RawCacheRepo


@dataclass
class StoredRaw:
    raw_cache: RawCache
    created: bool
    raw_object_key: str
    normalized_md_key: str | None


class RawStoreWriter:
    def __init__(self, repo: RawCacheRepo, *, storage_module=storage) -> None:
        self.repo = repo
        self.storage = storage_module

    def write(
        self,
        *,
        source_id: str,
        content: bytes,
        content_hash: str,
        content_type: str = "application/octet-stream",
        normalized_md: str | None = None,
        extension: str = "bin",
        http_etag: str | None = None,
        http_last_modified: str | None = None,
    ) -> StoredRaw:
        raw_key = f"{source_id}/{content_hash}.{extension}"
        if not self.storage.exists(raw_key):
            self.storage.put_object(raw_key, content, content_type=content_type)

        md_key: str | None = None
        if normalized_md is not None:
            md_key = f"{source_id}/{content_hash}.md"
            if not self.storage.exists(md_key):
                self.storage.put_object(
                    md_key, normalized_md.encode("utf-8"), content_type="text/markdown"
                )

        row, created = self.repo.upsert(
            source_id=source_id,
            content_hash=content_hash,
            raw_object_key=raw_key,
            normalized_md_key=md_key,
            http_etag=http_etag,
            http_last_modified=http_last_modified,
        )
        return StoredRaw(
            raw_cache=row, created=created, raw_object_key=raw_key, normalized_md_key=md_key
        )
