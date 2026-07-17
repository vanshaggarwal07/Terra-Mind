"""UP-RERA crawler (blueprint §11.1, §0 — highest legal-risk source).

Fetches official project/builder registration records VERBATIM, preserving the
source URL on every record. It ONLY fetches — it produces no scores, rankings,
or judgments of any kind (facts, not verdicts).
"""

from __future__ import annotations

from typing import Any

from ingestion.crawlers.base import BaseCrawler, Target, register_crawler
from ingestion.crawlers.generic import PdfDiscoveryMixin


@register_crawler("rera")
class ReraCrawler(PdfDiscoveryMixin, BaseCrawler):
    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        urls: list[str] = []
        if cfg.get("search_url"):
            urls.append(cfg["search_url"])
        urls += list(cfg.get("start_urls", []))
        if not urls and source.base_url:
            urls = [source.base_url]
        return [Target(url=u, kind="html", meta={"citation": u}) for u in urls]

    # No scoring / judgment methods exist here by design (§0, §13 defamation).
