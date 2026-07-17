"""Guardrail: the builder API must never grow a verdict/score field (§0, §13).

If someone adds a 'trust_score', 'rating', 'rank', or similar to BuilderRead,
this test fails the build."""

from __future__ import annotations

from api.copilot import guardrails
from warehouse.schemas import BuilderRead

_FORBIDDEN_SUBSTRINGS = (
    "score",
    "rating",
    "rank",
    "verdict",
    "recommend",
    "trust",
    "grade",
    "safe",
    "risky",
)


def test_builder_read_has_no_judgment_fields():
    fields = set(BuilderRead.model_fields)
    offenders = {
        name
        for name in fields
        for bad in _FORBIDDEN_SUBSTRINGS
        if bad in name.lower()
    }
    assert not offenders, f"builder response must be facts-only, found: {offenders}"


def test_builder_read_carries_citation_and_disclaimer():
    fields = BuilderRead.model_fields
    assert "citation" in fields
    assert "disclaimer" in fields


def test_builder_project_nested_has_no_verdict_fields():
    from warehouse.schemas import BuilderProject

    fields = set(BuilderProject.model_fields)
    offenders = {n for n in fields for bad in _FORBIDDEN_SUBSTRINGS if bad in n.lower()}
    assert not offenders


def test_verdict_language_detected():
    assert guardrails.contains_verdict("best builder")
    assert guardrails.contains_verdict("avoid this developer")
