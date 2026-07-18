"""Model registry tests (P3.2): save, version, reload-by-version."""

from __future__ import annotations

from ml.registry import ModelMetadata, ModelRegistry, new_version


def _meta(domain: str, version: str) -> ModelMetadata:
    return ModelMetadata(
        domain=domain,
        model_version=version,
        feature_set_version="fs-test",
        trained_at="2026-07-18T00:00:00Z",
        unit="INR/sqft",
        algorithm="XGBRegressor",
        n_train_rows=100,
        metrics={"mape": 0.05},
        synthetic=True,
    )


def test_save_and_load_by_version(tmp_path):
    reg = ModelRegistry(tmp_path)
    v = new_version("price")
    reg.save(artifact={"weights": [1, 2, 3]}, metadata=_meta("price", v))
    artifact, meta = reg.load("price", v)
    assert artifact == {"weights": [1, 2, 3]}
    assert meta.model_version == v
    assert meta.synthetic is True


def test_latest_version_and_listing(tmp_path):
    reg = ModelRegistry(tmp_path)
    v1, v2 = "price-v1", "price-v2"
    reg.save(artifact=1, metadata=_meta("price", v1))
    reg.save(artifact=2, metadata=_meta("price", v2))
    assert reg.latest_version("price") == v2
    assert reg.list_versions("price") == [v1, v2]
    assert "price" in reg.domains()


def test_load_missing_raises(tmp_path):
    reg = ModelRegistry(tmp_path)
    try:
        reg.load("price")
    except FileNotFoundError:
        return
    raise AssertionError("expected FileNotFoundError for unregistered domain")


def test_registry_survives_reinstantiation(tmp_path):
    v = new_version("aqi")
    ModelRegistry(tmp_path).save(artifact=[1], metadata=_meta("aqi", v))
    # a fresh registry object reads the same on-disk index
    artifact, _ = ModelRegistry(tmp_path).load("aqi", v)
    assert artifact == [1]
