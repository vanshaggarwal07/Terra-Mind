"""Shared DB fixtures for warehouse repository tests.

Skipped unless a reachable DATABASE_URL is set (CI applies migrations first)."""

from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

DATABASE_URL = os.getenv("DATABASE_URL")


@pytest.fixture
def session() -> Session:
    if not DATABASE_URL:
        pytest.skip("DATABASE_URL not set")
    engine = create_engine(DATABASE_URL, future=True)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"database not reachable: {exc}")

    sess = Session(bind=engine)
    try:
        yield sess
    finally:
        sess.rollback()
        sess.close()
