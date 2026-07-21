"""Social / X (Twitter) analysis router (blueprint §3.6 / P1.10).

Exposes:
  GET  /social/status          — feature flag + budget status
  POST /social/analyse         — run Grok analysis on a custom query
  GET  /social/stream/{query}  — SSE stream of Grok analysis for real-time UI

All responses carry the social trust tier disclaimer.
Gated: returns 503 when ENABLE_X_SOCIAL=false or XAI_API_KEY is not set.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from common.budget import X_SOCIAL, get_budget_guard
from common.config import get_settings
from common.logging import get_logger

router = APIRouter(prefix="/social", tags=["social"])
log = get_logger(__name__)

_SOCIAL_DISCLAIMER = (
    "Social signals are corroboration only. "
    "They are unverified crowd signals, never authoritative facts, "
    "and never used directly in model forecasts."
)


# ── schemas ──────────────────────────────────────────────────────────────────


class SocialStatus(BaseModel):
    enabled: bool
    xai_key_configured: bool
    model: str
    budget_usd: float
    spend_usd: float
    remaining_usd: float
    disclaimer: str


class AnalyseRequest(BaseModel):
    query: str
    max_tweets: int = 20


class SocialSignal(BaseModel):
    project_type: str | None = None
    location_sector: str | None = None
    status: str | None = None
    expected_year: int | None = None
    confidence: float
    sentiment: str
    urgency: str
    raw_signal: str | None = None
    source_document: str | None = None


class SocialAnalysisResult(BaseModel):
    query: str
    signals: list[SocialSignal]
    summary: str
    tweet_count: int
    disclaimer: str


# ── helpers ──────────────────────────────────────────────────────────────────


def _check_enabled() -> None:
    s = get_settings()
    if not s.enable_x_social:
        raise HTTPException(
            status_code=503,
            detail="Social analysis is disabled (ENABLE_X_SOCIAL=false). "
                   "Set ENABLE_X_SOCIAL=true in .env to enable.",
        )
    if not s.xai_api_key:
        raise HTTPException(
            status_code=503,
            detail="XAI_API_KEY is not configured.",
        )


def _get_grok_client() -> Any:
    from common.llm import LLMClient
    return LLMClient(provider="xai")


# ── routes ───────────────────────────────────────────────────────────────────


@router.get("/status", response_model=SocialStatus)
def social_status() -> SocialStatus:
    """Feature flag + budget health for the social analysis pipeline."""
    s = get_settings()
    guard = get_budget_guard()
    budget_status = guard.status(X_SOCIAL)
    return SocialStatus(
        enabled=s.enable_x_social,
        xai_key_configured=bool(s.xai_api_key),
        model=s.xai_model,
        budget_usd=budget_status.cap_usd,
        spend_usd=budget_status.spend_usd,
        remaining_usd=budget_status.remaining_usd,
        disclaimer=_SOCIAL_DISCLAIMER,
    )


@router.post("/analyse", response_model=SocialAnalysisResult)
def analyse(payload: AnalyseRequest) -> SocialAnalysisResult:
    """Run a Grok-powered analysis of recent tweets for a given query.

    Returns structured signals extracted from live social content.
    All signals carry social-tier confidence caps and go to the review queue.
    """
    _check_enabled()
    guard = get_budget_guard()

    from ingestion.crawlers.x_social import (
        _COST_PER_CALL_USD,
        XSocialCrawler,
    )

    if not guard.charge(X_SOCIAL, _COST_PER_CALL_USD):
        raise HTTPException(
            status_code=429,
            detail="Monthly social analysis budget exhausted. Check /ops/costs.",
        )

    crawler = XSocialCrawler()
    client = _get_grok_client()
    tweets = crawler._fetch_live_tweets(client, payload.query)
    events, summary = crawler._extract_signals(client, tweets, payload.query)

    signals = [
        SocialSignal(
            project_type=e.project_type,
            location_sector=e.location.sector,
            status=e.status,
            expected_year=e.expected_completion_year,
            confidence=e.extraction_confidence,
            sentiment=getattr(e, "sentiment", "neutral"),
            urgency=getattr(e, "urgency", "low"),
            source_document=e.source_document,
        )
        for e in events
    ]

    return SocialAnalysisResult(
        query=payload.query,
        signals=signals,
        summary=summary,
        tweet_count=len(tweets),
        disclaimer=_SOCIAL_DISCLAIMER,
    )


@router.get("/stream/{query}")
def stream_analysis(query: str) -> StreamingResponse:
    """SSE stream of Grok analysis tokens for the real-time UI.

    The frontend can connect and receive the analysis as it is generated,
    giving an instant live-feed feel.
    """
    _check_enabled()
    guard = get_budget_guard()

    from ingestion.crawlers.x_social import _COST_PER_CALL_USD

    if not guard.charge(X_SOCIAL, _COST_PER_CALL_USD):
        raise HTTPException(
            status_code=429,
            detail="Monthly social analysis budget exhausted.",
        )

    def _generate():  # noqa: ANN202
        client = _get_grok_client()
        import httpx

        system = (
            "You are a real-estate intelligence analyst for the Noida / Greater Noida / "
            "Yamuna Expressway corridor. Analyse recent social media signals about the "
            "following query and provide a concise, factual report covering: "
            "1) Key infrastructure/property mentions, 2) Market sentiment, "
            "3) Any urgent signals (delays, flooding, AQI, traffic events), "
            "4) Confidence level of each signal (social signals max 0.45). "
            "Always note: social signals are corroboration only, not verified facts."
        )
        user = (
            f"Query: {query}\n"
            "Provide a real-time analysis of current social media signals "
            "for this property/infrastructure topic in the NCR corridor."
        )
        payload = {
            "model": client.model,
            "temperature": 0.2,
            "stream": True,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "search_parameters": {
                "mode": "on",
                "recency_filter": "1month",
                "sources": [{"type": "x"}, {"type": "web"}],
            },
        }
        try:
            with client._client.stream("POST", "/chat/completions", json=payload) as resp:
                if resp.status_code >= 400:
                    yield f"data: {json.dumps({'error': f'Grok error {resp.status_code}'})}\n\n"
                    return
                for line in resp.iter_lines():
                    if not line or line == "data: [DONE]":
                        continue
                    if line.startswith("data: "):
                        try:
                            delta = json.loads(line[6:])["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield f"data: {json.dumps({'token': delta})}\n\n"
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except Exception as exc:  # noqa: BLE001
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            yield f"data: {json.dumps({'done': True, 'disclaimer': _SOCIAL_DISCLAIMER})}\n\n"

    return StreamingResponse(_generate(), media_type="text/event-stream")
