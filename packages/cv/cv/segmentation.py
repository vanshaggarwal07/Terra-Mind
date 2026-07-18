"""Semantic segmentation model (blueprint §3.5, P4.4).

``SegmentationModel`` is the interface the pipeline depends on. The default
``SklearnPixelSegmenter`` is a dependency-light per-pixel classifier over spectral
bands + NDVI — genuinely trainable, reports IoU, reproducible, and checkpointable
(GPU-spot-friendly via ``save``/``load``). A PyTorch U-Net/DeepLab implementing the
same interface is a drop-in for production (see README).
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from cv.tiles import BUILT_STRUCTURE, ndvi

CLASS_NAMES = {0: "vegetation", 1: "bare_land", 2: "built_structure"}
N_CLASSES = 3


def pixel_features(bands: np.ndarray) -> np.ndarray:
    """(H, W, 4) -> (H*W, 5): [R, G, B, NIR, NDVI]."""
    h, w, _ = bands.shape
    flat = bands.reshape(h * w, 4)
    nd = ndvi(bands).reshape(h * w, 1)
    return np.concatenate([flat, nd], axis=1)


@runtime_checkable
class SegmentationModel(Protocol):
    def fit(self, tiles: list[np.ndarray], labels: list[np.ndarray]) -> None: ...
    def predict(self, bands: np.ndarray) -> np.ndarray: ...
    def predict_proba(self, bands: np.ndarray) -> np.ndarray: ...
    def save(self, path: str | Path) -> None: ...


class SklearnPixelSegmenter:
    """Per-pixel Random Forest over [R, G, B, NIR, NDVI]."""

    def __init__(self, *, n_estimators: int = 120, max_depth: int = 12, seed: int = 0) -> None:
        self.clf = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=seed,
            n_jobs=2,
            class_weight="balanced",
        )
        self.trained = False

    def fit(self, tiles: list[np.ndarray], labels: list[np.ndarray]) -> None:
        X = np.concatenate([pixel_features(b) for b in tiles], axis=0)
        y = np.concatenate([lbl.reshape(-1) for lbl in labels], axis=0)
        self.clf.fit(X, y)
        self.trained = True

    def predict(self, bands: np.ndarray) -> np.ndarray:
        h, w, _ = bands.shape
        return self.clf.predict(pixel_features(bands)).reshape(h, w).astype(np.int64)

    def predict_proba(self, bands: np.ndarray) -> np.ndarray:
        h, w, _ = bands.shape
        proba = self.clf.predict_proba(pixel_features(bands))
        # align to N_CLASSES columns even if a class was unseen in training
        full = np.zeros((h * w, N_CLASSES))
        for idx, cls in enumerate(self.clf.classes_):
            full[:, int(cls)] = proba[:, idx]
        return full.reshape(h, w, N_CLASSES)

    def save(self, path: str | Path) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.clf, path)

    @classmethod
    def load(cls, path: str | Path) -> SklearnPixelSegmenter:
        obj = cls()
        obj.clf = joblib.load(path)
        obj.trained = True
        return obj


def iou_per_class(pred: np.ndarray, truth: np.ndarray) -> dict[str, float]:
    """Intersection-over-union per class (blueprint §3.5 metric)."""
    out: dict[str, float] = {}
    for cls, name in CLASS_NAMES.items():
        p = pred == cls
        t = truth == cls
        union = np.logical_or(p, t).sum()
        inter = np.logical_and(p, t).sum()
        out[name] = float(inter / union) if union else 1.0
    return out


def mean_iou(pred: np.ndarray, truth: np.ndarray) -> float:
    per = iou_per_class(pred, truth)
    return float(np.mean(list(per.values())))


def built_up_recall(pred: np.ndarray, truth: np.ndarray) -> float:
    t = truth == BUILT_STRUCTURE
    if not t.any():
        return 1.0
    return float(np.logical_and(pred == BUILT_STRUCTURE, t).sum() / t.sum())
