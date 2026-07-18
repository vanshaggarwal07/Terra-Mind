"""Feature-store primitives: FeatureSet, DatasetCard, point-in-time checks (P3.1)."""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

import pandas as pd

# Column conventions shared by every feature set.
PERIOD_COL = "period"  # the timestamp the TARGET/observation belongs to
KNOWN_AT_COL = "known_at"  # the timestamp all features in the row were known by


@dataclass
class DatasetCard:
    """Documents a materialized feature set (§5 honesty framing)."""

    feature_set: str
    version: str
    as_of: str
    n_rows: int
    n_entities: int
    date_range: tuple[str, str]
    target: str
    unit: str
    feature_names: list[str]
    known_gaps: list[str] = field(default_factory=list)
    synthetic: bool = False

    def to_json(self) -> dict:
        return asdict(self)


@dataclass
class FeatureSet:
    """A versioned, point-in-time-correct training/serving table."""

    name: str
    version: str
    as_of: dt.date
    frame: pd.DataFrame
    feature_names: list[str]
    target: str
    unit: str
    card: DatasetCard

    def X(self) -> pd.DataFrame:  # noqa: N802 - conventional ML name
        return self.frame[self.feature_names].copy()

    def y(self) -> pd.Series:
        return self.frame[self.target].copy()

    def materialize(self, root: Path | None = None) -> Path:
        """Persist the frame (parquet if available, else csv) + dataset card."""
        base = Path(root or "feature_store") / self.name / self.version
        base.mkdir(parents=True, exist_ok=True)
        frame_path = base / "features.parquet"
        try:
            self.frame.to_parquet(frame_path)
        except Exception:  # noqa: BLE001 - pyarrow optional; fall back to csv
            frame_path = base / "features.csv"
            self.frame.to_csv(frame_path, index=False)
        (base / "dataset_card.json").write_text(json.dumps(self.card.to_json(), indent=2))
        return base


def assert_point_in_time(frame: pd.DataFrame, as_of: dt.date) -> None:
    """Raise if any row leaks data from the future (blueprint §5 no-leakage rule).

    A training row's features must reflect only data known as of its own
    ``known_at`` timestamp, and no row may be dated after the ``as_of`` cut-off.
    """
    if frame.empty:
        return
    as_of_ts = pd.Timestamp(as_of)
    if KNOWN_AT_COL in frame:
        max_known = pd.to_datetime(frame[KNOWN_AT_COL]).max()
        if max_known > as_of_ts:
            raise ValueError(f"leakage: known_at {max_known} > as_of {as_of_ts}")
    if PERIOD_COL in frame:
        max_period = pd.to_datetime(frame[PERIOD_COL]).max()
        if max_period > as_of_ts:
            raise ValueError(f"leakage: period {max_period} > as_of {as_of_ts}")
        # features must be known no later than the observation they describe
        if KNOWN_AT_COL in frame:
            bad = pd.to_datetime(frame[KNOWN_AT_COL]) > pd.to_datetime(frame[PERIOD_COL])
            if bool(bad.any()):
                raise ValueError("leakage: known_at after its own period for some rows")
