"""Reusable crawler building blocks.

Most gov sources are either a set of HTML pages or a JSON API. These two
generics cover both; specific crawlers subclass them and add discovery or
source-specific config handling.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import urljoin

from common.logging import get_logger
from ingestion.crawlers.base import BaseCrawler, Target

log = get_logger(__name__)


class GenericSiteCrawler(BaseCrawler):
    """Fetches a list of HTML pages from ``config.start_urls``."""

    config_key = "start_urls"

    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        urls = cfg.get(self.config_key, [])
        if not urls and source.base_url:
            urls = [source.base_url]
        return [Target(url=u, kind="html") for u in urls]


class GenericApiCrawler(BaseCrawler):
    """Fetches a JSON API endpoint from ``config.api_url`` (with optional params)."""

    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        api_url = cfg.get("api_url") or source.base_url
        if not api_url:
            return []
        return [Target(url=api_url, kind="api", meta={"params": cfg.get("params", {})})]

    def fetch_raw(self, target: Target):  # noqa: ANN201
        params = target.meta.get("params") or None
        resp = self.http.get(target.url, params=params)
        resp.raise_for_status()
        return (
            resp.content,
            resp.headers.get("content-type", "application/json"),
            resp.headers.get("etag"),
            resp.headers.get("last-modified"),
        )


class PdfDiscoveryMixin:
    """Discovers PDF links on HTML listing pages (for master-plan style sources)."""

    def expand_targets(self: Any, targets: list[Target]) -> list[Target]:
        expanded: list[Target] = list(targets)
        for target in targets:
            if target.kind != "html":
                continue
            try:
                content, ctype, *_ = self.fetch_raw(target)
            except Exception as exc:  # noqa: BLE001
                log.warning("pdf_discovery_failed", url=target.url, error=str(exc))
                continue
            expanded.extend(self._find_pdf_links(target.url, content))
        return expanded

    @staticmethod
    def _find_pdf_links(base_url: str, content: bytes) -> list[Target]:
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(content, "lxml")
        except Exception:  # noqa: BLE001
            return []
        out: list[Target] = []
        for a in soup.find_all("a", href=True):
            href = a.get("href")
            if not isinstance(href, str):
                continue
            if href.lower().split("?")[0].endswith(".pdf"):
                out.append(
                    Target(
                        url=urljoin(base_url, href),
                        kind="pdf",
                        meta={"title": a.get_text(strip=True)},
                    )
                )
        return out
