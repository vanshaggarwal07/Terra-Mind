"""Ingestion metrics collection + snapshot."""

from __future__ import annotations

import threading
from collections import Counter, defaultdict, deque
from typing import Any

_lock = threading.Lock()
_crawl_total: Counter[str] = Counter()  # "success" | "failure"
_crawl_by_source: dict[str, Counter[str]] = defaultdict(Counter)
_confidences: deque[float] = deque(maxlen=2000)


def record_crawl(source_id: str, ok: bool) -> None:
    key = "success" if ok else "failure"
    with _lock:
        _crawl_total[key] += 1
        _crawl_by_source[source_id][key] += 1


def record_extraction_confidence(value: float) -> None:
    with _lock:
        _confidences.append(value)


def _confidence_stats() -> dict[str, float]:
    with _lock:
        values = sorted(_confidences)
    n = len(values)
    if n == 0:
        return {"count": 0, "avg": 0.0, "p50": 0.0, "low_conf_rate": 0.0}
    avg = sum(values) / n
    p50 = values[n // 2]
    low = sum(1 for v in values if v < 0.85) / n
    return {"count": n, "avg": round(avg, 3), "p50": round(p50, 3), "low_conf_rate": round(low, 3)}


def ingestion_snapshot() -> dict[str, Any]:
    from ingestion.cache import metrics as cache_metrics

    with _lock:
        crawl_total = dict(_crawl_total)
        by_source = {k: dict(v) for k, v in _crawl_by_source.items()}
    total = sum(crawl_total.values())
    success_rate = (crawl_total.get("success", 0) / total) if total else 0.0
    return {
        "crawl": {
            "total": total,
            "success": crawl_total.get("success", 0),
            "failure": crawl_total.get("failure", 0),
            "success_rate": round(success_rate, 3),
            "by_source": by_source,
        },
        "cache": {
            "decisions": cache_metrics.snapshot(),
            "hit_rate": round(cache_metrics.hit_rate(), 3),
        },
        "extraction_confidence": _confidence_stats(),
    }


def reset() -> None:
    with _lock:
        _crawl_total.clear()
        _crawl_by_source.clear()
        _confidences.clear()
