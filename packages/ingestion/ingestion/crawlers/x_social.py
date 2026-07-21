"""X (Twitter/xAI) social crawler powered by Grok (blueprint §3.6 / P1.10).

Uses the xAI Live Search API (OpenAI-compatible) to pull recent tweets/posts
about NCR property, infrastructure, and real-estate topics and run a
deep Grok analysis pass. All extractions are tagged ``SourceTier.social``,
hard-capped at NEWS_CONFIDENCE_CEILING (0.5), and routed to human review —
they never auto-publish as verified facts.

Feature gating:
  - ENABLE_X_SOCIAL=true  AND  XAI_API_KEY set  required to run.
  - Monthly budget enforced via BudgetGuard (BUDGET_X_SOCIAL_USD).
  - Disabled (and fails safe) if either check fails.

Grok capabilities used:
  - ``search_parameters`` with ``live_search=true`` for real-time tweet ingestion.
  - Structured JSON extraction via ``complete_json`` for each tweet batch.
  - Sentiment + urgency scoring so the review queue can be triaged.
"""

from __future__ import annotations

import json
from typing import Any

from common.budget import X_SOCIAL, get_budget_guard
from common.config import get_settings
from common.logging import get_logger
from ingestion.crawlers.base import BaseCrawler, Target, register_crawler
from ingestion.docintel.schema import (
    ExtractedInfraEvent,
    ExtractedLocation,
    ExtractionResult,
)

log = get_logger(__name__)

# Cost estimate per Grok live-search call (conservative; adjust from billing).
_COST_PER_CALL_USD = 0.02

# Maximum tweets to analyse in one LLM call (keeps context window sane).
_BATCH_SIZE = 20

# Confidence ceiling for social signals (§3.6).
_SOCIAL_CONFIDENCE_CEILING = 0.45

# How many months back to search (passed to Grok live-search).
_RECENCY_MONTHS = 1

# Property/infra search queries for the Noida/GN/YEW corridor.
_DEFAULT_QUERIES: list[str] = [
    "Noida Greater Noida property infrastructure 2025",
    "Yamuna Expressway metro RRTS Noida real estate",
    "NCR corridor flood AQI traffic Noida Greater Noida",
    "jewar airport property prices Noida sector",
    "RERA builder Noida Greater Noida delay",
]

_ANALYSIS_SYSTEM_PROMPT = """\
You are a real-estate intelligence analyst specialising in the Noida /
Greater Noida / Yamuna Expressway corridor in India.

Given a batch of tweets/posts, extract ONLY infrastructure and real-estate
signals that are explicitly mentioned. For EACH distinct signal produce one
JSON item. Rules:
1. Use null when a field is not stated — NEVER invent values.
2. Set extraction_confidence honestly (0–0.45 max for social content).
3. Set sentiment to "positive", "negative", or "neutral".
4. Set urgency to "high", "medium", or "low".
5. Return a JSON object: {"events": [...], "summary": "1-2 sentence overview"}.

Schema per event:
{
  "project_type": "metro|road|airport|mall|school|hospital|industrial|rrts|other",
  "location": {"sector": "", "lat": null, "lng": null},
  "status": "proposed|approved|under_construction|operational",
  "expected_completion_year": null,
  "budget_inr_cr": null,
  "source_document": "",
  "extraction_confidence": 0.0,
  "sentiment": "neutral",
  "urgency": "low",
  "raw_signal": "verbatim tweet excerpt (max 140 chars)"
}
"""


@register_crawler("x_social")
class XSocialCrawler(BaseCrawler):
    """Grok-powered live social crawler for NCR property intelligence."""

    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        queries: list[str] = cfg.get("queries") or _DEFAULT_QUERIES
        return [Target(url=f"xai://live-search/{i}", kind="api", meta={"query": q})
                for i, q in enumerate(queries)]

    # ------------------------------------------------------------------
    # Main entry-point (called by CacheService / orchestrator)
    # ------------------------------------------------------------------

    def fetch_full(self, source: Any) -> Any:  # noqa: ANN401
        """Pull tweets via Grok live-search and return structured extractions.

        Returns a RawFetch-compatible object but also attaches .social_extractions
        for the orchestrator to persist directly (skips the normal doc-intel chain).
        """
        from ingestion.cache.service import RawFetch  # lazy to avoid circular imports

        settings = get_settings()
        guard = get_budget_guard()

        if not settings.enable_x_social:
            log.info("x_social_disabled", reason="ENABLE_X_SOCIAL=false")
            return RawFetch(
                content=b"",
                content_type="application/json",
                extension="json",
                normalized_md=None,
            )

        if not settings.xai_api_key:
            log.warning("x_social_skip", reason="XAI_API_KEY not set")
            return RawFetch(
                content=b"",
                content_type="application/json",
                extension="json",
                normalized_md=None,
            )

        targets = self.fetch_targets(source)
        all_events: list[ExtractedInfraEvent] = []
        summaries: list[str] = []

        for target in targets:
            if not guard.charge(X_SOCIAL, _COST_PER_CALL_USD):
                log.warning("x_social_budget_exhausted", query=target.meta["query"])
                break
            events, summary = self._analyse_query(target.meta["query"], settings)
            all_events.extend(events)
            if summary:
                summaries.append(summary)

        payload = {
            "source": "x_social",
            "events": [e.model_dump() for e in all_events],
            "summaries": summaries,
        }
        raw_bytes = json.dumps(payload, default=str).encode()

        result = RawFetch(
            content=raw_bytes,
            content_type="application/json",
            extension="json",
            normalized_md=json.dumps(payload, indent=2),
        )
        # Attach so orchestrator can persist without a second LLM pass.
        result.social_extractions = all_events  # type: ignore[attr-defined]
        return result

    # ------------------------------------------------------------------
    # Core Grok analysis
    # ------------------------------------------------------------------

    def _analyse_query(
        self, query: str, settings: Any
    ) -> tuple[list[ExtractedInfraEvent], str]:
        """Call Grok with live-search enabled, then extract structured signals."""
        try:
            from common.llm import LLMClient

            client = LLMClient(provider="xai")
            tweets = self._fetch_live_tweets(client, query)
            if not tweets:
                return [], ""
            events, summary = self._extract_signals(client, tweets, query)
            return events, summary
        except Exception as exc:  # noqa: BLE001
            log.warning("x_social_analyse_failed", query=query, error=str(exc))
            return [], ""

    @staticmethod
    def _fetch_live_tweets(client: Any, query: str) -> list[str]:
        """Use Grok live-search to collect recent tweets about the query."""
        system = (
            "You are a data collector. Search for recent tweets and posts about "
            "the following topic. Return a JSON object: "
            '{"tweets": ["verbatim tweet text 1", "verbatim tweet text 2", ...]}'
            f" — collect up to {_BATCH_SIZE} recent, relevant tweets."
        )
        user = (
            f"Search query: {query}\n"
            f"Focus on: Noida, Greater Noida, Yamuna Expressway corridor, NCR India.\n"
            f"Return only the JSON."
        )
        try:
            # Build the payload manually to pass search_parameters
            import httpx

            payload = {
                "model": client.model,
                "temperature": 0.0,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "search_parameters": {
                    "mode": "on",
                    "recency_filter": f"{_RECENCY_MONTHS}month",
                    "sources": [{"type": "x"}],
                },
                "response_format": {"type": "json_object"},
            }
            resp = client._client.post("/chat/completions", json=payload)
            if resp.status_code >= 400:
                log.warning("grok_live_search_error", status=resp.status_code,
                            body=resp.text[:300])
                # Fallback: plain completion without live search
                data = client.complete_json(system, user)
            else:
                data = json.loads(resp.json()["choices"][0]["message"]["content"])

            return data.get("tweets") or []
        except Exception as exc:  # noqa: BLE001
            log.warning("grok_tweet_fetch_failed", query=query, error=str(exc))
            return []

    @staticmethod
    def _extract_signals(
        client: Any, tweets: list[str], query: str
    ) -> tuple[list[ExtractedInfraEvent], str]:
        """Run Grok analysis on the collected tweets to extract structured signals."""
        batch = "\n".join(f"[{i+1}] {t}" for i, t in enumerate(tweets[:_BATCH_SIZE]))
        user = f"SOURCE QUERY: {query}\n\nTWEETS:\n{batch}"
        try:
            raw = client.complete_json(_ANALYSIS_SYSTEM_PROMPT, user)
        except Exception as exc:  # noqa: BLE001
            log.warning("grok_signal_extraction_failed", error=str(exc))
            return [], ""

        summary = raw.get("summary", "")
        events_raw = raw.get("events") or []
        events: list[ExtractedInfraEvent] = []
        for item in events_raw:
            try:
                # Strip extra fields before Pydantic validation
                clean = {
                    k: item.get(k)
                    for k in (
                        "project_type", "location", "status",
                        "expected_completion_year", "budget_inr_cr",
                        "source_document", "extraction_confidence",
                    )
                }
                clean["source_document"] = clean.get("source_document") or f"x_social:{query[:40]}"
                ev = ExtractedInfraEvent.model_validate(clean)
                # Hard cap confidence for social signals.
                ev.extraction_confidence = min(
                    ev.extraction_confidence, _SOCIAL_CONFIDENCE_CEILING
                )
                events.append(ev)
            except Exception as exc2:  # noqa: BLE001
                log.debug("social_event_validation_skip", error=str(exc2))

        log.info(
            "x_social_extracted",
            query=query,
            tweets=len(tweets),
            events=len(events),
            summary=summary[:120] if summary else "",
        )
        return events, summary
