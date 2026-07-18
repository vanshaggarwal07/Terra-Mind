"""Train + register the change-detection segmenter (blueprint §3.5, P4.4).

Reproducible (seeded), reports IoU + built-up recall + change-detection precision
on a held-out validation split, and registers the artifact by version (same
registry as Phase-3 models). Checkpointing via ``save`` makes GPU-spot batch runs
resumable.

Usage:  python -m cv.training
"""

from __future__ import annotations

import datetime as dt
from dataclasses import asdict, dataclass, field

import numpy as np

from cv.change import change_mask, change_precision
from cv.labeling import make_synthetic_dataset
from cv.segmentation import (
    SklearnPixelSegmenter,
    built_up_recall,
    iou_per_class,
    mean_iou,
)
from cv.tiles import synthetic_growth_pair
from ml.registry import ModelMetadata, ModelRegistry, new_version

DOMAIN = "cv_segmentation"


@dataclass
class EvalReport:
    model_version: str
    n_train: int
    n_val: int
    mean_iou: float
    per_class_iou: dict[str, float]
    built_up_recall: float
    change_precision: float
    synthetic: bool = True
    feature_set_version: str = "cv-synth-2026.07"
    extra: dict = field(default_factory=dict)

    def to_json(self) -> dict:
        return asdict(self)


def train_segmenter(
    *,
    n: int = 24,
    size: int = 48,
    seed: int = 0,
    registry: ModelRegistry | None = None,
    register: bool = True,
) -> tuple[SklearnPixelSegmenter, EvalReport]:
    dataset = make_synthetic_dataset(n=n, size=size, seed=seed)
    split = max(1, int(len(dataset) * 0.8))
    train, val = dataset[:split], dataset[split:] or dataset[-1:]

    model = SklearnPixelSegmenter(seed=seed)
    model.fit([t.bands for t in train], [t.labels for t in train])

    # segmentation metrics on validation tiles
    ious = [iou_per_class(model.predict(t.bands), t.labels) for t in val]
    per_class = {k: float(np.mean([d[k] for d in ious])) for k in ious[0]}
    miou = float(np.mean([mean_iou(model.predict(t.bands), t.labels) for t in val]))
    recall = float(np.mean([built_up_recall(model.predict(t.bands), t.labels) for t in val]))

    # change-detection precision on held-out growth pairs
    precisions: list[float] = []
    for k in range(4):
        pair, truth = synthetic_growth_pair(size=size, seed=1000 + k)
        precisions.append(change_precision(change_mask(model, pair), truth))
    change_prec = float(np.mean(precisions))

    version = new_version(DOMAIN)
    report = EvalReport(
        model_version=version,
        n_train=len(train),
        n_val=len(val),
        mean_iou=round(miou, 4),
        per_class_iou={k: round(v, 4) for k, v in per_class.items()},
        built_up_recall=round(recall, 4),
        change_precision=round(change_prec, 4),
    )

    if register:
        registry = registry or ModelRegistry()
        model.model_version = version  # type: ignore[attr-defined]
        registry.save(
            artifact=model,
            metadata=ModelMetadata(
                domain=DOMAIN,
                model_version=version,
                feature_set_version=report.feature_set_version,
                trained_at=dt.datetime.now(dt.UTC).isoformat(),
                unit="segmentation-class",
                algorithm="RandomForestClassifier",
                n_train_rows=len(train),
                metrics={"mean_iou": report.mean_iou, "change_precision": report.change_precision},
                feature_names=["R", "G", "B", "NIR", "NDVI"],
                synthetic=True,
                notes="Pixel segmenter; swap in a PyTorch U-Net for production.",
            ),
        )
    return model, report


def main() -> None:
    _model, report = train_segmenter()
    print(
        f"{report.model_version}  mIoU={report.mean_iou}  "
        f"built_recall={report.built_up_recall}  change_precision={report.change_precision}"
    )
    print("per-class IoU:", report.per_class_iou)


if __name__ == "__main__":
    main()
