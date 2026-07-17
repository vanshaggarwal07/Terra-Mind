"""Source-isolated crawler fleet (blueprint §3.2).

One crawler per source, resolved from the registry by ``crawler_key``. Crawlers
ONLY fetch raw content + hand off to the cache layer — no parsing/interpretation.

Importing this package registers every built-in crawler.
"""

# Import crawler modules for their registration side effects.
from ingestion.crawlers import (  # noqa: E402,F401
    cpcb_crawler,
    datagov_crawler,
    dmrc_crawler,
    misc_crawlers,
    ncrtc_crawler,
    news_crawler,
    nhai_crawler,
    rera_crawler,
    tender_crawler,
    yeida_crawler,
)
from ingestion.crawlers.base import (
    BaseCrawler,
    Target,
    crawler_keys,
    get_crawler,
    register_crawler,
)

__all__ = [
    "BaseCrawler",
    "Target",
    "register_crawler",
    "get_crawler",
    "crawler_keys",
]
