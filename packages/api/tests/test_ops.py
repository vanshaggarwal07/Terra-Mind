"""Unified ops surface tests (P5.3/P5.4): health, metrics, costs."""

from __future__ import annotations

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_health_reports_per_service_status():
    body = client.get("/ops/health").json()
    assert "status" in body
    assert {"api", "database", "models"}.issubset(body["services"])
    # DB unavailable in the unit env -> degraded, but the probe never 500s
    assert body["services"]["api"] == "ok"


def test_costs_lists_budgeted_line_items():
    body = client.get("/ops/costs").json()
    names = {li["name"] for li in body["line_items"]}
    assert names == {"x_social", "satellite", "gpu"}
    # each item exposes spend vs cap for the dashboard
    for li in body["line_items"]:
        assert "spend_usd" in li and "cap_usd" in li and "burn_rate" in li


def test_metrics_consolidates_all_surfaces():
    body = client.get("/ops/metrics").json()
    assert "crawl" in body and "cache" in body
    assert "review_queue" in body
    assert "models" in body  # ML status consolidated
    assert "costs" in body  # cost dashboard consolidated
