"""Copilot guardrails (blueprint §6, §0).

The MVP copilot must NOT emit predicted domain numbers (price/rent per sqft,
appreciation %, flood probability, AQI/traffic forecasts) or a builder verdict.
Those predictions are Phase 3 ML. Factual budgets already present in cited data
(e.g. a project's sanctioned ₹X cr) are allowed; forward-looking value/price
predictions are not.
"""

from __future__ import annotations

import re

# Forward-looking / predictive numeric claims that the MVP copilot may not make.
_PREDICTION_PATTERNS = [
    re.compile(r"₹?\s*[\d,]+(?:\.\d+)?\s*(?:per|/)\s*(?:sq\.?\s?ft|sqft|square\s?feet)", re.I),
    re.compile(r"\b\d+(?:\.\d+)?\s*%\s*(?:appreciation|growth|returns?|increase|hike)", re.I),
    re.compile(r"\b(?:price|rent|value)\s+will\s+(?:be|reach|rise|grow|increase)", re.I),
    re.compile(r"\bflood\s+(?:probability|risk)\s+(?:is|of)\s+\d", re.I),
    re.compile(r"\b(?:aqi|traffic)\s+(?:will|forecast|predicted)", re.I),
]

# Verdict/judgment language about builders (facts, not verdicts — §0/§13).
_VERDICT_PATTERNS = [
    re.compile(r"\b(?:trustworthy|reliable|avoid|scam|fraud|best|worst|recommend(?:ed)?)\b", re.I),
    re.compile(r"\b(?:safe|risky)\s+builder\b", re.I),
]

_REFUSAL_PREDICTION = (
    "I can't provide price, rent, flood, or traffic predictions yet — those come "
    "from the forecasting models (not available in this factual view). Here is "
    "what the cited records show instead."
)


def contains_prediction(text: str) -> bool:
    return any(p.search(text) for p in _PREDICTION_PATTERNS)


def contains_verdict(text: str) -> bool:
    return any(p.search(text) for p in _VERDICT_PATTERNS)


def enforce(answer: str, *, touches_builder: bool = False) -> str:
    """Neutralize disallowed content. Returns a safe answer."""
    if contains_prediction(answer):
        return f"{_REFUSAL_PREDICTION}\n\n{_strip_predictions(answer)}"
    if touches_builder and contains_verdict(answer):
        return (
            "I can only report UP-RERA facts (registration, timelines, delays, "
            "complaints) with their sources — not a judgment about the builder."
        )
    return answer


def _strip_predictions(answer: str) -> str:
    out = answer
    for p in _PREDICTION_PATTERNS:
        out = p.sub("[prediction removed]", out)
    return out
