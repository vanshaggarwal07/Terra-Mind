"""Dagster Definitions: one job + schedule per active source.

Only imported under `dagster dev` (see orchestrator.__init__.load_definitions),
so Dagster is an optional runtime dependency of the rest of the package.
"""

from __future__ import annotations

from typing import Any

from dagster import (
    Definitions,
    OpExecutionContext,
    ScheduleDefinition,
    job,
    op,
)

# Import crawlers for their registration side effects.
import ingestion.crawlers  # noqa: F401
from common.db import session_scope
from common.logging import get_logger
from ingestion.crawlers.runner import run_source
from ingestion.docintel.wire import make_parse_fn
from ingestion.orchestrator.schedules import PlanEntry, build_ingestion_plan
from warehouse.repositories import SourcesRepo

log = get_logger(__name__)


def _make_job(entry: PlanEntry) -> Any:
    op_name = f"ingest_{_slug(entry.source_id)}"
    job_name = f"job_{_slug(entry.source_id)}"

    @op(name=op_name)
    def _ingest_op(context: OpExecutionContext) -> str:
        # Per-source isolation: an exception fails THIS run only (§3.2/§13).
        with session_scope() as session:
            source = SourcesRepo(session).get(entry.source_id)
            if source is None or not source.is_active:
                context.log.warning(f"source {entry.source_id} missing/inactive; skipping")
                return "skipped"
            result = run_source(source, session, parse=make_parse_fn(session))
            context.log.info(f"decision={result.decision}")
            return str(result.decision)

    @job(name=job_name)
    def _job() -> None:
        _ingest_op()

    return _job


def build_definitions() -> Definitions:
    from ingestion.crawlers.base import crawler_keys

    with session_scope() as session:
        sources = SourcesRepo(session).list(active_only=True)
        plan = build_ingestion_plan(sources, registered_keys=set(crawler_keys()))

    jobs = []
    schedules = []
    for entry in plan:
        j = _make_job(entry)
        jobs.append(j)
        schedules.append(
            ScheduleDefinition(
                job=j,
                cron_schedule=entry.cron,
                name=f"sched_{_slug(entry.source_id)}",
            )
        )
    log.info("dagster_definitions_built", jobs=len(jobs))
    return Definitions(jobs=jobs, schedules=schedules)


def _slug(value: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in value)
