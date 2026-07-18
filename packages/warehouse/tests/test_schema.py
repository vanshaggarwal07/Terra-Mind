"""Schema smoke tests.

Marked ``db`` because they need a live Postgres+PostGIS+pgvector with the
migration applied (CI runs ``alembic upgrade head`` first). Skipped when no
DATABASE_URL / DB is reachable so the unit suite stays green locally.
"""

import os

import pytest
from sqlalchemy import create_engine, inspect, text

DATABASE_URL = os.getenv("DATABASE_URL")


def _engine_or_skip():
    if not DATABASE_URL:
        pytest.skip("DATABASE_URL not set")
    engine = create_engine(DATABASE_URL, future=True)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"database not reachable: {exc}")
    return engine


EXPECTED_TABLES = {
    "sources",
    "raw_cache",
    "localities",
    "properties",
    "infra_events",
    "builders",
    "gov_bodies",
    "review_queue",
    "doc_chunks",
    "infra_event_affects_locality",
    "builder_develops_property",
    "infra_event_approved_by",
    "model_registry",
}


@pytest.mark.db
def test_extensions_enabled():
    engine = _engine_or_skip()
    with engine.connect() as conn:
        postgis = conn.execute(text("SELECT postgis_version()")).scalar()
        vector = conn.execute(
            text("SELECT extversion FROM pg_extension WHERE extname='vector'")
        ).scalar()
    assert postgis
    assert vector


@pytest.mark.db
def test_all_tables_exist():
    engine = _engine_or_skip()
    tables = set(inspect(engine).get_table_names())
    missing = EXPECTED_TABLES - tables
    assert not missing, f"missing tables: {missing}"
