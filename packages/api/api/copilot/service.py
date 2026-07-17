"""Copilot orchestration (blueprint §6).

parse query -> retrieve grounded context -> if empty, refuse honestly (no LLM
call) -> else assemble cited context -> LLM answers strictly from it -> enforce
guardrails -> return answer + citations. Streaming is supported for the chat UI.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol

from api.copilot import guardrails
from api.copilot.prompt import SYSTEM_PROMPT, build_context_block, build_user_prompt
from api.copilot.retrieval import Retriever
from api.copilot.schemas import CopilotAnswer, RetrievedContext
from common.logging import get_logger

log = get_logger(__name__)

REFUSAL = "I don't have that in my data."


class Answerer(Protocol):
    def complete_text(self, system: str, user: str, *, temperature: float = 0.0) -> str: ...


class CopilotService:
    def __init__(self, retriever: Retriever, answerer: Answerer | None = None) -> None:
        self.retriever = retriever
        self._answerer = answerer

    def _get_answerer(self) -> Answerer:
        if self._answerer is None:
            from common.llm import LLMClient

            self._answerer = LLMClient()
        return self._answerer

    def answer(self, query: str, *, locality_id: str | None = None) -> CopilotAnswer:
        ctx = self.retriever.retrieve(query, locality_id=locality_id)

        # Grounding guarantee: no context -> refuse WITHOUT calling the LLM.
        if ctx.is_empty():
            return CopilotAnswer(answer=REFUSAL, citations=[], grounded=False, refused=True)

        context_block, citations = build_context_block(ctx)
        user = build_user_prompt(query, context_block)
        raw = self._get_answerer().complete_text(SYSTEM_PROMPT, user, temperature=0.0)

        safe = guardrails.enforce(raw, touches_builder=ctx.builder is not None)
        refused = safe.strip().startswith(REFUSAL) or REFUSAL.lower() in safe.lower()
        return CopilotAnswer(
            answer=safe,
            citations=citations,
            grounded=True,
            refused=refused,
        )

    def stream(self, query: str, *, locality_id: str | None = None) -> Iterator[str]:
        """Yield the answer in chunks for the chat UI. (Guardrails applied to the
        assembled answer, so we compute then chunk.)"""
        result = self.answer(query, locality_id=locality_id)
        # Emit word-by-word to drive the streaming UI.
        for token in result.answer.split(" "):
            yield token + " "

    def context_for(self, query: str, *, locality_id: str | None = None) -> RetrievedContext:
        return self.retriever.retrieve(query, locality_id=locality_id)
