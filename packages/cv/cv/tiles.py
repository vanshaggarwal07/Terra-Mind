"""Tile primitives + deterministic synthetic tile generation (blueprint §3.5).

A ``Tile`` is a multi-band raster (H, W, C) with bands [R, G, B, NIR] at ~10m
resolution (matching Sentinel-2). ``TileTransform`` maps pixel (row, col) -> lat/lng
via the tile's geographic bounds so change regions can be geocoded (P4.5).

Until a labeled Sentinel-2 corridor dataset exists, ``synthetic_labeled_tile``
generates deterministic tiles with realistic per-class spectral signatures so the
segmenter + change detector are fully trainable and testable offline.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Band order and class ids.
BANDS = ("R", "G", "B", "NIR")
VEGETATION, BARE_LAND, BUILT_STRUCTURE = 0, 1, 2

# Approximate top-of-atmosphere reflectance signatures per class: [R, G, B, NIR].
_CLASS_SIGNATURE = {
    VEGETATION: np.array([0.06, 0.10, 0.05, 0.45]),  # low red, high NIR
    BARE_LAND: np.array([0.30, 0.28, 0.24, 0.34]),  # bright, moderate NIR
    BUILT_STRUCTURE: np.array([0.34, 0.34, 0.34, 0.30]),  # grey, low NIR
}


@dataclass(frozen=True)
class TileTransform:
    """Affine mapping from pixel (row, col) to (lat, lng) over the tile bounds."""

    min_lat: float
    min_lng: float
    max_lat: float
    max_lng: float
    height: int
    width: int

    def pixel_to_lnglat(self, row: float, col: float) -> tuple[float, float]:
        frac_x = col / max(1, self.width - 1)
        frac_y = row / max(1, self.height - 1)
        lng = self.min_lng + frac_x * (self.max_lng - self.min_lng)
        # row 0 is the top (max latitude)
        lat = self.max_lat - frac_y * (self.max_lat - self.min_lat)
        return lng, lat


@dataclass
class Tile:
    bands: np.ndarray  # (H, W, 4) float reflectance
    transform: TileTransform
    capture_date: str  # ISO date
    locality_id: str | None = None

    @property
    def shape(self) -> tuple[int, int]:
        return self.bands.shape[0], self.bands.shape[1]


@dataclass
class TilePair:
    """A T0 (current) and T-6mo (older) tile for one locality."""

    locality_id: str
    older: Tile
    current: Tile


def ndvi(bands: np.ndarray) -> np.ndarray:
    r = bands[..., 0]
    nir = bands[..., 3]
    return (nir - r) / np.clip(nir + r, 1e-6, None)


def _default_transform(size: int, locality_id: str, seed: int) -> TileTransform:
    rng = np.random.default_rng(seed)
    lat0 = float(rng.uniform(28.30, 28.58))
    lng0 = float(rng.uniform(77.30, 77.72))
    span = 0.02  # ~2km tile
    return TileTransform(lat0, lng0, lat0 + span, lng0 + span, size, size)


def synthetic_labeled_tile(
    *,
    size: int = 48,
    seed: int = 0,
    built_fraction: float = 0.15,
    locality_id: str = "loc-00",
    capture_date: str = "2024-01-01",
) -> tuple[Tile, np.ndarray]:
    """Return (tile, label_map). ``built_fraction`` controls built-up coverage."""
    rng = np.random.default_rng(seed)
    labels = np.full((size, size), VEGETATION, dtype=np.int64)

    # scatter some bare-land patches
    for _ in range(rng.integers(2, 5)):
        _paint_blob(labels, rng, BARE_LAND, max_r=size // 6)
    # scatter built-up blobs up to the requested fraction
    target_built = int(built_fraction * size * size)
    guard = 0
    while (labels == BUILT_STRUCTURE).sum() < target_built and guard < 50:
        _paint_blob(labels, rng, BUILT_STRUCTURE, max_r=max(2, size // 8))
        guard += 1

    bands = np.zeros((size, size, 4), dtype=np.float64)
    for cls, sig in _CLASS_SIGNATURE.items():
        mask = labels == cls
        noise = rng.normal(0, 0.02, size=(int(mask.sum()), 4))
        bands[mask] = np.clip(sig + noise, 0.0, 1.0)

    tile = Tile(
        bands=bands,
        transform=_default_transform(size, locality_id, seed),
        capture_date=capture_date,
        locality_id=locality_id,
    )
    return tile, labels


def _paint_blob(labels: np.ndarray, rng: np.random.Generator, cls: int, *, max_r: int) -> None:
    size = labels.shape[0]
    cy, cx = rng.integers(0, size, size=2)
    r = int(rng.integers(1, max(2, max_r)))
    ys, xs = np.ogrid[:size, :size]
    mask = (ys - cy) ** 2 + (xs - cx) ** 2 <= r * r
    labels[mask] = cls


def synthetic_growth_pair(
    *,
    size: int = 48,
    seed: int = 0,
    locality_id: str = "loc-00",
) -> tuple[TilePair, np.ndarray]:
    """A tile pair where built-up area GROWS from older -> current.

    Returns (pair, new_built_mask) where the mask marks pixels that became
    built_structure (the ground-truth change to detect)."""
    older, old_labels = synthetic_labeled_tile(
        size=size,
        seed=seed,
        built_fraction=0.08,
        locality_id=locality_id,
        capture_date="2023-07-01",
    )
    # current: start from older labels, convert some veg/bare -> built (new construction)
    rng = np.random.default_rng(seed + 999)
    cur_labels = old_labels.copy()
    for _ in range(rng.integers(2, 5)):
        _paint_blob(cur_labels, rng, BUILT_STRUCTURE, max_r=max(2, size // 9))
    new_built_mask = (cur_labels == BUILT_STRUCTURE) & (old_labels != BUILT_STRUCTURE)

    cur_bands = np.zeros((size, size, 4), dtype=np.float64)
    for cls, sig in _CLASS_SIGNATURE.items():
        mask = cur_labels == cls
        noise = rng.normal(0, 0.02, size=(int(mask.sum()), 4))
        cur_bands[mask] = np.clip(sig + noise, 0.0, 1.0)
    current = Tile(
        bands=cur_bands,
        transform=older.transform,
        capture_date="2024-01-01",
        locality_id=locality_id,
    )
    return TilePair(locality_id=locality_id, older=older, current=current), new_built_mask
