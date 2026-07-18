"""Model registry + versioning (blueprint §5, P3.2).

Stores trained artifacts + metadata so any model can be saved, versioned, and
reloaded by version for serving. The default backend is the local filesystem
(``MODEL_REGISTRY_DIR``, default ``./.model_registry``) so training/serving works
without external infra; in production the same layout maps onto object storage.

Layout::

    <root>/
      index.json                      # {domain: [versions...]}
      <domain>/
        <version>/
          artifact.joblib             # the fitted estimator + preprocessing
          metadata.json               # ModelMetadata (metrics, calibration, ...)
"""

from __future__ import annotations

import datetime as dt
import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import joblib

from common.logging import get_logger

log = get_logger(__name__)


def registry_root() -> Path:
    root = Path(os.getenv("MODEL_REGISTRY_DIR", ".model_registry"))
    root.mkdir(parents=True, exist_ok=True)
    return root


@dataclass
class ModelMetadata:
    """Everything needed to reproduce + trust a served prediction (§5)."""

    domain: str  # price | traffic | flood | water | aqi
    model_version: str
    feature_set_version: str
    trained_at: str
    unit: str
    algorithm: str
    n_train_rows: int
    metrics: dict[str, float] = field(default_factory=dict)
    calibration: dict[str, float] = field(default_factory=dict)  # e.g. residual std for bands
    feature_names: list[str] = field(default_factory=list)
    synthetic: bool = False  # honest flag: trained on synthetic (not live) data
    notes: str = ""

    def to_json(self) -> dict[str, Any]:
        return asdict(self)


class ModelRegistry:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or registry_root()
        self.root.mkdir(parents=True, exist_ok=True)
        self._index_path = self.root / "index.json"

    # -- index ---------------------------------------------------------------
    def _read_index(self) -> dict[str, list[str]]:
        if not self._index_path.exists():
            return {}
        return json.loads(self._index_path.read_text())

    def _write_index(self, index: dict[str, list[str]]) -> None:
        self._index_path.write_text(json.dumps(index, indent=2, sort_keys=True))

    # -- save / load ---------------------------------------------------------
    def save(self, *, artifact: Any, metadata: ModelMetadata) -> Path:
        dest = self.root / metadata.domain / metadata.model_version
        dest.mkdir(parents=True, exist_ok=True)
        joblib.dump(artifact, dest / "artifact.joblib")
        (dest / "metadata.json").write_text(json.dumps(metadata.to_json(), indent=2))

        index = self._read_index()
        versions = index.setdefault(metadata.domain, [])
        if metadata.model_version not in versions:
            versions.append(metadata.model_version)
        self._write_index(index)
        log.info(
            "model_registered",
            domain=metadata.domain,
            version=metadata.model_version,
            metrics=metadata.metrics,
        )
        return dest

    def latest_version(self, domain: str) -> str | None:
        versions = self._read_index().get(domain, [])
        return versions[-1] if versions else None

    def load(self, domain: str, version: str | None = None) -> tuple[Any, ModelMetadata]:
        version = version or self.latest_version(domain)
        if version is None:
            raise FileNotFoundError(f"no registered model for domain '{domain}'")
        base = self.root / domain / version
        if not (base / "artifact.joblib").exists():
            raise FileNotFoundError(f"artifact missing for {domain}:{version}")
        artifact = joblib.load(base / "artifact.joblib")
        metadata = ModelMetadata(**json.loads((base / "metadata.json").read_text()))
        return artifact, metadata

    def list_versions(self, domain: str) -> list[str]:
        return list(self._read_index().get(domain, []))

    def metadata(self, domain: str, version: str | None = None) -> ModelMetadata | None:
        """Read a model's metadata WITHOUT loading its (heavy) artifact — used by
        the observability surface (P5.3)."""
        version = version or self.latest_version(domain)
        if version is None:
            return None
        path = self.root / domain / version / "metadata.json"
        if not path.exists():
            return None
        return ModelMetadata(**json.loads(path.read_text()))

    def domains(self) -> list[str]:
        return list(self._read_index().keys())


def new_version(domain: str) -> str:
    """A sortable, unique version string: ``<domain>-vYYYYMMDDHHMMSS``."""
    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%d%H%M%S")
    return f"{domain}-v{ts}"
