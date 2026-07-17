"""Cache-decision metrics (blueprint §3.3 cost KPI, surfaced in §1.11).

Process-local counters with a pluggable sink so the observability layer (P1.11)
can forward them to Prometheus/logs without this module depending on it.
"""

from __future__ import annotations

import contextlib
import threading
from collections import Counter
from collections.abc import Callable

_lock = threading.Lock()
_counts: Counter[str] = Counter()
_sinks: list[Callable[[str, str], None]] = []


def record_decision(decision: str, source_id: str) -> None:
    with _lock:
        _counts[decision] += 1
    for sink in list(_sinks):
        # a broken sink must not break ingestion
        with contextlib.suppress(Exception):
            sink(decision, source_id)


def register_sink(sink: Callable[[str, str], None]) -> None:
    _sinks.append(sink)


def snapshot() -> dict[str, int]:
    with _lock:
        return dict(_counts)


def hit_rate() -> float:
    """Fraction of calls served without a full network re-fetch."""
    snap = snapshot()
    total = sum(snap.values())
    if total == 0:
        return 0.0
    served_from_cache = snap.get("fresh_cache_hit", 0) + snap.get("verified_unchanged", 0)
    return served_from_cache / total


def reset() -> None:
    with _lock:
        _counts.clear()
