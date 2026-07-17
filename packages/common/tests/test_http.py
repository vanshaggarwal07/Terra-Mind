import time

import httpx
import pytest

from common.http import HttpClient, TokenBucket


def test_token_bucket_rate_limits():
    # capacity 1, rate 5/s -> 3 sequential acquires take ~ (3-1)/5 = 0.4s
    bucket = TokenBucket(rate_per_sec=5.0, capacity=1.0)
    start = time.monotonic()
    for _ in range(3):
        bucket.acquire()
    elapsed = time.monotonic() - start
    assert elapsed >= 0.3


def test_user_agent_is_sent():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["ua"] = request.headers.get("User-Agent")
        return httpx.Response(200, text="ok")

    client = HttpClient(
        user_agent="TestBot/9.9 (+contact)",
        respect_robots=False,
        transport=httpx.MockTransport(handler),
    )
    resp = client.get("https://example.com/")
    assert resp.status_code == 200
    assert seen["ua"] == "TestBot/9.9 (+contact)"


def test_backoff_retries_on_429_then_succeeds():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(429, text="slow down")
        return httpx.Response(200, text="ok")

    client = HttpClient(
        respect_robots=False,
        max_retries=5,
        backoff_base=0.001,
        transport=httpx.MockTransport(handler),
    )
    resp = client.get("https://example.com/")
    assert resp.status_code == 200
    assert calls["n"] == 3


def test_conditional_get_sends_validators():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["inm"] = request.headers.get("If-None-Match")
        seen["ims"] = request.headers.get("If-Modified-Since")
        return httpx.Response(304)

    client = HttpClient(respect_robots=False, transport=httpx.MockTransport(handler))
    resp = client.conditional_get(
        "https://example.com/", etag='"abc"', last_modified="Wed, 21 Oct 2015 07:28:00 GMT"
    )
    assert resp.status_code == 304
    assert seen["inm"] == '"abc"'
    assert seen["ims"] == "Wed, 21 Oct 2015 07:28:00 GMT"


def test_robots_block_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text="User-agent: *\nDisallow: /secret")
        return httpx.Response(200, text="ok")

    client = HttpClient(respect_robots=True, transport=httpx.MockTransport(handler))
    with pytest.raises(PermissionError):
        client.get("https://example.com/secret/page")
