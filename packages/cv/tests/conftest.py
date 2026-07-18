"""Shared fixtures: train the segmenter once into a temp registry."""

from __future__ import annotations

import pytest

from cv.training import train_segmenter
from ml.registry import ModelRegistry


@pytest.fixture(scope="session")
def segmenter_and_report(tmp_path_factory):
    root = tmp_path_factory.mktemp("cv_registry")
    model, report = train_segmenter(n=24, size=40, seed=0, registry=ModelRegistry(root))
    return model, report
