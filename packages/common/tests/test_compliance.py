"""Compliance primitive tests (P5.5): the dependency-free invariants."""

from __future__ import annotations

import pytest

from common.compliance import (
    ComplianceError,
    assert_no_verdict_fields,
    assert_public_exposable,
    can_expose_publicly,
    find_verdict_fields,
    has_attribution,
    has_freshness,
    is_high_stakes,
    scan_crawler_compliance,
)


def test_verdict_field_detection():
    assert find_verdict_fields(["name", "trust_score"]) == {"trust_score"}
    assert find_verdict_fields(["name", "Rating"]) == {"Rating"}
    assert find_verdict_fields(["name", "rera_id", "status"]) == set()


def test_assert_no_verdict_fields_raises():
    with pytest.raises(ComplianceError):
        assert_no_verdict_fields(["builder_score"], context="builder")
    assert_no_verdict_fields(["name", "rera_id"])  # clean -> no raise


def test_high_stakes_exposure_rule():
    assert is_high_stakes("approved") is True
    assert is_high_stakes("proposed") is False
    # approved (high-stakes) must be verified to expose
    assert can_expose_publicly(verified=False, status="approved") is False
    assert can_expose_publicly(verified=True, status="approved") is True
    # non-high-stakes may show regardless
    assert can_expose_publicly(verified=False, status="proposed") is True


def test_assert_public_exposable_raises_for_unverified_high_stakes():
    with pytest.raises(ComplianceError):
        assert_public_exposable(verified=False, status="approved", context="facts")


def test_attribution_and_freshness_helpers():
    assert has_attribution({"source_name": "YEIDA"}) is True
    assert (
        has_attribution({"source_id": None, "source_name": None, "source_document": None}) is False
    )
    assert has_freshness({"as_of": "2026-01-01"}) is True
    assert has_freshness({"as_of": None}) is False


def test_crawler_scanner_flags_raw_http(tmp_path):
    (tmp_path / "good.py").write_text("from common.http import HttpClient\n")
    (tmp_path / "bad.py").write_text("import requests\n\nrequests.get('http://x')\n")
    violations = scan_crawler_compliance(tmp_path)
    assert "bad.py" in violations
    assert "good.py" not in violations
