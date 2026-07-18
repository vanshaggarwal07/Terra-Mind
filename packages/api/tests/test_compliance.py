"""Centralized compliance CI guards (P5.5).

Each test maps to a §0/§13 guarantee (see COMPLIANCE.md). CI fails if any is
violated: a crawler bypasses common.http; a builder/copilot output gains a verdict
field; a bare number reaches a client; an unverified high-stakes fact is exposable;
or a public fact lacks a citation + as-of date.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from api.copilot.schemas import CopilotAnswer
from common.compliance import (
    assert_no_verdict_fields,
    can_expose_publicly,
    has_attribution,
    has_freshness,
    scan_crawler_compliance,
)
from ml.monitoring.guards import GuardViolation, validate_envelope
from warehouse.schemas import (
    BuilderRead,
    Citation,
    ContributingFactor,
    InfraEventRead,
    PredictionEnvelope,
)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_CRAWLERS = _REPO_ROOT / "packages" / "ingestion" / "ingestion" / "crawlers"


# --- Guarantee 1: facts, not verdicts (§0.1, §13) -----------------------------
def test_builder_response_has_no_verdict_field():
    assert_no_verdict_fields(BuilderRead.model_fields.keys(), context="BuilderRead")


def test_copilot_response_has_no_verdict_field():
    assert_no_verdict_fields(CopilotAnswer.model_fields.keys(), context="CopilotAnswer")


# --- Guarantee 2: predictions are advisory (§0.2, §13) ------------------------
def test_bare_advisory_number_is_rejected():
    bare = PredictionEnvelope(
        prediction=8000.0,
        confidence=0.7,
        model_version="price-x",
        unit="INR/sqft",
        contributing_factors=[ContributingFactor(factor="x", weight=1.0)],
        disclaimer="d",
    )
    with pytest.raises(GuardViolation):
        validate_envelope(bare, domain="price")


# --- Guarantee 3: high-stakes facts need verification (§0.3, §3.4.4) ----------
def test_unverified_high_stakes_not_exposable():
    assert can_expose_publicly(verified=False, status="approved") is False


def test_public_reads_filter_verified_in_repo_source():
    # The repository layer must gate public reads on verified=True (§0.3).
    src = (
        _REPO_ROOT
        / "packages"
        / "warehouse"
        / "warehouse"
        / "repositories"
        / "infra_events_repo.py"
    ).read_text()
    assert "verified.is_(True)" in src


# --- Guarantee 4: attribution + staleness (§3.1, §13) -------------------------
def test_public_fact_carries_citation_and_as_of():
    fact = InfraEventRead(
        id="e1",
        type="metro",
        status="operational",
        confidence=0.9,
        source_tier="official",
        verified=True,
        citation=Citation(source_id="s1", source_name="YEIDA", as_of="2026-01-01T00:00:00"),
    )
    assert has_attribution(fact.citation)
    assert has_freshness(fact.citation)


def test_infra_event_schema_has_citation_field():
    assert "citation" in InfraEventRead.model_fields


# --- Guarantee 5: crawling compliance (§3.1) ----------------------------------
def test_no_crawler_bypasses_common_http():
    violations = scan_crawler_compliance(_CRAWLERS)
    assert violations == [], f"crawlers bypassing common.http: {violations}"
