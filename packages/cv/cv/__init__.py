"""Phase 4 — Satellite Change-Detection CV (blueprint §3.5).

A semantic-segmentation model distinguishing {vegetation, bare_land,
built_structure}, run on T0 vs T-6mo tile pairs to flag NEW built-up area. Output
is a *pattern-based* signal (``source_tier="pattern_cv"``) — clearly lower trust
than official records — that feeds the knowledge graph and NEVER alone flips a
fact to verified or drives a builder verdict (§3.5, §0).

The segmentation model is a pluggable interface. The default implementation is a
dependency-light pixel classifier (numpy + scikit-learn) so the whole pipeline is
trainable/testable offline; a PyTorch U-Net/DeepLab backbone is a drop-in for the
GPU-spot production path (see ``segmentation.SegmentationModel``).
"""

from __future__ import annotations

from cv.change import ChangePolygon, detect_change
from cv.segmentation import CLASS_NAMES, SegmentationModel, SklearnPixelSegmenter
from cv.tiles import Tile, TilePair, TileTransform

__all__ = [
    "Tile",
    "TilePair",
    "TileTransform",
    "SegmentationModel",
    "SklearnPixelSegmenter",
    "CLASS_NAMES",
    "detect_change",
    "ChangePolygon",
]
