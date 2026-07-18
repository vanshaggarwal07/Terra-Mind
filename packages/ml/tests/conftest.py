"""Shared fixtures: train every Phase-3 model once into a temp registry."""

from __future__ import annotations

import datetime as dt

import pytest

from ml.features import ALL_BUILDERS
from ml.features.synthetic import build_panel
from ml.registry import ModelRegistry
from ml.training.train import train_all

AS_OF = dt.date(2025, 1, 1)


@pytest.fixture(scope="session")
def panel():
    return build_panel(AS_OF)


@pytest.fixture(scope="session")
def feature_sets(panel):
    return {name: build(AS_OF, panel) for name, build in ALL_BUILDERS.items()}


@pytest.fixture(scope="session")
def trained(tmp_path_factory):
    root = tmp_path_factory.mktemp("model_registry")
    registry = ModelRegistry(root)
    reports = train_all(AS_OF, registry)
    return registry, reports
