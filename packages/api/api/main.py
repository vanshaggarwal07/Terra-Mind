"""FastAPI application entrypoint.

Feature routers (facts, score, builder, proximity, copilot, predictions) are
mounted here as they are built in Phases 1-3. For now this exposes health.
"""

from __future__ import annotations

from fastapi import FastAPI

from api.routers import (
    admin_sources,
    builders,
    copilot,
    facts,
    metrics,
    proximity,
    review,
    score,
)

app = FastAPI(
    title="Property Digital Twin API",
    version="0.1.0",
    description="Facts, scores, and grounded explanations for the NCR corridor.",
)

# Facts + product features (Phase 2)
app.include_router(facts.router)
app.include_router(score.router)
app.include_router(proximity.router)
app.include_router(builders.router)
app.include_router(copilot.router)

# Admin / ops (Phase 1)
app.include_router(admin_sources.router)
app.include_router(review.router)
app.include_router(metrics.router)


@app.get("/health", tags=["ops"])
def health() -> dict[str, str]:
    return {"status": "ok"}
