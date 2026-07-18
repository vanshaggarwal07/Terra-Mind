"""Train + register every Phase-3 model reproducibly (P3.1-P3.7).

Builds each domain's point-in-time feature set, trains its model with a
chronological split, and registers the artifact + metadata by version. Runs fully
offline against the deterministic synthetic corridor panel (clearly flagged
``synthetic=True`` in every dataset card + model metadata, per §5 honesty framing).

Usage::

    python -m ml.training.train                 # train all, register latest
    python -m ml.training.train --as-of 2026-06-01
"""

from __future__ import annotations

import argparse
import datetime as dt

from common.logging import get_logger
from ml.features import ALL_BUILDERS
from ml.features.base import assert_point_in_time
from ml.features.synthetic import build_panel
from ml.models import MODEL_CLASSES
from ml.models.base import TrainReport
from ml.registry import ModelRegistry

log = get_logger(__name__)


def train_all(
    as_of: dt.date | None = None,
    registry: ModelRegistry | None = None,
    *,
    materialize: bool = False,
) -> dict[str, TrainReport]:
    as_of = as_of or dt.date.today()
    registry = registry or ModelRegistry()
    panel = build_panel(as_of)
    reports: dict[str, TrainReport] = {}

    for domain, build in ALL_BUILDERS.items():
        fs = build(as_of, panel)
        assert_point_in_time(fs.frame, as_of)  # no-leakage guarantee (§5)
        if materialize:
            fs.materialize()
        model = MODEL_CLASSES[domain]()
        report = model.train(fs)
        registry.save(artifact=model, metadata=model.metadata(fs.version))
        reports[domain] = report
        log.info(
            "trained_model",
            domain=domain,
            version=report.model_version,
            metrics=report.metrics,
            n_train=report.n_train,
        )
    return reports


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Phase-3 prediction models")
    parser.add_argument("--as-of", type=str, default=None, help="YYYY-MM-DD cut-off date")
    parser.add_argument("--materialize", action="store_true", help="also write feature tables")
    args = parser.parse_args()
    as_of = dt.date.fromisoformat(args.as_of) if args.as_of else dt.date.today()
    reports = train_all(as_of, materialize=args.materialize)
    for domain, r in reports.items():
        print(f"{domain:8s} {r.model_version}  metrics={r.metrics}  n_train={r.n_train}")


if __name__ == "__main__":
    main()
