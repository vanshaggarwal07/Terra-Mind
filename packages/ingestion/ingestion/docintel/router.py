"""The human-review gate (blueprint §3.4.4).

Any extraction that is low-confidence OR high-stakes must be human-verified
before users see it. This is the single highest-leverage trust feature — the
rule lives here as a pure function so it is impossible to bypass silently.
"""

from __future__ import annotations

from dataclasses import dataclass

from ingestion.docintel.schema import ExtractedInfraEvent
from warehouse.enums import ReviewReason, SourceTier

# Extractions below this confidence go to human review (§3.4.4).
CONFIDENCE_THRESHOLD = 0.85

# Statuses considered high-stakes/binary — always human-reviewed regardless of
# confidence (e.g. "metro approved: yes/no").
HIGH_STAKES_STATUSES = {"approved"}

# Tiers that cannot self-verify: news + social are corroboration signals only and
# must NEVER auto-publish as facts (blueprint §3.6).
UNVERIFIABLE_TIERS = {SourceTier.news, SourceTier.social}


@dataclass(frozen=True)
class RouteDecision:
    to_review: bool
    reason: ReviewReason | None


def route(event: ExtractedInfraEvent) -> RouteDecision:
    if event.status in HIGH_STAKES_STATUSES:
        return RouteDecision(to_review=True, reason=ReviewReason.high_stakes)
    if event.extraction_confidence < CONFIDENCE_THRESHOLD:
        return RouteDecision(to_review=True, reason=ReviewReason.low_confidence)
    return RouteDecision(to_review=False, reason=None)


def route_for_tier(event: ExtractedInfraEvent, tier: SourceTier) -> RouteDecision:
    """Tier-aware routing. News/social can never auto-publish — always reviewed."""
    if tier in UNVERIFIABLE_TIERS:
        return RouteDecision(to_review=True, reason=ReviewReason.unverifiable_source)
    return route(event)
