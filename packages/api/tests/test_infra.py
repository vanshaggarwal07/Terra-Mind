"""IaC constraint guards (P5.1) — enforce infra invariants without needing terraform.

Acceptance: no secret committed; GPU compute is spot/scale-to-zero (never
always-on); dev + prod environments are separated with validated config.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

_INFRA = Path(__file__).resolve().parents[3] / "infra"


def _read(name: str) -> str:
    return (_INFRA / name).read_text(encoding="utf-8")


def test_infra_dir_and_core_files_exist():
    for f in (
        "main.tf",
        "variables.tf",
        "database.tf",
        "storage.tf",
        "secrets.tf",
        "compute.tf",
        "gpu_batch.tf",
        "iam.tf",
    ):
        assert (_INFRA / f).exists(), f"missing infra/{f}"


def test_gpu_is_spot_and_scales_to_zero():
    tf = _read("gpu_batch.tf")
    assert re.search(r'type\s*=\s*"SPOT"', tf), "GPU compute must be SPOT (§9)"
    assert re.search(r"min_vcpus\s*=\s*0", tf), "GPU env must scale to zero when idle"


def test_dev_and_prod_environments_separated():
    assert (_INFRA / "envs" / "dev.tfvars").exists()
    assert (_INFRA / "envs" / "prod.tfvars").exists()
    variables = _read("variables.tf")
    assert 'contains(["dev", "prod"]' in variables  # environment is validated


def test_secrets_come_from_manager_not_literals():
    # Secrets are generated + stored in Secrets Manager, never hardcoded.
    secrets = _read("secrets.tf")
    assert "random_password" in secrets
    assert "aws_secretsmanager_secret" in secrets

    # No .tf/.tfvars file may contain an inline secret literal.
    forbidden = re.compile(r'(password|secret_key|access_key|api_key)\s*=\s*"[^"$]', re.I)
    for path in [*_INFRA.glob("*.tf"), *(_INFRA / "envs").glob("*.tfvars")]:
        text = path.read_text(encoding="utf-8")
        assert not forbidden.search(text), f"possible hardcoded secret in {path.name}"


@pytest.mark.parametrize("env", ["dev", "prod"])
def test_tfvars_declare_environment(env):
    assert f'environment             = "{env}"' in _read(f"envs/{env}.tfvars")
