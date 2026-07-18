"""Satellite fetcher tests (P4.3): tile pairs, storage keys, Bhuvan fallback."""

from __future__ import annotations

from types import SimpleNamespace

import httpx

from common.http import HttpClient
from ingestion.crawlers.base import get_crawler
from warehouse.enums import SourceCategory

TILE = b"FAKE-SENTINEL-TILE"
FALLBACK_TILE = b"FAKE-BHUVAN-TILE"

CFG = {
    "tile_url_template": "https://copernicus.test/tile?bbox={bbox}&date={date}&loc={locality_id}",
    "fallback_url_template": "https://bhuvan.test/tile?bbox={bbox}&date={date}&loc={locality_id}",
    "localities": [
        {"id": "loc-00", "min_lng": 77.30, "min_lat": 28.40, "max_lng": 77.32, "max_lat": 28.42},
    ],
    "reference_date": "2024-01-01",
    "baseline_offset_days": 182,
}


def _source(cfg=CFG):
    return SimpleNamespace(
        id="sat-1",
        category=SourceCategory.satellite,
        refresh_cadence="5-10 days",
        base_url="https://dataspace.copernicus.eu/",
        config=cfg,
    )


def _client(*, copernicus_down=False) -> HttpClient:
    def handler(request: httpx.Request) -> httpx.Response:
        host = request.url.host
        if host == "copernicus.test":
            if copernicus_down:
                return httpx.Response(503, text="quota")
            return httpx.Response(200, content=TILE, headers={"content-type": "image/tiff"})
        if host == "bhuvan.test":
            return httpx.Response(
                200, content=FALLBACK_TILE, headers={"content-type": "image/tiff"}
            )
        return httpx.Response(404)

    return HttpClient(respect_robots=False, transport=httpx.MockTransport(handler))


def _older_date() -> str:
    import datetime as dt

    return (dt.date(2024, 1, 1) - dt.timedelta(days=182)).isoformat()


def test_fetch_targets_builds_current_and_older_per_locality():
    crawler = get_crawler("satellite", http=_client())
    targets = crawler.fetch_targets(_source())
    roles = sorted(t.meta["role"] for t in targets)
    assert roles == ["current", "older"]
    dates = {t.meta["role"]: t.meta["capture_date"] for t in targets}
    assert dates["current"] == "2024-01-01"
    assert dates["older"] == _older_date()  # 182 days earlier


def test_fetch_pairs_stores_tiles_and_returns_refs():
    crawler = get_crawler("satellite", http=_client())
    store: dict[str, bytes] = {}
    refs = crawler.fetch_pairs(_source(), storage_put=lambda k, b: store.setdefault(k, b))
    assert len(refs) == 1
    ref = refs[0]
    assert ref.current_key == "satellite/loc-00/2024-01-01.tif"
    assert ref.older_key == f"satellite/loc-00/{_older_date()}.tif"
    assert store[ref.current_key] == TILE
    assert ref.used_fallback is False


def test_bhuvan_fallback_used_when_copernicus_down():
    crawler = get_crawler("satellite", http=_client(copernicus_down=True))
    store: dict[str, bytes] = {}
    refs = crawler.fetch_pairs(_source(), storage_put=lambda k, b: store.setdefault(k, b))
    assert len(refs) == 1
    assert refs[0].used_fallback is True
    assert store[refs[0].current_key] == FALLBACK_TILE  # served from Bhuvan


def test_satellite_registered_in_fleet():
    from ingestion.crawlers.base import is_registered

    assert is_registered("satellite")


# --- P5.4 budget guard wiring -------------------------------------------------
_MULTI_CFG = {
    **CFG,
    "cost_per_pair_usd": 0.03,
    "localities": [
        {
            "id": f"loc-{i:02d}",
            "min_lng": 77.30,
            "min_lat": 28.40,
            "max_lng": 77.32,
            "max_lat": 28.42,
        }
        for i in range(3)
    ],
}


def test_disabled_satellite_budget_blocks_all_fetches():
    from common.budget import SATELLITE, BudgetGuard

    guard = BudgetGuard(caps={SATELLITE: 100.0}, enabled={SATELLITE: False})
    crawler = get_crawler("satellite", http=_client())
    store: dict[str, bytes] = {}
    refs = crawler.fetch_pairs(
        _source(_MULTI_CFG), storage_put=lambda k, b: store.setdefault(k, b), budget=guard
    )
    assert refs == []  # feature off -> fails safe, no fetches, no spend
    assert store == {}


def test_satellite_budget_cap_stops_fetching():
    from common.budget import SATELLITE, BudgetGuard

    # cap only affords one pair (0.03) before the second (0.06) trips it
    guard = BudgetGuard(caps={SATELLITE: 0.05}, enabled={SATELLITE: True})
    crawler = get_crawler("satellite", http=_client())
    store: dict[str, bytes] = {}
    refs = crawler.fetch_pairs(
        _source(_MULTI_CFG), storage_put=lambda k, b: store.setdefault(k, b), budget=guard
    )
    assert len(refs) == 1  # stopped at the cap — never overspends
    assert guard.spend(SATELLITE) <= 0.05
