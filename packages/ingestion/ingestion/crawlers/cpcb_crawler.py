"""CPCB CAAQMS air-quality crawler (blueprint §3.1 row 10). API-based, daily."""

from __future__ import annotations

from ingestion.crawlers.base import register_crawler
from ingestion.crawlers.generic import GenericApiCrawler


@register_crawler("cpcb")
class CpcbCrawler(GenericApiCrawler):
    pass
