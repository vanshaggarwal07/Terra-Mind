"""Content hashing for the Search -> Cache -> Verify layer (blueprint §3.3).

A stable content hash lets duplicate fetches collapse to one cache entry and
lets the verify step detect real changes cheaply.
"""

from __future__ import annotations

import hashlib


def content_hash(data: bytes | str) -> str:
    """Return the SHA-256 hex digest of the given content."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def short_hash(data: bytes | str, length: int = 12) -> str:
    """A truncated hash, handy for object-storage key readability."""
    return content_hash(data)[:length]
