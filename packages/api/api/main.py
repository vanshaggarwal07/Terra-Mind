"""FastAPI application entrypoint.

Feature routers (facts, score, builder, proximity, copilot, predictions) are
mounted here as they are built in Phases 1-3. For now this exposes health.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from common.config import get_settings
from api.routers import (
    admin_sources,
    builders,
    copilot,
    facts,
    metrics,
    ops,
    predictions,
    proximity,
    review,
    score,
    signals,
    simulate,
)

app = FastAPI(
    title="Property Digital Twin API",
    version="0.1.0",
    description="Facts, scores, and grounded explanations for the NCR corridor.",
)

# CORS: allow the web app's browser origin(s) to call the API. Without this the
# browser blocks every cross-origin fetch (the API is on :8000, the web on :3000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Facts + product features (Phase 2)
app.include_router(facts.router)
app.include_router(score.router)
app.include_router(proximity.router)
app.include_router(builders.router)
app.include_router(copilot.router)

# Prediction / ML engine (Phase 3)
app.include_router(predictions.router)

# Simulation + satellite pattern signals (Phase 4)
app.include_router(simulate.router)
app.include_router(signals.router)

# Admin / ops (Phase 1)
app.include_router(admin_sources.router)
app.include_router(review.router)
app.include_router(metrics.router)

# Unified observability + cost dashboard (Phase 5)
app.include_router(ops.router)


@app.get("/health", tags=["ops"])
def health() -> dict[str, str]:
    return {"status": "ok"}
