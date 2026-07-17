"""FastAPI dependencies."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from common.db import get_session


def get_db() -> Iterator[Session]:
    """Request-scoped DB session (commits on success, rolls back on error)."""
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# Reusable typed dependency (avoids Depends() in default args).
DbSession = Annotated[Session, Depends(get_db)]
