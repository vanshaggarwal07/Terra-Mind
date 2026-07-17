"""News & social ingestion (blueprint §3.6).

Lowest-confidence tier. These sources CANNOT self-verify, so their extractions
are always corroboration signals routed to human review — never auto-published
facts. Social (X) is paid and OFF by default in the registry seed.
"""

from ingestion.news.extractor import NewsSignalExtractor

__all__ = ["NewsSignalExtractor"]
