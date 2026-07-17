"""NCRTC (RRTS) crawler (blueprint §3.1 row 5)."""

from __future__ import annotations

from ingestion.crawlers.base import register_crawler
from ingestion.crawlers.generic import GenericSiteCrawler, PdfDiscoveryMixin


@register_crawler("ncrtc")
class NcrtcCrawler(PdfDiscoveryMixin, GenericSiteCrawler):
    pass
