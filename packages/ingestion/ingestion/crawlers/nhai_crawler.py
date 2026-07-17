"""NHAI highways crawler (blueprint §3.1 row 4)."""

from __future__ import annotations

from ingestion.crawlers.base import register_crawler
from ingestion.crawlers.generic import GenericSiteCrawler, PdfDiscoveryMixin


@register_crawler("nhai")
class NhaiCrawler(PdfDiscoveryMixin, GenericSiteCrawler):
    pass
