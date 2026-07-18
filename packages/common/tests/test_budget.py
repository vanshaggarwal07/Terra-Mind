"""Budget guard tests (P5.4): caps fail safe, never silently overspend."""

from __future__ import annotations

import pytest

from common.budget import GPU, SATELLITE, X_SOCIAL, BudgetExceeded, BudgetGuard


def _guard(**kw):
    caps = {X_SOCIAL: 100.0, SATELLITE: 50.0, GPU: 200.0}
    enabled = {X_SOCIAL: False, SATELLITE: True, GPU: True}
    caps.update(kw.get("caps", {}))
    enabled.update(kw.get("enabled", {}))
    alerts: list[tuple] = []
    g = BudgetGuard(caps=caps, enabled=enabled, alert=lambda n, s, c: alerts.append((n, s, c)))
    return g, alerts


def test_disabled_feature_always_blocked():
    g, _ = _guard()
    assert g.feature_enabled(X_SOCIAL) is False
    assert g.charge(X_SOCIAL, 1.0) is False  # off by default -> blocked
    assert g.spend(X_SOCIAL) == 0.0


def test_enabled_under_cap_allows_and_records():
    g, _ = _guard()
    assert g.charge(SATELLITE, 10.0) is True
    assert g.spend(SATELLITE) == 10.0
    assert g.remaining(SATELLITE) == 40.0


def test_cap_trips_and_alerts_no_overspend():
    g, alerts = _guard()
    assert g.charge(SATELLITE, 45.0) is True
    assert g.charge(SATELLITE, 10.0) is False  # 55 > 50 cap -> blocked
    assert g.spend(SATELLITE) == 45.0  # never overspent
    assert alerts and alerts[-1][0] == SATELLITE


def test_allowed_reflects_enabled_and_cap():
    g, _ = _guard()
    assert g.allowed(SATELLITE) is True
    g.record(SATELLITE, 50.0)  # at cap
    assert g.over_cap(SATELLITE) is True
    assert g.allowed(SATELLITE) is False


def test_require_raises_when_blocked():
    g, _ = _guard()
    with pytest.raises(BudgetExceeded):
        g.require(X_SOCIAL, 1.0)  # disabled


def test_snapshot_shape_for_dashboard():
    g, _ = _guard()
    g.charge(SATELLITE, 20.0)
    snap = {s.name: s for s in g.snapshot()}
    assert set(snap) == {X_SOCIAL, SATELLITE, GPU}
    assert snap[SATELLITE].spend_usd == 20.0
    assert snap[SATELLITE].burn_rate == pytest.approx(0.4)
    assert snap[X_SOCIAL].enabled is False


def test_defaults_x_social_off_satellite_gpu_gated():
    # From settings defaults: X off, satellite/gpu gated off unless enabled.
    from common.budget import get_budget_guard, reset_budget_guard

    reset_budget_guard()
    g = get_budget_guard()
    assert g.feature_enabled(X_SOCIAL) is False
    reset_budget_guard()
