"""CPPP / GeM tender crawler (blueprint §3.1 row 7). API-based, daily."""

from __future__ import annotations

from ingestion.crawlers.base import register_crawler
from ingestion.crawlers.generic import GenericApiCrawler


@register_crawler("tender")
class TenderCrawler(GenericApiCrawler):
    pass
