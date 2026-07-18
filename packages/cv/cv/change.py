"""Change detection (blueprint §3.5, P4.4).

Segment the T-6mo and T0 tiles, diff the class maps, and flag regions that went
from vegetation/bare_land -> built_structure (new construction). Connected regions
become confidence-scored, geocoded ``ChangePolygon`` objects feeding P4.5.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy import ndimage

from cv.segmentation import SegmentationModel
from cv.tiles import BARE_LAND, BUILT_STRUCTURE, VEGETATION, TilePair

# ~110_540 m per degree latitude; good enough for tile-scale area estimates.
_M_PER_DEG_LAT = 110_540.0


@dataclass
class ChangePolygon:
    """A detected new-built-up region. A PATTERN signal, not an official fact."""

    locality_id: str | None
    centroid_lat: float
    centroid_lng: float
    min_lat: float
    min_lng: float
    max_lat: float
    max_lng: float
    pixel_area: int
    area_m2: float
    confidence: float
    older_date: str
    current_date: str
    meta: dict = field(default_factory=dict)


def change_mask(model: SegmentationModel, pair: TilePair) -> np.ndarray:
    """Boolean mask of pixels that went veg/bare -> built between the two tiles."""
    old_seg = model.predict(pair.older.bands)
    cur_seg = model.predict(pair.current.bands)
    return (cur_seg == BUILT_STRUCTURE) & ((old_seg == VEGETATION) | (old_seg == BARE_LAND))


def detect_change(
    model: SegmentationModel,
    pair: TilePair,
    *,
    min_pixels: int = 6,
) -> list[ChangePolygon]:
    """Return confidence-scored change polygons for new built-up area."""
    cur_proba = model.predict_proba(pair.current.bands)[..., BUILT_STRUCTURE]
    became_built = change_mask(model, pair)
    if not became_built.any():
        return []

    labeled, n = ndimage.label(became_built)
    transform = pair.current.transform
    lat_span_m = (transform.max_lat - transform.min_lat) * _M_PER_DEG_LAT
    px_area_m2 = (lat_span_m / max(1, transform.height)) ** 2

    polygons: list[ChangePolygon] = []
    for region_id in range(1, n + 1):
        mask = labeled == region_id
        area = int(mask.sum())
        if area < min_pixels:
            continue
        rows, cols = np.where(mask)
        cen_lng, cen_lat = transform.pixel_to_lnglat(rows.mean(), cols.mean())
        min_lng, min_lat = transform.pixel_to_lnglat(rows.max(), cols.min())
        max_lng, max_lat = transform.pixel_to_lnglat(rows.min(), cols.max())

        # confidence: how strongly the current tile reads "built" in this region,
        # attenuated for tiny regions (a couple pixels could be noise).
        strength = float(cur_proba[mask].mean())
        size_factor = min(1.0, area / 40.0)
        confidence = round(max(0.0, min(0.9, strength * (0.6 + 0.4 * size_factor))), 3)

        polygons.append(
            ChangePolygon(
                locality_id=pair.locality_id,
                centroid_lat=round(cen_lat, 6),
                centroid_lng=round(cen_lng, 6),
                min_lat=round(min_lat, 6),
                min_lng=round(min_lng, 6),
                max_lat=round(max_lat, 6),
                max_lng=round(max_lng, 6),
                pixel_area=area,
                area_m2=round(area * px_area_m2, 1),
                confidence=confidence,
                older_date=pair.older.capture_date,
                current_date=pair.current.capture_date,
            )
        )
    polygons.sort(key=lambda p: p.confidence, reverse=True)
    return polygons


def change_precision(detected: np.ndarray, truth_new_built: np.ndarray) -> float:
    """Pixel-level precision of a detected-change mask vs the ground-truth mask."""
    if detected.sum() == 0:
        return 1.0 if truth_new_built.sum() == 0 else 0.0
    return float(np.logical_and(detected, truth_new_built).sum() / detected.sum())
