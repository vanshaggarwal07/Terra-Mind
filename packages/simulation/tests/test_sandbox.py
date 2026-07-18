"""Sandbox tests (P4.1): overrides applied in-memory, inputs never mutated."""

from __future__ import annotations

from simulation.sandbox import apply_scenario
from simulation.schemas import EventOverride, HypotheticalEvent, Scenario
from warehouse.schemas import InfraEventRead


def _event(eid: str, type_: str, status: str, *, year=None, dist=None) -> InfraEventRead:
    return InfraEventRead(
        id=eid,
        type=type_,
        status=status,
        expected_year=year,
        confidence=0.8,
        source_tier="official",
        verified=True,
        distance_km=dist,
    )


def test_override_expected_year_and_status():
    base = [_event("e1", "metro", "proposed", year=2032, dist=2.0)]
    scenario = Scenario(
        overrides=[EventOverride(event_id="e1", expected_year=2028, status="approved")]
    )
    out = apply_scenario(base, scenario)
    assert out[0].expected_year == 2028
    assert out[0].status == "approved"
    # input untouched (no leakage across requests)
    assert base[0].expected_year == 2032
    assert base[0].status == "proposed"


def test_remove_event():
    base = [_event("e1", "metro", "approved"), _event("e2", "mall", "proposed")]
    out = apply_scenario(base, Scenario(overrides=[EventOverride(event_id="e1", remove=True)]))
    assert [e.id for e in out] == ["e2"]
    assert len(base) == 2  # original intact


def test_add_hypothetical_event():
    base = [_event("e1", "mall", "proposed")]
    scenario = Scenario(
        add_events=[
            HypotheticalEvent(type="metro", status="approved", expected_year=2027, distance_km=0.5)
        ]
    )
    out = apply_scenario(base, scenario)
    assert len(out) == 2
    hypo = [e for e in out if e.type == "metro"][0]
    assert hypo.distance_km == 0.5
    assert hypo.data_layer == "scenario"


def test_unknown_override_id_is_ignored():
    base = [_event("e1", "metro", "approved")]
    out = apply_scenario(
        base, Scenario(overrides=[EventOverride(event_id="nope", status="operational")])
    )
    assert out[0].status == "approved"
