# twin-simulation — Phase 4 What-if Simulation Engine

Simulation is a **"recompute with modified inputs"** feature (blueprint §7), not a
new model. A scenario mutates `InfraEvent` fields on an in-memory sandbox, then the
engine re-runs the exact Phase-2 score + Phase-3 model serving path and diffs
scenario vs baseline, factor by factor.

## Design

- `sandbox.apply_scenario` — applies overrides (shift `expected_year`, change
  `status`, add/remove a hypothetical event) to a **deep copy**; the input list is
  never mutated and nothing is persisted.
- `features.derive_features` / `apply_feature_delta` — map graph-state changes to
  Phase-3 feature deltas (proximity + infra progress), applied on top of the
  locality's current feature vector so predictions genuinely recompute.
- `engine.SimulationEngine` — pure and stateless; takes the score + predict
  callables by **injection** so this package never imports `api`/`ml` (no cycle).
- `diff.diff_envelopes` — baseline vs scenario with per-factor deltas.

Wired at `POST /simulate` in the API (which injects the real Phase-2/3 functions).

## Guarantees (tested)

- No scenario state is ever persisted (the engine has no DB session by design).
- Identical scenario → identical diff (deterministic).
- Recompute reuses the same serving path as Phase 3 (no divergent numbers).
