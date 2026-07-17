"""Extraction evaluation harness (blueprint §11.4).

Loads a hand-labeled set of infra events and measures extractor precision/recall
against it. Use this to validate the LLM extractor before trusting it — the
blueprint recommends hand-extracting 20 real YEIDA events as ground truth.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from ingestion.docintel.extractor import Extractor, HeuristicExtractor


@dataclass
class LabeledSample:
    text: str
    expected: list[dict]  # each: {project_type, status, expected_year?, sector?}


@dataclass
class EvalMetrics:
    true_positives: int
    false_positives: int
    false_negatives: int

    @property
    def precision(self) -> float:
        denom = self.true_positives + self.false_positives
        return self.true_positives / denom if denom else 0.0

    @property
    def recall(self) -> float:
        denom = self.true_positives + self.false_negatives
        return self.true_positives / denom if denom else 0.0

    @property
    def f1(self) -> float:
        p, r = self.precision, self.recall
        return 2 * p * r / (p + r) if (p + r) else 0.0


def _matches(expected: dict, extracted) -> bool:  # noqa: ANN001
    if expected["project_type"] != extracted.project_type:
        return False
    if expected["status"] != extracted.status:
        return False
    year = expected.get("expected_year")
    return year is None or year == extracted.expected_completion_year


def evaluate(samples: list[LabeledSample], extractor: Extractor | None = None) -> EvalMetrics:
    extractor = extractor or HeuristicExtractor()
    tp = fp = fn = 0
    for sample in samples:
        extracted = extractor.extract(sample.text)
        matched_expected: set[int] = set()
        for ext in extracted:
            hit = next(
                (
                    i
                    for i, exp in enumerate(sample.expected)
                    if i not in matched_expected and _matches(exp, ext)
                ),
                None,
            )
            if hit is None:
                fp += 1
            else:
                tp += 1
                matched_expected.add(hit)
        fn += len(sample.expected) - len(matched_expected)
    return EvalMetrics(true_positives=tp, false_positives=fp, false_negatives=fn)


def load_labeled_set(path: str | Path) -> list[LabeledSample]:
    data = json.loads(Path(path).read_text())
    return [LabeledSample(text=row["text"], expected=row["expected"]) for row in data]


def default_labeled_path() -> Path:
    return Path(__file__).parent / "labeled" / "yeida_sample.json"
