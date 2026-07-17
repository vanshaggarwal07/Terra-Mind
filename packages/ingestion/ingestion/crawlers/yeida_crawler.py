"""YEIDA Master Plan 2041 + GIS portal crawler (blueprint §11.1).

Discovers master-plan PDFs from the configured listing page(s) and hands raw
bytes to the cache layer. Does NOT parse PDFs — that is doc-intelligence (P1.8).
"""

from __future__ import annotations

from typing import Any

from ingestion.crawlers.base import BaseCrawler, Target, register_crawler
from ingestion.crawlers.generic import PdfDiscoveryMixin


@register_crawler("yeida")
class YeidaCrawler(PdfDiscoveryMixin, BaseCrawler):
    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        urls = cfg.get("document_list_urls", []) or cfg.get("start_urls", [])
        if not urls and source.base_url:
            urls = [source.base_url]
        return [Target(url=u, kind="html") for u in urls]
