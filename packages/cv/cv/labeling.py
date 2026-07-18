"""Labeling workflow for the corridor segmentation dataset (blueprint §3.5, P4.4).

Real training needs labeled Sentinel-2 tiles (classes: vegetation / bare_land /
built_structure). Recommended workflow to grow the dataset:

1. Export Sentinel-2 L2A tiles for tracked localities (the P4.3 fetcher stores
   them keyed by ``{locality_id}/{capture_date}``).
2. Annotate class masks in QGIS or Label Studio; export a single-band PNG/GeoTIFF
   label raster aligned to the tile grid (pixel value == class id).
3. Register each (tile, label) pair here as a ``LabeledTile`` and version the
   dataset alongside the model (same registry as Phase-3 models).

Until that seed set exists, ``make_synthetic_dataset`` yields a deterministic,
clearly-synthetic labeled set so the pipeline is fully trainable/testable offline.
Every model trained from it carries ``synthetic=True`` (honesty framing, §5).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from cv.tiles import synthetic_labeled_tile


@dataclass
class LabeledTile:
    bands: np.ndarray  # (H, W, 4)
    labels: np.ndarray  # (H, W) int class ids
    source: str = "synthetic"


def make_synthetic_dataset(n: int = 24, *, size: int = 48, seed: int = 0) -> list[LabeledTile]:
    """A deterministic labeled dataset for training/validation."""
    out: list[LabeledTile] = []
    for i in range(n):
        built = 0.05 + 0.25 * ((i % 5) / 4.0)  # vary built-up coverage
        tile, labels = synthetic_labeled_tile(
            size=size, seed=seed + i, built_fraction=built, locality_id=f"loc-{i % 14:02d}"
        )
        out.append(LabeledTile(bands=tile.bands, labels=labels))
    return out
