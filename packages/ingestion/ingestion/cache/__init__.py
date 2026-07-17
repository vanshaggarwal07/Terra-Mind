"""Search -> Cache -> Verify layer (blueprint §3.3).

Freshness-aware caching: never redundant full re-scrapes, data never staler than
its TTL, and the expensive parse/LLM step runs only when content actually
changed. Reused by every crawler.
"""

from ingestion.cache.service import (
    CacheDecision,
    CacheResult,
    CacheService,
    LightweightSignal,
    RawFetch,
)
from ingestion.cache.ttl import ttl_for_category

__all__ = [
    "CacheService",
    "CacheResult",
    "CacheDecision",
    "RawFetch",
    "LightweightSignal",
    "ttl_for_category",
]
