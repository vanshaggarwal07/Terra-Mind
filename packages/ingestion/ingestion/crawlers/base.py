"""Crawler abstraction + registry (blueprint §3.2).

A crawler's ONLY job: discover targets, fetch raw bytes (through the resilient
HTTP client), and hand off to the cache layer. It does not parse or interpret.

Crawlers register themselves via ``@register_crawler("key")`` so the source
registry's ``crawler_key`` resolves to a class with zero orchestrator changes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from common.http import HttpClient
from common.logging import get_logger
from ingestion.cache.change_hasher import LightweightSignal, content_hash
from ingestion.cache.service import RawFetch

log = get_logger(__name__)


@dataclass
class Target:
    """One fetchable unit for a source (a page, a PDF, an API endpoint)."""

    url: str
    kind: str = "html"  # html | pdf | api | rss
    meta: dict[str, Any] = field(default_factory=dict)


_REGISTRY: dict[str, type[BaseCrawler]] = {}


def register_crawler(key: str):  # noqa: ANN201
    def deco(cls: type[BaseCrawler]) -> type[BaseCrawler]:
        cls.crawler_key = key
        _REGISTRY[key] = cls
        return cls

    return deco


def get_crawler(key: str, **kwargs: Any) -> BaseCrawler:
    if key not in _REGISTRY:
        raise KeyError(f"no crawler registered for key: {key!r}")
    return _REGISTRY[key](**kwargs)


def crawler_keys() -> list[str]:
    return sorted(_REGISTRY)


def is_registered(key: str) -> bool:
    return key in _REGISTRY


_EXT_BY_KIND = {"html": "html", "pdf": "pdf", "api": "json", "rss": "xml"}


class BaseCrawler(ABC):
    crawler_key: ClassVar[str] = ""

    def __init__(self, http: HttpClient | None = None) -> None:
        self.http = http or HttpClient()

    # -- required per-source discovery ---------------------------------------
    @abstractmethod
    def fetch_targets(self, source: Any) -> list[Target]:
        """Discover the fetchable targets for this source (from source.config)."""

    # -- fetching (overridable) ----------------------------------------------
    def fetch_raw(self, target: Target) -> tuple[bytes, str, str | None, str | None]:
        """GET a single target. Returns (content, content_type, etag, last_modified)."""
        resp = self.http.get(target.url)
        resp.raise_for_status()
        return (
            resp.content,
            resp.headers.get("content-type", "application/octet-stream"),
            resp.headers.get("etag"),
            resp.headers.get("last-modified"),
        )

    def normalize(self, target: Target, content: bytes, content_type: str) -> str | None:
        """Produce a normalized markdown/text version for the .md cache tier.

        HTML/RSS -> visible text; PDF/binary -> None (parsed later in doc-intel)."""
        if target.kind in ("html", "rss") or "html" in content_type or "xml" in content_type:
            try:
                from bs4 import BeautifulSoup

                soup = BeautifulSoup(content, "lxml")
                return soup.get_text("\n", strip=True)
            except Exception:  # noqa: BLE001
                return content.decode("utf-8", errors="ignore")
        if target.kind == "api" or "json" in content_type:
            return content.decode("utf-8", errors="ignore")
        return None

    def expand_targets(self, targets: list[Target]) -> list[Target]:
        """Hook to discover extra targets (e.g. PDF links on a listing page).

        Runs only on the expensive full-fetch path, never on the cheap
        lightweight probe. Default: no expansion."""
        return targets

    # -- Fetcher protocol (consumed by CacheService) -------------------------
    def fetch_full(self, source: Any) -> RawFetch:
        """Fetch all allowed targets and aggregate into one source-level payload.

        A change in any target changes the aggregate hash and triggers a
        re-parse of the source (blueprint §3.3)."""
        targets = self.expand_targets(self.fetch_targets(source))
        chunks: list[bytes] = []
        md_parts: list[str] = []
        first_etag: str | None = None
        first_lm: str | None = None
        primary_kind = "html"

        for i, target in enumerate(targets):
            if not self.http.is_allowed(target.url):
                log.warning("target_blocked_by_robots", url=target.url)
                continue
            try:
                content, ctype, etag, lm = self.fetch_raw(target)
            except Exception as exc:  # noqa: BLE001 - isolate a single bad target
                log.warning("target_fetch_failed", url=target.url, error=str(exc))
                continue
            chunks.append(content)
            if i == 0:
                first_etag, first_lm, primary_kind = etag, lm, target.kind
            md = self.normalize(target, content, ctype)
            if md:
                md_parts.append(f"## {target.url}\n\n{md}")

        aggregate = b"\n--DOC--\n".join(chunks)
        return RawFetch(
            content=aggregate,
            content_type="application/octet-stream",
            extension=_EXT_BY_KIND.get(primary_kind, "bin"),
            normalized_md="\n\n".join(md_parts) if md_parts else None,
            http_etag=first_etag,
            http_last_modified=first_lm,
        )

    def fetch_lightweight(self, source: Any) -> LightweightSignal:
        """Cheap freshness probe: HEAD the first target for validators.

        Override for sources with a better cheap signal (RSS timestamp, a
        'last updated' marker, etc.)."""
        targets = self.fetch_targets(source)
        if not targets:
            return LightweightSignal()
        target = targets[0]
        try:
            resp = self.http.head(target.url)
            return LightweightSignal(
                http_etag=resp.headers.get("etag"),
                http_last_modified=resp.headers.get("last-modified"),
            )
        except Exception:  # noqa: BLE001
            return LightweightSignal()

    # -- helpers -------------------------------------------------------------
    def _config(self, source: Any) -> dict[str, Any]:
        return getattr(source, "config", None) or {}

    @staticmethod
    def hash_bytes(content: bytes) -> str:
        return content_hash(content)
