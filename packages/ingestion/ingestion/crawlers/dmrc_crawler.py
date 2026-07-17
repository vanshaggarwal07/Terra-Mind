"""DMRC / NMRC metro crawler (blueprint §11.1).

Fetches metro project pages + tender listings. Covers NMRC via extra config
URLs. Also discovers linked PDFs (DPRs, tender docs)."""

from __future__ import annotations

from typing import Any

from ingestion.crawlers.base import BaseCrawler, Target, register_crawler
from ingestion.crawlers.generic import PdfDiscoveryMixin


@register_crawler("dmrc")
class DmrcCrawler(PdfDiscoveryMixin, BaseCrawler):
    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        urls: list[str] = list(cfg.get("start_urls", []))
        urls += list(cfg.get("tender_urls", []))
        if not urls and source.base_url:
            urls = [source.base_url]
        return [Target(url=u, kind="html") for u in urls]
