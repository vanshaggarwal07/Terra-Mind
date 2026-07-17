"""Ingestion observability (blueprint §1.11, §3 KPIs).

Process-local counters for crawl outcomes, cache decisions/hit-rate, and
extraction confidence. Exposed via the API for a dashboard; a production
deployment forwards these to Prometheus/OpenTelemetry.
"""

from ingestion.observability.metrics import (
    ingestion_snapshot,
    record_crawl,
    record_extraction_confidence,
)
from ingestion.observability.metrics import (
    reset as reset_metrics,
)

__all__ = [
    "record_crawl",
    "record_extraction_confidence",
    "ingestion_snapshot",
    "reset_metrics",
]
