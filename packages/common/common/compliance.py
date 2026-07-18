"""Compliance guardrails (blueprint §0 trust foundations, §13 risks; Phase 5 P5.5).

These are LEGAL / TRUST invariants, not features — codified here so they are
centralized and testable, and wired in from Phase 1 onward. This module is
deliberately dependency-free (primitives only) so every layer can import it
without cycles. Higher layers add the runtime/schema-aware guards on top.

Guarantees enforced (each has a CI guard test — see COMPLIANCE.md):
  1. Facts, not verdicts — no derived trust score/ranking on builders/copilot/CV.
  2. Predictions are advisory — bands + disclaimers, never a bare number.
  3. High-stakes facts are human-verified before public exposure.
  4. Attribution — every public fact carries a source citation + as-of date.
  5. Crawling compliance — every crawler routes through common.http (robots/UA/RL).
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from pathlib import Path


class ComplianceError(AssertionError):
    """Raised when a trust/legal invariant is violated."""


# --- 1. Facts, not verdicts (§0.1, §13 defamation) -----------------------------
# Any of these field names on a builder/copilot/CV output is a defamation risk.
FORBIDDEN_VERDICT_FIELDS: frozenset[str] = frozenset(
    {
        "trust_score",
        "trustscore",
        "trust_rating",
        "rating",
        "ranking",
        "rank",
        "verdict",
        "judgment",
        "judgement",
        "recommendation",
        "recommended",
        "builder_score",
        "developer_score",
        "quality_score",
        "credit_score",
        "risk_label",
        "risk_grade",
        "grade",
        "is_trustworthy",
        "is_reliable",
        "is_safe",
        "reputation_score",
    }
)


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "_", name.lower())


def find_verdict_fields(field_names: Iterable[str]) -> set[str]:
    """Return any field names that look like a derived builder/quality verdict."""
    normalized = {name: _norm(name) for name in field_names}
    return {orig for orig, norm in normalized.items() if norm in FORBIDDEN_VERDICT_FIELDS}


def assert_no_verdict_fields(field_names: Iterable[str], *, context: str = "") -> None:
    bad = find_verdict_fields(field_names)
    if bad:
        raise ComplianceError(
            f"facts-not-verdicts violated{f' in {context}' if context else ''}: "
            f"forbidden verdict field(s) {sorted(bad)} (§0.1/§13)"
        )


# --- 3. High-stakes facts need human verification (§0.3, §3.4.4) --------------
def is_high_stakes(status: str | None) -> bool:
    """A binary/consequential fact (e.g. 'metro approved: yes/no')."""
    return str(status).lower() == "approved"


def can_expose_publicly(*, verified: bool, status: str | None) -> bool:
    """High-stakes facts may reach the public ONLY after review (verified=True)."""
    if is_high_stakes(status):
        return bool(verified)
    return True


def assert_public_exposable(*, verified: bool, status: str | None, context: str = "") -> None:
    if not can_expose_publicly(verified=verified, status=status):
        raise ComplianceError(
            f"high-stakes unverified fact exposed{f' in {context}' if context else ''}: "
            f"status={status!r} requires verified=True (§0.3/§3.4.4)"
        )


# --- 4. Attribution + staleness transparency (§3.1, §13) ----------------------
def _get(obj: object, key: str) -> object:
    if isinstance(obj, Mapping):
        return obj.get(key)
    return getattr(obj, key, None)


def has_attribution(citation: object) -> bool:
    """A citation must identify its source (id, name, or document link)."""
    if citation is None:
        return False
    return any(_get(citation, k) for k in ("source_id", "source_name", "source_document"))


def has_freshness(citation: object) -> bool:
    """A citation must expose an as-of / last-verified date for staleness transparency."""
    return _get(citation, "as_of") is not None


# --- 5. Crawling compliance scan (§3.1) ---------------------------------------
# Crawlers must route through common.http (robots.txt + honest UA + rate limits),
# never a raw HTTP client. This static scan is enforced in CI.
_RAW_HTTP_PATTERNS = (
    re.compile(r"^\s*import\s+httpx\b", re.M),
    re.compile(r"^\s*import\s+requests\b", re.M),
    re.compile(r"^\s*from\s+httpx\b", re.M),
    re.compile(r"^\s*from\s+requests\b", re.M),
    re.compile(r"\brequests\.(get|post|put|delete|head|request)\s*\(", re.M),
)


def scan_crawler_compliance(crawler_dir: str | Path, *, allow: Iterable[str] = ()) -> list[str]:
    """Return crawler files that bypass common.http with a raw HTTP client.

    ``allow`` names files exempt from the scan (e.g. tests). An empty result
    means every crawler is compliant."""
    allow_set = set(allow)
    violations: list[str] = []
    for path in sorted(Path(crawler_dir).glob("*.py")):
        if path.name in allow_set or path.name.startswith("test_"):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if any(p.search(text) for p in _RAW_HTTP_PATTERNS):
            violations.append(path.name)
    return violations
