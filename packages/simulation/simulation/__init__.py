"""Phase 4 — What-if Simulation Engine (blueprint §7).

Simulation is a "recompute with modified inputs" feature, not a new model. A
scenario mutates ``InfraEvent`` fields (shift expected_year, change status,
add/remove a hypothetical event) on an in-memory sandbox — never the real
warehouse — then re-runs the exact Phase-2 score + Phase-3 model serving path and
diffs scenario vs baseline, factor by factor.

To avoid an import cycle with the API/ML layers, the engine takes the score +
predict callables by injection (the API wires the real Phase-2/3 functions in).
"""

from __future__ import annotations

from simulation.engine import SimulationEngine
from simulation.schemas import (
    EnvelopeDiff,
    EventOverride,
    FactorDelta,
    HypotheticalEvent,
    Scenario,
    SimulationResult,
)

__all__ = [
    "SimulationEngine",
    "Scenario",
    "EventOverride",
    "HypotheticalEvent",
    "SimulationResult",
    "EnvelopeDiff",
    "FactorDelta",
]
