"""News RSS crawler (blueprint §3.1 row 15, §3.6). Daily, lowest-confidence tier.

One reusable crawler configured per-feed via ``config.feeds``. NLP entity/event
extraction happens downstream (P1.10) — this crawler only fetches feeds.
"""

from __future__ import annotations

from typing import Any

from ingestion.cache.change_hasher import LightweightSignal, content_hash
from ingestion.crawlers.base import BaseCrawler, Target, register_crawler


@register_crawler("news")
class NewsCrawler(BaseCrawler):
    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        feeds = cfg.get("feeds", [])
        return [Target(url=u, kind="rss") for u in feeds]

    def normalize(self, target: Target, content: bytes, content_type: str) -> str | None:
        try:
            import feedparser

            parsed = feedparser.parse(content)
            parts = []
            for entry in parsed.entries:
                title = entry.get("title", "")
                summary = entry.get("summary", "")
                link = entry.get("link", "")
                published = entry.get("published", "")
                parts.append(f"### {title}\n{published}\n{summary}\n{link}")
            return "\n\n".join(parts) if parts else None
        except Exception:  # noqa: BLE001
            return content.decode("utf-8", errors="ignore")

    def fetch_lightweight(self, source: Any) -> LightweightSignal:
        """Cheap signal: hash the latest entry ids/timestamps of the first feed."""
        targets = self.fetch_targets(source)
        if not targets:
            return LightweightSignal()
        try:
            content, *_ = self.fetch_raw(targets[0])
            import feedparser

            parsed = feedparser.parse(content)
            marker = "|".join(
                e.get("id", e.get("link", "")) + e.get("published", "") for e in parsed.entries[:20]
            )
            return LightweightSignal(content_hash=content_hash(marker))
        except Exception:  # noqa: BLE001
            return LightweightSignal()
