"""Fixture-based crawler tests (blueprint §11.1) using a mock HTTP transport.

Verifies target discovery + raw fetch/aggregation + the cheap lightweight
signal, without hitting the real (fragile) gov sites."""

from __future__ import annotations

from types import SimpleNamespace

import httpx

from common.http import HttpClient
from ingestion.crawlers.base import get_crawler
from warehouse.enums import SourceCategory

PDF_BYTES = b"%PDF-1.4 fake master plan body"
LISTING_HTML = """
<html><body>
<h1>YEIDA Master Plan</h1>
<a href="/docs/master-plan-2041.pdf">Master Plan 2041</a>
<a href="/about">About</a>
</body></html>
"""
RSS_XML = """<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>Metro line approved</title><link>http://n.test/1</link>
        <guid>1</guid><pubDate>Mon, 01 Jan 2035 00:00:00 GMT</pubDate>
        <description>New metro corridor approved near Sector 22D.</description></item>
</channel></rss>
"""


def _handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path.endswith("robots.txt"):
        return httpx.Response(200, text="User-agent: *\nAllow: /")
    if path.endswith(".pdf"):
        return httpx.Response(200, content=PDF_BYTES, headers={"content-type": "application/pdf"})
    if path.startswith("/feed"):
        return httpx.Response(
            200, content=RSS_XML.encode(), headers={"content-type": "application/rss+xml"}
        )
    if path.startswith("/api"):
        return httpx.Response(200, json={"records": [{"id": 1}]})
    return httpx.Response(200, text=LISTING_HTML, headers={"content-type": "text/html"})


def _client() -> HttpClient:
    return HttpClient(respect_robots=False, transport=httpx.MockTransport(_handler))


def _source(**cfg):
    return SimpleNamespace(
        id="src-1",
        category=SourceCategory.planning,
        refresh_cadence="monthly",
        base_url="https://gov.test/",
        config=cfg,
    )


def test_yeida_discovers_pdf_and_aggregates():
    crawler = get_crawler("yeida", http=_client())
    source = _source(document_list_urls=["https://gov.test/master-plan"])
    fetch = crawler.fetch_full(source)
    assert PDF_BYTES in fetch.content  # discovered + fetched the PDF
    assert fetch.normalized_md and "Master Plan" in fetch.normalized_md
    assert fetch.hash  # stable hash computed


def test_dmrc_aggregates_multiple_urls():
    crawler = get_crawler("dmrc", http=_client())
    source = _source(
        start_urls=["https://gov.test/metro"], tender_urls=["https://gov.test/tenders"]
    )
    fetch = crawler.fetch_full(source)
    assert fetch.content
    assert fetch.normalized_md is not None


def test_news_normalizes_feed_and_lightweight_signal():
    crawler = get_crawler("news", http=_client())
    source = _source(feeds=["https://news.test/feed"])
    fetch = crawler.fetch_full(source)
    assert fetch.normalized_md and "Metro line approved" in fetch.normalized_md
    signal = crawler.fetch_lightweight(source)
    assert signal.content_hash is not None


def test_api_crawler_fetches_json():
    crawler = get_crawler("tender", http=_client())
    source = SimpleNamespace(
        id="t",
        category=SourceCategory.tenders,
        refresh_cadence="daily",
        base_url="https://gov.test/api",
        config={"api_url": "https://gov.test/api/tenders"},
    )
    fetch = crawler.fetch_full(source)
    assert b"records" in fetch.content


def test_robots_disallow_skips_target():
    def blocking_handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("robots.txt"):
            return httpx.Response(200, text="User-agent: *\nDisallow: /")
        return httpx.Response(200, text=LISTING_HTML, headers={"content-type": "text/html"})

    client = HttpClient(respect_robots=True, transport=httpx.MockTransport(blocking_handler))
    crawler = get_crawler("ncrtc", http=client)
    source = _source(start_urls=["https://gov.test/rrts"])
    fetch = crawler.fetch_full(source)
    # everything disallowed -> aggregate is empty
    assert fetch.content == b""
