"""Chunk embeddings for the vector index (blueprint §3.3 / §3.4).

``LLMEmbedder`` calls the embeddings API; ``HashingEmbedder`` is a deterministic
offline embedder (for tests) producing vectors of the configured dimension.
"""

from __future__ import annotations

import hashlib
import struct
from typing import Protocol

from common.config import get_settings


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...

    @property
    def dim(self) -> int: ...


class LLMEmbedder:
    def __init__(self, client=None) -> None:  # noqa: ANN001
        self._client = client
        self._dim = get_settings().llm_embedding_dim

    def _get_client(self):  # noqa: ANN202
        if self._client is None:
            from common.llm import LLMClient

            self._client = LLMClient()
        return self._client

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        return self._get_client().embed(texts)


class HashingEmbedder:
    """Deterministic pseudo-embeddings from a hash. Not semantic — tests only."""

    def __init__(self, dim: int | None = None) -> None:
        self._dim = dim or get_settings().llm_embedding_dim

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._one(t) for t in texts]

    def _one(self, text: str) -> list[float]:
        out: list[float] = []
        counter = 0
        while len(out) < self._dim:
            h = hashlib.sha256(f"{counter}:{text}".encode()).digest()
            for i in range(0, len(h), 4):
                if len(out) >= self._dim:
                    break
                (val,) = struct.unpack("I", h[i : i + 4])
                out.append((val / 2**32) * 2 - 1)  # in [-1, 1]
            counter += 1
        return out
