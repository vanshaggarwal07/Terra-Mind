"""Sentinel-2 satellite fetcher with Bhuvan fallback (blueprint §3.5, P4.3).

Pulls T0 (current) vs T-6mo tile PAIRS for each tracked locality on a cadence
matching the ~5-10 day revisit cycle (§3.3). Tiles go to object storage keyed by
``{locality_id}/{capture_date}``. Copernicus (Sentinel-2) is primary; Bhuvan (ISRO)
is the India-specific fallback, exercised per-target when the primary fails.

Config-driven (never hardcoded): ``sources.config`` supplies the tile URL
templates and the tracked locality bounding boxes.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any

from common.logging import get_logger
from ingestion.crawlers.base import BaseCrawler, Target, register_crawler

log = get_logger(__name__)

_DEFAULT_BASELINE_OFFSET_DAYS = 182  # ~6 months
_DEFAULT_REVISIT_DAYS = 7


@dataclass
class TilePairRef:
    """Object-storage references to a stored T0/T-6mo tile pair for a locality."""

    locality_id: str
    current_key: str
    older_key: str
    current_date: str
    older_date: str
    used_fallback: bool = False
    meta: dict[str, Any] = field(default_factory=dict)


@register_crawler("satellite")
class SatelliteFetcher(BaseCrawler):
    def _reference_date(self, source: Any) -> dt.date:
        cfg = self._config(source)
        ref = cfg.get("reference_date")
        return dt.date.fromisoformat(ref) if ref else dt.date.today()

    def _bbox(self, loc: dict[str, Any]) -> str:
        return f"{loc['min_lng']},{loc['min_lat']},{loc['max_lng']},{loc['max_lat']}"

    def _url(self, template: str | None, loc: dict[str, Any], date: dt.date) -> str | None:
        if not template:
            return None
        return template.format(bbox=self._bbox(loc), date=date.isoformat(), locality_id=loc["id"])

    def fetch_targets(self, source: Any) -> list[Target]:
        cfg = self._config(source)
        localities: list[dict[str, Any]] = cfg.get("localities", [])
        primary_tpl = cfg.get("tile_url_template")
        fallback_tpl = cfg.get("fallback_url_template")
        ref = self._reference_date(source)
        offset = int(cfg.get("baseline_offset_days", _DEFAULT_BASELINE_OFFSET_DAYS))
        older_date = ref - dt.timedelta(days=offset)

        targets: list[Target] = []
        for loc in localities:
            for role, date in (("current", ref), ("older", older_date)):
                url = self._url(primary_tpl, loc, date)
                if not url:
                    continue
                targets.append(
                    Target(
                        url=url,
                        kind="tile",
                        meta={
                            "locality_id": loc["id"],
                            "capture_date": date.isoformat(),
                            "role": role,
                            "fallback_url": self._url(fallback_tpl, loc, date),
                        },
                    )
                )
        return targets

    def fetch_raw(self, target: Target) -> tuple[bytes, str, str | None, str | None]:
        """Try Copernicus first; fall back to Bhuvan on failure (§3.5)."""
        try:
            resp = self.http.get(target.url)
            resp.raise_for_status()
            return (
                resp.content,
                resp.headers.get("content-type", "image/tiff"),
                resp.headers.get("etag"),
                resp.headers.get("last-modified"),
            )
        except Exception as exc:  # noqa: BLE001 - primary source may be down/quota'd
            fallback = target.meta.get("fallback_url")
            if not fallback:
                raise
            log.warning("satellite_primary_failed_using_fallback", url=target.url, error=str(exc))
            resp = self.http.get(fallback)
            resp.raise_for_status()
            target.meta["used_fallback"] = True
            return (
                resp.content,
                resp.headers.get("content-type", "image/tiff"),
                resp.headers.get("etag"),
                resp.headers.get("last-modified"),
            )

    def normalize(self, target: Target, content: bytes, content_type: str) -> str | None:
        return None  # binary raster; no markdown tier

    def fetch_pairs(
        self,
        source: Any,
        *,
        storage_put=None,  # noqa: ANN001
        budget=None,  # noqa: ANN001 - common.budget.BudgetGuard (optional; enforces cost cap)
    ) -> list[TilePairRef]:
        """Fetch + store T0/T-6mo tile pairs per locality; return their storage refs.

        If a ``budget`` guard is supplied (P5.4), each pair is charged against the
        satellite monthly cap; when the cap is hit (or satellite is disabled) the
        fetch stops — failing safe rather than overspending (§9/§13)."""
        put = storage_put or _default_storage_put
        cfg = self._config(source)
        cost_per_pair = float(cfg.get("cost_per_pair_usd", 0.0))
        targets = self.fetch_targets(source)
        by_locality: dict[str, dict[str, Target]] = {}
        for t in targets:
            by_locality.setdefault(t.meta["locality_id"], {})[t.meta["role"]] = t

        refs: list[TilePairRef] = []
        for locality_id, roles in by_locality.items():
            cur_t, old_t = roles.get("current"), roles.get("older")
            if cur_t is None or old_t is None:
                continue
            if budget is not None:
                from common.budget import SATELLITE

                if not budget.charge(SATELLITE, cost_per_pair):
                    log.warning("satellite_budget_stop", locality_id=locality_id)
                    break  # cap hit / disabled -> stop fetching (fail safe)
            try:
                cur_bytes, *_ = self.fetch_raw(cur_t)
                old_bytes, *_ = self.fetch_raw(old_t)
            except Exception as exc:  # noqa: BLE001 - isolate one bad locality
                log.warning("satellite_pair_failed", locality_id=locality_id, error=str(exc))
                continue
            cur_key = f"satellite/{locality_id}/{cur_t.meta['capture_date']}.tif"
            old_key = f"satellite/{locality_id}/{old_t.meta['capture_date']}.tif"
            put(cur_key, cur_bytes)
            put(old_key, old_bytes)
            refs.append(
                TilePairRef(
                    locality_id=locality_id,
                    current_key=cur_key,
                    older_key=old_key,
                    current_date=cur_t.meta["capture_date"],
                    older_date=old_t.meta["capture_date"],
                    used_fallback=bool(
                        cur_t.meta.get("used_fallback") or old_t.meta.get("used_fallback")
                    ),
                )
            )
        return refs


def _default_storage_put(key: str, data: bytes) -> str:
    from common.storage import ensure_bucket, put_object

    ensure_bucket()
    return put_object(key, data, content_type="image/tiff")
