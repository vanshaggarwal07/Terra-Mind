"""Vendor-agnostic LLM client (blueprint §6).

A thin wrapper over an OpenAI-compatible chat + embeddings API. The base URL is
configurable so any compatible provider works; check pricing at build time.

The LLM is used ONLY to structure documents, explain predictions, and answer
grounded questions — never to produce domain numbers (blueprint §5).
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from common.config import get_settings
from common.logging import get_logger

log = get_logger(__name__)

_DEFAULT_BASE_URL = "https://api.openai.com/v1"


class LLMError(RuntimeError):
    pass


class LLMClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        embedding_model: str | None = None,
        base_url: str | None = None,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        s = get_settings()
        self.api_key = api_key or s.llm_api_key
        self.model = model or s.llm_model
        self.embedding_model = embedding_model or s.llm_embedding_model
        self.base_url = base_url or _DEFAULT_BASE_URL
        self._client = httpx.Client(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=60.0,
            transport=transport,
        )

    def complete_json(self, system: str, user: str, *, temperature: float = 0.0) -> dict[str, Any]:
        """Chat completion constrained to a JSON object response."""
        payload = {
            "model": self.model,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        resp = self._client.post("/chat/completions", json=payload)
        if resp.status_code >= 400:
            raise LLMError(f"LLM error {resp.status_code}: {resp.text[:500]}")
        content = resp.json()["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise LLMError(f"non-JSON LLM output: {content[:500]}") from exc

    def complete_text(self, system: str, user: str, *, temperature: float = 0.2) -> str:
        payload = {
            "model": self.model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        resp = self._client.post("/chat/completions", json=payload)
        if resp.status_code >= 400:
            raise LLMError(f"LLM error {resp.status_code}: {resp.text[:500]}")
        return resp.json()["choices"][0]["message"]["content"]

    def embed(self, texts: list[str]) -> list[list[float]]:
        payload = {"model": self.embedding_model, "input": texts}
        resp = self._client.post("/embeddings", json=payload)
        if resp.status_code >= 400:
            raise LLMError(f"embedding error {resp.status_code}: {resp.text[:500]}")
        return [item["embedding"] for item in resp.json()["data"]]

    def close(self) -> None:
        self._client.close()
