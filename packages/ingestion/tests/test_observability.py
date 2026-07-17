from ingestion.cache import metrics as cache_metrics
from ingestion.observability import (
    ingestion_snapshot,
    record_crawl,
    record_extraction_confidence,
    reset_metrics,
)


def setup_function() -> None:
    reset_metrics()
    cache_metrics.reset()


def test_crawl_success_rate():
    record_crawl("s1", ok=True)
    record_crawl("s1", ok=True)
    record_crawl("s1", ok=False)
    snap = ingestion_snapshot()
    assert snap["crawl"]["total"] == 3
    assert snap["crawl"]["success"] == 2
    assert snap["crawl"]["success_rate"] == round(2 / 3, 3)
    assert snap["crawl"]["by_source"]["s1"]["failure"] == 1


def test_extraction_confidence_stats():
    for v in (0.9, 0.5, 0.95, 0.4):
        record_extraction_confidence(v)
    stats = ingestion_snapshot()["extraction_confidence"]
    assert stats["count"] == 4
    assert stats["low_conf_rate"] == 0.5  # 0.5 and 0.4 are < 0.85


def test_cache_hitrate_included():
    cache_metrics.record_decision("fresh_cache_hit", "s1")
    cache_metrics.record_decision("miss_full_fetch", "s1")
    snap = ingestion_snapshot()
    assert snap["cache"]["hit_rate"] == 0.5
