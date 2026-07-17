"""Resilient HTTP client for crawlers (blueprint §3.1).

Guarantees, so no crawler has to re-implement them:
  * per-host token-bucket rate limiting,
  * exponential backoff with jitter on 429 / 5xx,
  * an honest, identifiable User-Agent on every request,
  * robots.txt awareness,
  * conditional-request helpers (ETag / Last-Modified).

Every government-site crawler MUST go through this client (enforced in CI by
the compliance layer, P5.5).
"""

from __future__ import annotations

import random
import threading
import time
import urllib.robotparser
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

from common.config import get_settings
from common.logging import get_logger

log = get_logger(__name__)

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class TokenBucket:
    """Simple thread-safe token bucket for per-host rate limiting."""

    def __init__(self, rate_per_sec: float, capacity: float | None = None) -> None:
        self.rate = max(rate_per_sec, 0.0001)
        self.capacity = capacity if capacity is not None else max(rate_per_sec, 1.0)
        self._tokens = self.capacity
        self._last = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self, tokens: float = 1.0) -> None:
        with self._lock:
            while True:
                now = time.monotonic()
                elapsed = now - self._last
                self._last = now
                self._tokens = min(self.capacity, self._tokens + elapsed * self.rate)
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return
                deficit = tokens - self._tokens
                time.sleep(deficit / self.rate)


@dataclass
class RateLimiter:
    """Holds one token bucket per host."""

    default_rate: float
    _buckets: dict[str, TokenBucket] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def bucket_for(self, host: str, rate: float | None = None) -> TokenBucket:
        with self._lock:
            if host not in self._buckets:
                self._buckets[host] = TokenBucket(rate or self.default_rate)
            return self._buckets[host]

    def acquire(self, url: str, rate: float | None = None) -> None:
        host = urlparse(url).netloc
        self.bucket_for(host, rate).acquire()


class HttpClient:
    """Thin wrapper over httpx.Client with the guarantees above."""

    def __init__(
        self,
        *,
        user_agent: str | None = None,
        rate_limit_per_sec: float | None = None,
        max_retries: int | None = None,
        backoff_base: float | None = None,
        respect_robots: bool = True,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        settings = get_settings()
        self.user_agent = user_agent or settings.http_user_agent
        self.max_retries = max_retries if max_retries is not None else settings.http_max_retries
        self.backoff_base = (
            backoff_base if backoff_base is not None else settings.http_backoff_base_seconds
        )
        self.respect_robots = respect_robots
        self.rate_limiter = RateLimiter(
            rate_limit_per_sec or settings.http_default_rate_limit_per_sec
        )
        self._client = httpx.Client(
            headers={"User-Agent": self.user_agent},
            follow_redirects=True,
            timeout=30.0,
            transport=transport,
        )
        self._robots_cache: dict[str, urllib.robotparser.RobotFileParser | None] = {}

    # -- robots.txt ----------------------------------------------------------
    def _robots(self, url: str) -> urllib.robotparser.RobotFileParser | None:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        if base not in self._robots_cache:
            rp = urllib.robotparser.RobotFileParser()
            # Fetch via our own httpx client so rate limits / UA / test
            # transports all apply (urllib.read() would bypass them).
            try:
                self.rate_limiter.acquire(f"{base}/robots.txt")
                resp = self._client.get(f"{base}/robots.txt")
                if resp.status_code >= 400:
                    self._robots_cache[base] = None
                else:
                    rp.parse(resp.text.splitlines())
                    self._robots_cache[base] = rp
            except Exception:  # noqa: BLE001 - robots unreachable => allow, but log
                log.warning("robots_unreachable", base=base)
                self._robots_cache[base] = None
        return self._robots_cache[base]

    def is_allowed(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        rp = self._robots(url)
        if rp is None:
            return True
        return rp.can_fetch(self.user_agent, url)

    # -- requests ------------------------------------------------------------
    def request(
        self, method: str, url: str, *, rate: float | None = None, **kwargs
    ) -> httpx.Response:
        if self.respect_robots and not self.is_allowed(url):
            raise PermissionError(f"Blocked by robots.txt: {url}")

        attempt = 0
        while True:
            self.rate_limiter.acquire(url, rate)
            try:
                resp = self._client.request(method, url, **kwargs)
            except httpx.TransportError as exc:
                if attempt >= self.max_retries:
                    raise
                self._sleep_backoff(attempt)
                log.warning("http_transport_retry", url=url, attempt=attempt, error=str(exc))
                attempt += 1
                continue

            if resp.status_code in _RETRYABLE_STATUS and attempt < self.max_retries:
                self._sleep_backoff(attempt, resp)
                log.warning("http_retry", url=url, status=resp.status_code, attempt=attempt)
                attempt += 1
                continue
            return resp

    def get(self, url: str, **kwargs) -> httpx.Response:
        return self.request("GET", url, **kwargs)

    def head(self, url: str, **kwargs) -> httpx.Response:
        return self.request("HEAD", url, **kwargs)

    # -- conditional requests ------------------------------------------------
    def conditional_get(
        self, url: str, *, etag: str | None = None, last_modified: str | None = None, **kwargs
    ) -> httpx.Response:
        """GET with If-None-Match / If-Modified-Since. A 304 means unchanged."""
        headers = dict(kwargs.pop("headers", {}))
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified
        return self.get(url, headers=headers, **kwargs)

    def _sleep_backoff(self, attempt: int, resp: httpx.Response | None = None) -> None:
        if resp is not None and (ra := resp.headers.get("Retry-After")):
            try:
                time.sleep(float(ra))
                return
            except ValueError:
                pass
        delay = self.backoff_base * (2**attempt) + random.uniform(0, self.backoff_base)
        time.sleep(delay)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> HttpClient:
        return self

    def __exit__(self, *exc) -> None:
        self.close()
