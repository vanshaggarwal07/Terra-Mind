from api.routers.review import _merge, extraction_to_event_kwargs
from warehouse.enums import InfraEventStatus, InfraEventType


def test_extraction_mapping_maps_enums_and_location():
    ref = {
        "project_type": "metro",
        "status": "approved",
        "expected_completion_year": 2027,
        "budget_inr_cr": 1200.5,
        "location": {"sector": "Sector 137", "lat": 28.5, "lng": 77.4},
        "extraction_confidence": 0.91,
        "source_document": "yeida.pdf",
    }
    kwargs = extraction_to_event_kwargs(ref, source_id="src-1")
    assert kwargs["type"] == InfraEventType.metro
    assert kwargs["status"] == InfraEventStatus.approved
    assert kwargs["lat"] == 28.5 and kwargs["lng"] == 77.4
    assert kwargs["verified"] is True
    assert kwargs["source_id"] == "src-1"


def test_unknown_project_type_falls_back_to_other():
    kwargs = extraction_to_event_kwargs(
        {"project_type": "spaceport", "status": "proposed"}, source_id=None
    )
    assert kwargs["type"] == InfraEventType.other


def test_merge_edits_override_nested_location():
    base = {"status": "proposed", "location": {"sector": "S1", "lat": None}}
    patch = {"status": "approved", "location": {"lat": 28.6}}
    merged = _merge(base, patch)
    assert merged["status"] == "approved"
    assert merged["location"] == {"sector": "S1", "lat": 28.6}
