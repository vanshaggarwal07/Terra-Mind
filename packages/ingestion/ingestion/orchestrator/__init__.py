"""Dagster orchestration (blueprint §3.2): one job + schedule per active source.

The Dagster import is deferred so the rest of the ingestion package (crawlers,
cache) is importable/testable without Dagster installed. The scheduling logic
itself lives in ``schedules.py`` as pure functions and is tested independently.
"""

from ingestion.orchestrator.schedules import (
    build_ingestion_plan,
    cadence_to_cron,
)

__all__ = ["build_ingestion_plan", "cadence_to_cron", "load_definitions"]


def load_definitions():  # noqa: ANN201
    """Build Dagster Definitions from the live source registry.

    Imported lazily by Dagster (`dagster dev -m ingestion.orchestrator`)."""
    from ingestion.orchestrator.defs import build_definitions

    return build_definitions()


# Dagster looks for a module-level `defs`/`Definitions`. Build lazily & safely.
try:  # pragma: no cover - exercised only under `dagster dev`
    defs = load_definitions()
except Exception:  # noqa: BLE001 - no DB / no dagster at import time is fine
    defs = None
