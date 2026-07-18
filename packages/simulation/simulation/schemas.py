"""Scenario input + diff output DTOs (blueprint §7, P4.1)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from warehouse.schemas import PredictionEnvelope

# Domains the simulation can recompute (Phase-3 models + the Phase-2 score).
DEFAULT_DOMAINS = ("price", "aqi", "flood", "traffic", "water")


class EventOverride(BaseModel):
    """A mutation of one existing infra event in the scenario sandbox."""

    event_id: str
    expected_year: int | None = None  # shift the completion year
    status: str | None = None  # e.g. proposed -> approved -> operational
    remove: bool = False  # drop the event entirely (what-if it never happens)


class HypotheticalEvent(BaseModel):
    """A brand-new infra event that does not exist in the warehouse."""

    type: str  # metro | rrts | road | airport | ...
    status: str = "approved"
    expected_year: int | None = None
    distance_km: float | None = None
    lat: float | None = None
    lng: float | None = None
    confidence: float = 0.7


class Scenario(BaseModel):
    """A what-if scenario: overrides + additions scoped to a locality."""

    overrides: list[EventOverride] = Field(default_factory=list)
    add_events: list[HypotheticalEvent] = Field(default_factory=list)
    horizon_years: int | None = None
    domains: list[str] = Field(default_factory=lambda: list(DEFAULT_DOMAINS))

    def is_empty(self) -> bool:
        return not self.overrides and not self.add_events


class FactorDelta(BaseModel):
    factor: str
    baseline_weight: float = 0.0
    scenario_weight: float = 0.0
    delta: float = 0.0


class EnvelopeDiff(BaseModel):
    """Baseline vs scenario for one metric, with factor-level deltas."""

    metric: str  # "score" | "price" | ...
    baseline: PredictionEnvelope
    scenario: PredictionEnvelope
    prediction_delta: float
    low_delta: float | None = None
    high_delta: float | None = None
    confidence_delta: float
    factor_deltas: list[FactorDelta] = Field(default_factory=list)


class SimulationResult(BaseModel):
    locality_id: str | None = None
    score: EnvelopeDiff
    predictions: dict[str, EnvelopeDiff] = Field(default_factory=dict)
    disclaimer: str = (
        "Hypothetical what-if only. This explores how forecasts would change IF the "
        "selected infrastructure changes occurred — it is not a prediction that they "
        "will, and no scenario is saved. Estimate, not investment advice."
    )
