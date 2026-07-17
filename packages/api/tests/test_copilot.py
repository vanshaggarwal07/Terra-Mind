"""Copilot tests (blueprint §6): grounding, honest refusal, guardrails."""

from __future__ import annotations

from api.copilot import guardrails
from api.copilot.schemas import ChunkHit, RetrievedContext
from api.copilot.service import REFUSAL, CopilotService
from warehouse.schemas import BuilderRead, Citation, InfraEventRead, LocalityRead


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


def _fact():
    return InfraEventRead(
        id="e1", type="metro", status="approved", expected_year=2027,
        confidence=0.9, source_tier="official", verified=True, distance_km=1.2,
        citation=Citation(source_id="s1", source_name="YEIDA", source_document="https://y/m.pdf"),
    )


def _ctx_with_facts():
    return RetrievedContext(
        locality=LocalityRead(id="l1", name="Sector 22D"),
        facts=[_fact()],
        chunks=[ChunkHit(chunk_id="c1", text="Metro extension approved.",
                         citation=Citation(source_id="s1", source_name="YEIDA"))],
    )


def test_empty_context_refuses_without_calling_llm():
    answerer = FakeAnswerer("should not be called")
    svc = CopilotService(FakeRetriever(RetrievedContext()), answerer)
    result = svc.answer("What about Atlantis?")
    assert result.refused is True
    assert result.grounded is False
    assert result.answer == REFUSAL
    assert answerer.calls == 0  # never fabricates


def test_grounded_answer_has_citations_and_calls_llm():
    answerer = FakeAnswerer("The metro extension is approved [1].")
    svc = CopilotService(FakeRetriever(_ctx_with_facts()), answerer)
    result = svc.answer("What infra is near Sector 22D?")
    assert result.grounded is True
    assert answerer.calls == 1
    assert len(result.citations) >= 1
    # context block with numbered citations was passed to the LLM
    assert "VERIFIED INFRASTRUCTURE FACTS" in answerer.last_user


def test_price_prediction_is_neutralized():
    answerer = FakeAnswerer("Prices will reach ₹12,000 per sqft by 2027.")
    svc = CopilotService(FakeRetriever(_ctx_with_facts()), answerer)
    result = svc.answer("Will prices go up?")
    assert "12,000 per sqft" not in result.answer or "[prediction removed]" in result.answer
    assert "can't provide price" in result.answer.lower()


def test_builder_verdict_is_neutralized():
    ctx = RetrievedContext(
        builder=BuilderRead(id="b1", name="ABC Developers", rera_id="UPRERA123")
    )
    answerer = FakeAnswerer("ABC Developers is a trustworthy, reliable builder you should trust.")
    svc = CopilotService(FakeRetriever(ctx), answerer)
    result = svc.answer("Is ABC Developers good?")
    assert "trustworthy" not in result.answer.lower()
    assert "up-rera facts" in result.answer.lower()


def test_guardrail_detectors():
    assert guardrails.contains_prediction("₹8,500 per sqft expected")
    assert guardrails.contains_prediction("20% appreciation next year")
    assert guardrails.contains_verdict("this is the best builder")
    assert not guardrails.contains_prediction("the sanctioned budget was 1200 cr")


def test_streaming_yields_tokens():
    answerer = FakeAnswerer("Metro extension approved near Sector 22D [1].")
    svc = CopilotService(FakeRetriever(_ctx_with_facts()), answerer)
    tokens = list(svc.stream("infra near 22D?"))
    assert "".join(tokens).strip().startswith("Metro")
