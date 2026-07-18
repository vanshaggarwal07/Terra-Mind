"""Change-detection tests (P4.4): growth pairs -> confidence-scored polygons."""

from __future__ import annotations

from cv.change import change_mask, change_precision, detect_change
from cv.tiles import synthetic_growth_pair


def test_growth_pair_produces_change_polygons(segmenter_and_report):
    model, _ = segmenter_and_report
    pair, _truth = synthetic_growth_pair(size=48, seed=1000)
    polys = detect_change(model, pair, min_pixels=4)
    assert polys  # detects new built-up area
    for p in polys:
        assert 0.0 <= p.confidence <= 0.9
        assert p.area_m2 > 0
        assert p.older_date < p.current_date
        # geocoded within the tile bounds
        assert pair.current.transform.min_lat <= p.centroid_lat <= pair.current.transform.max_lat


def test_change_precision_is_reasonable(segmenter_and_report):
    model, _ = segmenter_and_report
    pair, truth = synthetic_growth_pair(size=48, seed=2024)
    precision = change_precision(change_mask(model, pair), truth)
    assert precision > 0.4  # majority of flagged pixels are true new-built


def test_no_change_when_tiles_identical(segmenter_and_report):
    model, _ = segmenter_and_report
    pair, _ = synthetic_growth_pair(size=40, seed=5)
    pair.older = pair.current  # identical tiles -> no veg/bare -> built transition
    assert detect_change(model, pair) == []


def test_polygons_sorted_by_confidence(segmenter_and_report):
    model, _ = segmenter_and_report
    pair, _ = synthetic_growth_pair(size=56, seed=77)
    polys = detect_change(model, pair, min_pixels=3)
    confs = [p.confidence for p in polys]
    assert confs == sorted(confs, reverse=True)
