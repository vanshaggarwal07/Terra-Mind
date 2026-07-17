"""Content hashing + lightweight change signals (blueprint §3.3).

``content_hash`` is the full-content fingerprint. ``lightweight_signal`` is the
CHEAP check (HTTP validators / a small marker) used to decide whether an
expensive full re-fetch is even necessary once the TTL has expired.
"""

from __future__ import annotations

from dataclasses import dataclass

from common.hashing import content_hash as _content_hash


@dataclass(frozen=True)
class LightweightSignal:
    """A cheap freshness probe. ``content_hash`` is set when the crawler could
    derive one cheaply (e.g. from an ETag, an RSS timestamp, or a small
    'last updated' marker) without downloading/parsing the whole resource."""

    content_hash: str | None = None
    http_etag: str | None = None
    http_last_modified: str | None = None


def content_hash(data: bytes | str) -> str:
    return _content_hash(data)


def signal_matches(signal: LightweightSignal, cached_hash: str, cached_etag: str | None) -> bool:
    """True if the lightweight signal indicates the content is UNCHANGED."""
    if signal.content_hash is not None:
        return signal.content_hash == cached_hash
    if signal.http_etag is not None and cached_etag is not None:
        return signal.http_etag == cached_etag
    # No usable signal -> we cannot claim unchanged; force a full fetch.
    return False
