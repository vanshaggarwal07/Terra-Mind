"""Copilot ML-explanation tests (P3.9): quote served band, block divergent numbers."""

from __future__ import annotations

from api.copilot import guardrails
from api.copilot.schemas import PredictionContext, RetrievedContext
from api.copilot.service import CopilotService
from warehouse.schemas import ContributingFactor, LocalityRead, PredictionEnvelope


class FakeRetriever:
    def __init__(self, ctx: RetrievedContext) -> None:
        self._ctx = ctx

    def retrieve(self, query: str, *, locality_id=None) -> RetrievedContext:
        return self._ctx


class FakeAnswerer:
    def __init__(self, reply: str) -> None:
        self.reply = reply
        self.calls = 0

    def complete_text(self, system: str, user: str, *, temperature: float = 0.0) -> str:
        self.calls += 1
        self.last_user = user
        return self.reply


def _price_env() -> PredictionEnvelope:
    return PredictionEnvelope(
        prediction=8000.0,
        prediction_low=7000.0,
        prediction_high=9000.0,
        confidence=0.6,
        contributing_factors=[ContributingFactor(factor="distance to metro", weight=0.5)],
        model_version="price-v20260101",
        unit="INR/sqft",
        horizon="1-5yr",
        disclaimer="Estimate, not investment advice.",
    )


def _ctx_with_prediction() -> RetrievedContext:
    return RetrievedContext(
        locality=LocalityRead(id="loc-01", name="Sector X"),
        predictions=[PredictionContext(domain="price", envelope=_price_env())],
    )


def test_prediction_rendered_into_prompt_with_model_version():
    answerer = FakeAnswerer("The model's range is 7000-9000 INR/sqft [1].")
    svc = CopilotService(FakeRetriever(_ctx_with_prediction()), answerer)
    result = svc.answer("What's the price outlook for Sector X?")
    assert result.grounded is True
    assert "MODEL FORECASTS" in answerer.last_user
    assert "price-v20260101" in answerer.last_user


def test_copilot_may_quote_the_served_band():
    answerer = FakeAnswerer(
        "Per model price-v20260101, the estimate is a range of 7000-9000 INR/sqft "
        "(confidence 0.6), driven by distance to metro."
    )
    svc = CopilotService(FakeRetriever(_ctx_with_prediction()), answerer)
    result = svc.answer("price outlook?")
    assert "7000-9000" in result.answer  # served band preserved
    assert result.refused is False


def test_copilot_cannot_state_a_divergent_number():
    answerer = FakeAnswerer("Prices will reach 15000 per sqft next year.")
    svc = CopilotService(FakeRetriever(_ctx_with_prediction()), answerer)
    result = svc.answer("price outlook?")
    assert "15000" not in result.answer
    assert "different number" in result.answer.lower()


def test_numbers_match_served_helper():
    served = [8000.0, 7000.0, 9000.0]
    assert guardrails.numbers_match_served("range 7000-9000", served) is True
    assert guardrails.numbers_match_served("it will be 15000", served) is False
    # version digits / small numbers are ignored
    assert guardrails.numbers_match_served("model price-v20260101 at 0.6 conf", served) is True


def test_builder_verdict_still_blocked_even_with_predictions():
    from warehouse.schemas import BuilderRead

    ctx = _ctx_with_prediction()
    ctx.builder = BuilderRead(id="b1", name="ABC", rera_id="X")
    answerer = FakeAnswerer("ABC is the best, most trustworthy builder. Range 7000-9000.")
    svc = CopilotService(FakeRetriever(ctx), answerer)
    result = svc.answer("is ABC good and what's the price?")
    assert "trustworthy" not in result.answer.lower()
