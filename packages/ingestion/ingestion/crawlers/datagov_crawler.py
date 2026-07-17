"""data.gov.in open-data crawler (blueprint §3.1 row 8). API-based, weekly."""

from __future__ import annotations

from typing import Any

from ingestion.crawlers.base import Target, register_crawler
from ingestion.crawlers.generic import GenericApiCrawler


@register_crawler("datagov")
class DataGovCrawler(GenericApiCrawler):
    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        api_url = cfg.get("api_url") or source.base_url
        if not api_url:
            return []
        resource_ids = cfg.get("resource_ids") or []
        if not resource_ids:
            return [Target(url=api_url, kind="api", meta={"params": cfg.get("params", {})})]
        return [
            Target(url=f"{api_url}/{rid}", kind="api", meta={"params": cfg.get("params", {})})
            for rid in resource_ids
        ]
