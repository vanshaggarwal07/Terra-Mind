"""Drift detection (P3.10).

Population Stability Index (PSI) between a reference distribution (training) and a
current distribution (recent inputs or predictions). PSI > 0.2 is the conventional
"significant shift -> investigate / retrain" alert threshold.
"""

from __future__ import annotations

import numpy as np

PSI_ALERT_THRESHOLD = 0.2


def population_stability_index(
    reference: np.ndarray, current: np.ndarray, *, bins: int = 10
) -> float:
    """PSI between two 1-D samples using quantile bins from the reference."""
    reference = np.asarray(reference, dtype=float)
    current = np.asarray(current, dtype=float)
    if reference.size == 0 or current.size == 0:
        return 0.0

    quantiles = np.linspace(0, 1, bins + 1)
    edges = np.unique(np.quantile(reference, quantiles))
    if edges.size < 2:
        return 0.0
    edges[0], edges[-1] = -np.inf, np.inf

    ref_counts, _ = np.histogram(reference, bins=edges)
    cur_counts, _ = np.histogram(current, bins=edges)
    ref_pct = np.clip(ref_counts / ref_counts.sum(), 1e-6, None)
    cur_pct = np.clip(cur_counts / cur_counts.sum(), 1e-6, None)
    return float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))


def psi_alert(reference: np.ndarray, current: np.ndarray, *, bins: int = 10) -> tuple[float, bool]:
    """Return (psi, is_alert). ``is_alert`` when PSI exceeds the threshold."""
    psi = population_stability_index(reference, current, bins=bins)
    return psi, psi > PSI_ALERT_THRESHOLD
