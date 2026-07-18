"""Segmentation tests (P4.4): trains reproducibly + reports usable IoU."""

from __future__ import annotations

from cv.segmentation import CLASS_NAMES, iou_per_class, mean_iou
from cv.tiles import synthetic_labeled_tile


def test_training_reports_reasonable_iou(segmenter_and_report):
    _model, report = segmenter_and_report
    assert 0.0 <= report.mean_iou <= 1.0
    assert report.mean_iou > 0.5  # learns the synthetic classes well
    assert set(report.per_class_iou) == set(CLASS_NAMES.values())
    assert report.n_train > 0


def test_predict_shape_and_classes(segmenter_and_report):
    model, _ = segmenter_and_report
    tile, _labels = synthetic_labeled_tile(size=40, seed=99)
    seg = model.predict(tile.bands)
    assert seg.shape == (40, 40)
    assert set(seg.flatten().tolist()).issubset(set(CLASS_NAMES))


def test_predict_proba_normalized(segmenter_and_report):
    model, _ = segmenter_and_report
    tile, _ = synthetic_labeled_tile(size=32, seed=7)
    proba = model.predict_proba(tile.bands)
    assert proba.shape == (32, 32, 3)
    assert abs(proba.sum(axis=2).mean() - 1.0) < 1e-6


def test_segmentation_accuracy_on_fresh_tile(segmenter_and_report):
    model, _ = segmenter_and_report
    tile, labels = synthetic_labeled_tile(size=40, seed=12345, built_fraction=0.2)
    assert mean_iou(model.predict(tile.bands), labels) > 0.5


def test_reproducible_training(tmp_path):
    from cv.training import train_segmenter
    from ml.registry import ModelRegistry

    _m1, r1 = train_segmenter(n=12, size=32, seed=3, registry=ModelRegistry(tmp_path / "a"))
    _m2, r2 = train_segmenter(n=12, size=32, seed=3, registry=ModelRegistry(tmp_path / "b"))
    assert r1.mean_iou == r2.mean_iou
    assert r1.per_class_iou == r2.per_class_iou


def test_iou_perfect_on_identical():
    _tile, labels = synthetic_labeled_tile(size=24, seed=1)
    per = iou_per_class(labels, labels)
    assert all(v == 1.0 for v in per.values())
