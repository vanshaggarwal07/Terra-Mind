"""Pure scheduling logic (no Dagster dependency, fully unit-testable).

Maps a source's ``refresh_cadence`` to a cron expression and builds the
ingestion plan (which sources run, and when)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# All jobs run in the early morning (03:xx) to be gentle on gov sites.
_CADENCE_CRON: dict[str, str] = {
    "daily": "0 3 * * *",
    "weekly": "0 3 * * 1",
    "monthly": "0 3 1 * *",
    "quarterly": "0 3 1 */3 *",
    "yearly": "0 3 1 1 *",
    "one-time": "0 3 1 1 *",
    "5-10 days": "0 3 */7 * *",
}
_DEFAULT_CRON = "0 3 * * 1"  # weekly


def cadence_to_cron(cadence: str | None) -> str:
    if not cadence:
        return _DEFAULT_CRON
    return _CADENCE_CRON.get(cadence.strip().lower(), _DEFAULT_CRON)


@dataclass(frozen=True)
class PlanEntry:
    source_id: str
    source_name: str
    crawler_key: str
    cron: str


def build_ingestion_plan(
    sources: list[Any], registered_keys: set[str] | None = None
) -> list[PlanEntry]:
    """One plan entry per ACTIVE source that has a REGISTERED crawler_key.

    Disabled sources, sources without a crawler, and sources whose crawler is
    not yet implemented are excluded — so toggling ``is_active`` adds/removes a
    scheduled job with no code change (§3.2)."""
    plan: list[PlanEntry] = []
    for s in sources:
        if not getattr(s, "is_active", False):
            continue
        key = getattr(s, "crawler_key", None)
        if not key:
            continue
        if registered_keys is not None and key not in registered_keys:
            continue
        plan.append(
            PlanEntry(
                source_id=s.id,
                source_name=s.source_name,
                crawler_key=s.crawler_key,
                cron=cadence_to_cron(s.refresh_cadence),
            )
        )
    return plan
