"""Copilot API (blueprint §1 feature 5, §6)."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.copilot.retrieval import DBRetriever
from api.copilot.schemas import CopilotAnswer, CopilotQuery
from api.copilot.service import CopilotService
from api.deps import DbSession

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/query", response_model=CopilotAnswer)
def copilot_query(payload: CopilotQuery, db: DbSession) -> CopilotAnswer:
    service = CopilotService(DBRetriever(db))
    return service.answer(payload.query, locality_id=payload.locality_id)


@router.post("/stream")
def copilot_stream(payload: CopilotQuery, db: DbSession) -> StreamingResponse:
    service = CopilotService(DBRetriever(db))
    return StreamingResponse(
        service.stream(payload.query, locality_id=payload.locality_id),
        media_type="text/plain",
    )
