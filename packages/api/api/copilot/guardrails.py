"""Copilot guardrails (blueprint §6, §0).

The MVP copilot must NOT emit predicted domain numbers (price/rent per sqft,
appreciation %, flood probability, AQI/traffic forecasts) or a builder verdict.
Those predictions are Phase 3 ML. Factual budgets already present in cited data
(e.g. a project's sanctioned ₹X cr) are allowed; forward-looking value/price
predictions are not.
"""

from __future__ import annotations

import re
from collections.abc import Sequence

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


_DIVERGENT_NUMBER = (
    "I can only report the forecast exactly as the model served it (the range and "
    "confidence shown), and can't state a different number. Here is what the model "
    "output shows instead."
)


def _numbers_in(text: str) -> list[float]:
    """Extract standalone numbers, skipping identifier-like tokens.

    Tokens that embed letters (model versions like ``price-v20260101``, units like
    ``INR/sqft``) are ignored so only free-standing figures are checked."""
    out: list[float] = []
    for tok in text.replace(",", "").split():
        if any(c.isalpha() for c in tok):  # version ids / units — not a claimed figure
            continue
        for m in re.findall(r"\d+(?:\.\d+)?", tok):
            out.append(float(m))
    return out


def numbers_match_served(text: str, served: Sequence[float], *, tol: float = 0.02) -> bool:
    """True if every 'large' number in ``text`` matches a served band value.

    Small numbers (years, list indices, percentages, counts) are ignored; only
    figures on the scale of served predictions are checked, so the copilot can
    quote a served band but never assert a *divergent* forecast number (§5/§6)."""
    if not served:
        return True
    scale = max(abs(v) for v in served) or 1.0
    for n in _numbers_in(text):
        if n < max(100.0, 0.1 * scale):  # ignore years, %, small counts
            continue
        if not any(abs(n - s) <= tol * max(abs(s), 1.0) for s in served):
            return False
    return True


def enforce(
    answer: str,
    *,
    touches_builder: bool = False,
    served_predictions: Sequence[float] | None = None,
) -> str:
    """Neutralize disallowed content. Returns a safe answer.

    When ``served_predictions`` are supplied (Phase 3), the copilot MAY quote those
    exact banded numbers but must not state a divergent forecast; builder verdicts
    are always blocked."""
    if touches_builder and contains_verdict(answer):
        return (
            "I can only report UP-RERA facts (registration, timelines, delays, "
            "complaints) with their sources — not a judgment about the builder."
        )

    if served_predictions:
        # Numbers are allowed only if they match the served envelope's band values.
        if not numbers_match_served(answer, served_predictions):
            return _DIVERGENT_NUMBER
        return answer

    # No served prediction in context -> factual view: forbid predictive numbers.
    if contains_prediction(answer):
        return f"{_REFUSAL_PREDICTION}\n\n{_strip_predictions(answer)}"
    return answer


def _strip_predictions(answer: str) -> str:
    out = answer
    for p in _PREDICTION_PATTERNS:
        out = p.sub("[prediction removed]", out)
    return out
