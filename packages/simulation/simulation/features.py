"""Graph-state -> feature mapping for the simulation (blueprint §7, P4.1).

Phase-3 models consume a feature vector (proximity distances, infra progress),
not raw infra events. To recompute predictions for a mutated graph, we derive the
relevant features from the event set and apply the *delta* (scenario - baseline)
to the locality's current feature vector. This keeps the simulation a genuine
"recompute with modified inputs" over the same serving path.
"""

from __future__ import annotations

from warehouse.schemas import InfraEventRead

# infra type -> the proximity feature it drives.
_TYPE_TO_DIST_FEATURE = {
    "metro": "dist_metro_km",
    "rrts": "dist_metro_km",
    "airport": "dist_airport_km",
    "road": "dist_expressway_km",
    "expressway": "dist_expressway_km",
    "highway": "dist_highway_km",
}

_STATUS_PROGRESS = {
    "operational": 1.0,
    "under_construction": 0.6,
    "approved": 0.35,
    "proposed": 0.1,
}

_CURRENT_YEAR = 2026
_HORIZON = 15.0


def _recency(expected_year: int | None) -> float:
    if expected_year is None:
        return 0.6
    delta = expected_year - _CURRENT_YEAR
    if delta <= 0:
        return 1.0
    return max(0.2, 1.0 - delta / _HORIZON)


def derive_features(events: list[InfraEventRead]) -> dict[str, float]:
    """Derive proximity + progress features from an event set.

    ``dist_*`` features are the nearest event of the mapped type; ``infra_progress``
    is a status/recency-weighted intensity in [0, 1]. Only features that can be
    computed are returned (so absent types don't clobber the base vector)."""
    derived: dict[str, float] = {}

    for ev in events:
        feat = _TYPE_TO_DIST_FEATURE.get(ev.type)
        if feat and ev.distance_km is not None:
            derived[feat] = min(derived.get(feat, float("inf")), ev.distance_km)

    if events:
        contribs = [
            _STATUS_PROGRESS.get(ev.status, 0.1) * _recency(ev.expected_year) for ev in events
        ]
        # saturating aggregate so several strong signals approach 1.0
        derived["infra_progress"] = min(1.0, sum(contribs) / 3.0)
    else:
        derived["infra_progress"] = 0.0

    return derived


def apply_feature_delta(
    base_features: dict[str, float],
    derived_baseline: dict[str, float],
    derived_scenario: dict[str, float],
) -> dict[str, float]:
    """Apply (scenario - baseline) derived-feature deltas onto the current vector."""
    out = dict(base_features)
    for key in set(derived_baseline) | set(derived_scenario):
        current = base_features.get(key)
        b = derived_baseline.get(key, current)
        s = derived_scenario.get(key, current)
        if b is None or s is None:
            if s is not None:  # brand-new feature -> adopt scenario value
                out[key] = _clip(key, s)
            continue
        new = (current if current is not None else b) + (s - b)
        out[key] = _clip(key, new)
    return out


def _clip(key: str, value: float) -> float:
    if key == "infra_progress":
        return max(0.0, min(1.0, value))
    if key.startswith("dist_"):
        return max(0.0, value)
    return value
