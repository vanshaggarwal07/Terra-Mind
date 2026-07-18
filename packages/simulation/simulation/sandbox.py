"""Scenario sandbox (blueprint §7, P4.1).

Applies scenario overrides to an IN-MEMORY copy of a locality's infra events.
The input list is never mutated and nothing is persisted — scenario state can
never leak into the warehouse or another request.
"""

from __future__ import annotations

import uuid

from simulation.schemas import Scenario
from warehouse.schemas import Citation, InfraEventRead


def apply_scenario(baseline: list[InfraEventRead], scenario: Scenario) -> list[InfraEventRead]:
    """Return a NEW event list with the scenario applied. ``baseline`` is untouched."""
    # deep copies so we never mutate the caller's objects
    by_id: dict[str, InfraEventRead] = {ev.id: ev.model_copy(deep=True) for ev in baseline}

    for ov in scenario.overrides:
        ev = by_id.get(ov.event_id)
        if ev is None:
            continue
        if ov.remove:
            by_id.pop(ov.event_id, None)
            continue
        if ov.expected_year is not None:
            ev.expected_year = ov.expected_year
        if ov.status is not None:
            ev.status = ov.status

    result = list(by_id.values())

    for hypo in scenario.add_events:
        result.append(
            InfraEventRead(
                id=f"hypo-{uuid.uuid4().hex[:8]}",
                type=hypo.type,
                status=hypo.status,
                expected_year=hypo.expected_year,
                confidence=hypo.confidence,
                source_tier="scenario",
                lat=hypo.lat,
                lng=hypo.lng,
                verified=True,  # in-sandbox only; never persisted
                data_layer="scenario",
                distance_km=hypo.distance_km,
                citation=Citation(source_name="what-if scenario"),
            )
        )
    return result
