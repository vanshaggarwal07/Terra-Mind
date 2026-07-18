"""Cost tracking + hard budget guards (blueprint §9 cost reality, §13; P5.4).

MVP infra is modest; the spend risks are the paid line items — the X/Twitter API,
satellite API pulls, and GPU batch compute. These are OPTIONAL and gated/off by
default. This module tracks per-line-item spend and enforces monthly caps: hitting
a cap disables the optional feature (fails safe) and alerts — it never silently
overspends.
"""

from __future__ import annotations

import threading
from collections.abc import Callable
from dataclasses import dataclass

from common.config import get_settings
from common.logging import get_logger

log = get_logger(__name__)

# The three deliberately-budgeted line items (§9/§13).
X_SOCIAL = "x_social"
SATELLITE = "satellite"
GPU = "gpu"
LINE_ITEMS = (X_SOCIAL, SATELLITE, GPU)


class BudgetExceeded(RuntimeError):
    """Raised when a hard-guarded operation would exceed its monthly cap."""


@dataclass
class LineItemStatus:
    name: str
    enabled: bool
    spend_usd: float
    cap_usd: float
    remaining_usd: float
    over_cap: bool
    allowed: bool
    burn_rate: float  # fraction of cap consumed (0-1+)


def _default_alert(line_item: str, spend: float, cap: float) -> None:
    log.warning("budget_cap_exceeded", line_item=line_item, spend_usd=spend, cap_usd=cap)


class BudgetGuard:
    """Tracks spend per line item and enforces caps + feature flags.

    Spend is stored in a pluggable store (in-memory default). In production the
    store is backed by the ``cost_ledger`` and reset monthly; cloud budget alerts
    (P5.1 IaC) are the backstop."""

    def __init__(
        self,
        *,
        caps: dict[str, float] | None = None,
        enabled: dict[str, bool] | None = None,
        alert: Callable[[str, float, float], None] | None = None,
    ) -> None:
        s = get_settings()
        self._caps = caps or {
            X_SOCIAL: s.budget_x_social_usd,
            SATELLITE: s.budget_satellite_usd,
            GPU: s.budget_gpu_usd,
        }
        self._enabled = enabled or {
            X_SOCIAL: s.enable_x_social,
            SATELLITE: s.enable_satellite,
            GPU: s.enable_gpu_batch,
        }
        self._alert = alert or _default_alert
        self._spend: dict[str, float] = dict.fromkeys(LINE_ITEMS, 0.0)
        self._lock = threading.Lock()

    # -- reads ---------------------------------------------------------------
    def spend(self, name: str) -> float:
        with self._lock:
            return self._spend.get(name, 0.0)

    def cap(self, name: str) -> float:
        return self._caps.get(name, 0.0)

    def remaining(self, name: str) -> float:
        return max(0.0, self.cap(name) - self.spend(name))

    def feature_enabled(self, name: str) -> bool:
        return bool(self._enabled.get(name, False))

    def over_cap(self, name: str) -> bool:
        return self.spend(name) >= self.cap(name)

    def allowed(self, name: str) -> bool:
        """True only if the feature is enabled AND under its cap (fails safe)."""
        return self.feature_enabled(name) and not self.over_cap(name)

    # -- writes --------------------------------------------------------------
    def record(self, name: str, amount_usd: float) -> None:
        with self._lock:
            self._spend[name] = self._spend.get(name, 0.0) + max(0.0, amount_usd)

    def charge(self, name: str, amount_usd: float) -> bool:
        """Attempt to charge ``amount_usd`` to ``name``.

        Returns True if allowed (and records the spend); False if the feature is
        disabled or the cap is/would be exceeded (alerting, never overspending)."""
        if not self.feature_enabled(name):
            return False
        if self.spend(name) + amount_usd > self.cap(name):
            self._alert(name, self.spend(name) + amount_usd, self.cap(name))
            return False
        self.record(name, amount_usd)
        return True

    def require(self, name: str, amount_usd: float) -> None:
        """Hard guard: raise ``BudgetExceeded`` instead of returning False."""
        if not self.charge(name, amount_usd):
            raise BudgetExceeded(
                f"{name}: disabled or over monthly cap "
                f"(spend={self.spend(name):.2f}, cap={self.cap(name):.2f})"
            )

    # -- dashboard -----------------------------------------------------------
    def status(self, name: str) -> LineItemStatus:
        spend, cap = self.spend(name), self.cap(name)
        return LineItemStatus(
            name=name,
            enabled=self.feature_enabled(name),
            spend_usd=round(spend, 2),
            cap_usd=round(cap, 2),
            remaining_usd=round(max(0.0, cap - spend), 2),
            over_cap=spend >= cap,
            allowed=self.allowed(name),
            burn_rate=round(spend / cap, 3) if cap else 0.0,
        )

    def snapshot(self) -> list[LineItemStatus]:
        return [self.status(n) for n in LINE_ITEMS]

    def reset(self) -> None:
        with self._lock:
            self._spend = dict.fromkeys(LINE_ITEMS, 0.0)


_GUARD: BudgetGuard | None = None


def get_budget_guard() -> BudgetGuard:
    """Process-wide budget guard singleton."""
    global _GUARD
    if _GUARD is None:
        _GUARD = BudgetGuard()
    return _GUARD


def reset_budget_guard() -> None:
    """Rebuild the singleton (used by tests + monthly reset)."""
    global _GUARD
    _GUARD = None
