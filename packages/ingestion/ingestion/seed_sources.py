"""Idempotently seed the source registry (blueprint §3.1, §11).

Run: ``python -m ingestion.seed_sources`` (wired to ``make seed``).
Re-running updates existing rows by name — it never duplicates.
"""

from __future__ import annotations

from common.db import session_scope
from common.logging import get_logger
from ingestion.registry.seed_data import SEED_SOURCES
from warehouse.repositories import SourcesRepo
from warehouse.schemas import SourceCreate

log = get_logger(__name__)


def seed() -> dict[str, int]:
    created = updated = 0
    with session_scope() as session:
        repo = SourcesRepo(session)
        for row in SEED_SOURCES:
            _, was_created = repo.upsert_by_name(SourceCreate(**row))
            if was_created:
                created += 1
            else:
                updated += 1
    log.info("sources_seeded", created=created, updated=updated, total=len(SEED_SOURCES))
    return {"created": created, "updated": updated, "total": len(SEED_SOURCES)}


if __name__ == "__main__":
    result = seed()
    print(f"Seeded sources: {result}")
