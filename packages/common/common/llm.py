"""Vendor-agnostic LLM client (blueprint §6).

Thin wrapper over any OpenAI-compatible chat + embeddings API.
Provider priority:
  1. xAI Grok  — if XAI_API_KEY is set (used for copilot + social analysis)
  2. OpenAI    — fallback / used for embeddings (Grok doesn't embed yet)

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

_OPENAI_BASE = "https://api.openai.com/v1"
_XAI_BASE = "https://api.x.ai/v1"


class LLMError(RuntimeError):
    pass


class LLMClient:
    """OpenAI-compatible client.  Defaults to xAI Grok when XAI_API_KEY is
    configured, falling back to OpenAI for embeddings (Grok's embedding
    endpoint is not yet GA)."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        embedding_model: str | None = None,
        base_url: str | None = None,
        transport: httpx.BaseTransport | None = None,
        # Force a specific provider regardless of settings
        provider: str | None = None,
    ) -> None:
        s = get_settings()

        # Determine which provider to use for completions
        use_grok = (provider == "xai") or (
            provider is None and bool(s.xai_api_key and s.xai_api_key != "changeme" and s.xai_api_key)
        )

        if use_grok:
            self.api_key = api_key or s.xai_api_key
            self.model = model or s.xai_model
            self.base_url = base_url or s.xai_base_url
            self._provider = "xai"
        else:
            self.api_key = api_key or s.llm_api_key
            self.model = model or s.llm_model
            self.base_url = base_url or _OPENAI_BASE
            self._provider = "openai"

        # Embeddings always use OpenAI (Grok embeddings not yet GA)
        self._embed_api_key = s.llm_api_key
        self.embedding_model = embedding_model or s.llm_embedding_model

        self._client = httpx.Client(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=60.0,
            transport=transport,
        )
        # Separate embed client only needed when provider != openai
        self._embed_client: httpx.Client | None = None
        if self._provider == "xai":
            self._embed_client = httpx.Client(
                base_url=_OPENAI_BASE,
                headers={"Authorization": f"Bearer {self._embed_api_key}"},
                timeout=30.0,
                transport=transport,
            )

        log.info("llm_client_init", provider=self._provider, model=self.model)

    # ------------------------------------------------------------------ chat

    def complete_json(
        self, system: str, user: str, *, temperature: float = 0.0
    ) -> dict[str, Any]:
        """Chat completion constrained to a JSON object response."""
        payload: dict[str, Any] = {
            "model": self.model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        # xAI Grok supports response_format; keep parity
        if self._provider == "xai":
            # Grok-3 supports JSON mode
            payload["response_format"] = {"type": "json_object"}
        else:
            payload["response_format"] = {"type": "json_object"}

        resp = self._client.post("/chat/completions", json=payload)
        if resp.status_code >= 400:
            raise LLMError(f"LLM error {resp.status_code} ({self._provider}): {resp.text[:500]}")
        content = resp.json()["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise LLMError(f"non-JSON LLM output: {content[:500]}") from exc

    def complete_text(
        self, system: str, user: str, *, temperature: float = 0.2
    ) -> str:
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
            raise LLMError(f"LLM error {resp.status_code} ({self._provider}): {resp.text[:500]}")
        return resp.json()["choices"][0]["message"]["content"]

    def complete_streaming(self, system: str, user: str) -> str:
        """Streaming completion — collects all chunks and returns full text.
        Used by the copilot stream endpoint."""
        payload = {
            "model": self.model,
            "temperature": 0.2,
            "stream": True,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        chunks: list[str] = []
        with self._client.stream("POST", "/chat/completions", json=payload) as resp:
            if resp.status_code >= 400:
                raise LLMError(f"stream error {resp.status_code}")
            for line in resp.iter_lines():
                if not line or line == "data: [DONE]":
                    continue
                if line.startswith("data: "):
                    try:
                        delta = json.loads(line[6:])["choices"][0]["delta"].get("content", "")
                        if delta:
                            chunks.append(delta)
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        return "".join(chunks)

    # --------------------------------------------------------------- embeddings

    def embed(self, texts: list[str]) -> list[list[float]]:
        client = self._embed_client or self._client
        payload = {"model": self.embedding_model, "input": texts}
        resp = client.post("/embeddings", json=payload)
        if resp.status_code >= 400:
            raise LLMError(f"embedding error {resp.status_code}: {resp.text[:500]}")
        return [item["embedding"] for item in resp.json()["data"]]

    # --------------------------------------------------------------- lifecycle

    def close(self) -> None:
        self._client.close()
        if self._embed_client:
            self._embed_client.close()

    @property
    def provider(self) -> str:
        return self._provider
