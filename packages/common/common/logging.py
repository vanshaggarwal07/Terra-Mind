"""Structured JSON logging with correlation-id support.

Use ``get_logger(__name__)`` everywhere. Bind a correlation id per request/run
with ``bind_correlation_id(...)`` so logs across services can be stitched.
"""

from __future__ import annotations

import logging
from contextvars import ContextVar

import structlog

_correlation_id: ContextVar[str | None] = ContextVar("correlation_id", default=None)
_configured = False


def _add_correlation_id(_logger, _method, event_dict):  # noqa: ANN001
    cid = _correlation_id.get()
    if cid is not None:
        event_dict["correlation_id"] = cid
    return event_dict


def configure_logging(level: str = "INFO") -> None:
    """Configure structlog to emit JSON. Idempotent."""
    global _configured
    if _configured:
        return

    logging.basicConfig(format="%(message)s", level=getattr(logging, level.upper(), logging.INFO))
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            _add_correlation_id,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )
    _configured = True


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    if not _configured:
        configure_logging()
    return structlog.get_logger(name)


def bind_correlation_id(correlation_id: str) -> None:
    _correlation_id.set(correlation_id)


def get_correlation_id() -> str | None:
    return _correlation_id.get()
