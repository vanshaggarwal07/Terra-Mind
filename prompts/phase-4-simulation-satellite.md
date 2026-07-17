# Phase 4 — Simulation Engine + Satellite Change-Detection CV

**Goal:** add the what-if simulation engine (recompute predictions with modified graph state) and the satellite change-detection pipeline (a pattern-based construction signal). Both are the most advanced and expensive components — attempt only after Phases 1–3 are stable.

**Entry state:** Phase 3 models trained + stable + served via the envelope API.
**Exit state:** users can move sliders that mutate `InfraEvent` fields and see before/after predictions diffed; a scheduled CV pipeline pulls Sentinel-2 tile pairs, detects new built-up area, and creates confidence-scored `construction_detected` pattern signals feeding the knowledge graph.

**Blueprint sections implemented:** §7 (simulation), §3.5 (satellite CV).

> §7: simulation is a "recompute with modified inputs" feature, not a new model — it only works because Phase 3 models exist. §3.5: satellite CV is genuinely hard/expensive (compute + labeled data) — budget real time; do not attempt before this phase.

---

### P4.1 — Simulation engine (mutate → recompute → diff)

**Context:** §7. Sliders modify one or more `InfraEvent` fields (e.g. `expected_year: 2030 → 2032`) → re-run the Section-5 models against the modified graph state → diff against baseline.

**Task:** Build a simulation engine in `packages/simulation` that applies scenario overrides to graph state and recomputes predictions without mutating persisted data.

**Tech constraints:**
- Scenario input: a set of overrides on `InfraEvent` fields (expected_year, status, add/remove a hypothetical event) scoped to a locality/property.
- Apply overrides to an **in-memory / transactional-sandbox** copy of the relevant graph state — never persist scenario changes to the real warehouse.
- Recompute: invoke the Phase-3 models (P3.3–P3.7) + the Future Intelligence Score (P2.3) against the modified state, reusing the exact serving path (envelope output).
- Diff: return baseline vs scenario envelopes with per-factor deltas, so the UI can show what changed and why.
- Determinism: identical scenario → identical diff. Guard against leaking scenario state into other requests.

**Deliverables:** simulation service (scenario model, sandbox state builder, recompute orchestrator, diff formatter) + API endpoint (`POST /simulate`) + tests proving no persistence + deterministic diffs.

**Acceptance criteria:**
- Applying an override recomputes predictions and returns baseline vs scenario with factor-level deltas.
- No scenario override is ever written to the real warehouse (test-enforced).
- Recompute reuses the same model-serving path as Phase 3 (no divergent numbers).

**Depends on:** P2.3, P3.3–P3.8.

---

### P4.2 — Simulation slider UI (before/after)

**Context:** §7 + §8. The sketched sliders that let users explore scenarios.

**Task:** Build the simulation UI: sliders/controls that build a scenario, call `/simulate`, and render before/after.

**Tech constraints:**
- Controls on the locality page (`/locality/[id]`): sliders/inputs for editable `InfraEvent` fields (e.g. shift a metro's expected year, toggle status), plus add/remove hypothetical event.
- Render baseline vs scenario side-by-side using `<ConfidenceBand>` + the factor-delta breakdown from P4.1 (reuse the score/prediction card components).
- Persistent `<Disclaimer>`: this is a hypothetical what-if, not a forecast of actual policy.
- Debounce recompute calls; show loading/diff states clearly.

**Deliverables:** simulation panel + controls + before/after render + integration on the locality page + tests.

**Acceptance criteria:**
- Moving a slider updates the before/after prediction with factor deltas.
- Bands + disclaimer are always shown; the hypothetical nature is explicit.
- No scenario is persisted server-side (consistent with P4.1).

**Depends on:** P4.1, P2.7, P2.10.

---

### P4.3 — Satellite fetcher (Sentinel-2 + Bhuvan backup)

**Context:** §3.5. Sentinel-2 (free, 10m, 5-day revisit) via Copernicus for baseline; Bhuvan (ISRO) as India-specific alternate. Runs as a periodic batch, not real-time (§9).

**Task:** Implement `satellite_fetcher` to pull tile pairs (T0 vs T-6-months) for each tracked locality, through the cache layer, on a schedule matching the revisit cycle.

**Tech constraints:**
- `@register_crawler("satellite")` (or a dedicated batch asset) fetching Sentinel-2 tiles for tracked locality geometries via the Copernicus API; Bhuvan fallback configured via `sources.config`.
- TTL/cadence = 5–10 days (matches revisit, §3.3). Store tiles in object storage via the cache layer, keyed by locality + capture date.
- Pull **pairs**: current tile + a ~6-months-prior tile per locality for change detection (P4.4).
- Respect API quotas/licenses (open license, §3.1); backoff + honest UA.

**Deliverables:** satellite fetcher/batch asset + tile-pair storage + Dagster schedule + tests (mocked API).

**Acceptance criteria:**
- Fetches T0 vs T-6mo tile pairs per tracked locality into object storage on schedule.
- Honors cadence/TTL and API quotas; Bhuvan fallback path exercised in a test.

**Depends on:** P1.2, P1.3.

---

### P4.4 — Change-detection CV model (segmentation + training/labeling)

**Context:** §3.5. A semantic-segmentation model distinguishing vegetation / bare-land / built-structure, run on tile pairs to flag new built-up area. Hard + expensive — budget for labeled data + GPU.

**Task:** Build the change-detection CV pipeline in `packages/cv`: a segmentation model + a labeling/training workflow + tile-pair change inference.

**Tech constraints:**
- PyTorch semantic-segmentation model (e.g. U-Net/DeepLab) trained to classes {vegetation, bare_land, built_structure}. Support transfer learning from a pretrained backbone to reduce labeled-data needs.
- Labeling workflow: a documented process + tooling to build a labeled tile dataset for the corridor (small seed set acceptable; document how to grow it).
- Change detection: segment T0 and T-6mo tiles → diff class maps → flag tiles/regions where `bare_land`/`vegetation` → `built_structure` → produce change polygons with a confidence score.
- Runs as scheduled GPU **spot batch** jobs, not always-on (§9).
- Reproducible training (versioned like Phase-3 models); report segmentation metrics (IoU) + change-detection precision on a validation set.

**Deliverables:** segmentation model + training script + labeling tooling/docs + change-inference module + eval report + tests.

**Acceptance criteria:**
- Model trains reproducibly and reports IoU + change-detection precision on a validation set.
- Running inference on a tile pair produces confidence-scored change polygons for new built-up area.
- Batch runs are GPU-spot-friendly (checkpointing, resumable).

**Depends on:** P4.3.

---

### P4.5 — CV → `construction_detected` pattern-signal integration

**Context:** §3.5. CV output feeds the knowledge graph as a **pattern-based (not fact-based)** signal — clearly lower-trust than official records.

**Task:** Convert change-detection outputs into `construction_detected` events in the warehouse, geocoded + confidence-scored, explicitly marked pattern-based.

**Tech constraints:**
- Geocode each change polygon → map to locality/property; create a `construction_detected` infra event (or a dedicated signal row) with `source_tier="pattern_cv"`, a confidence score, capture dates, and links to the tile pair.
- **Never** let a CV signal alone set `verified=true` or drive a builder verdict — it is corroborating/early signal only, subject to the same review-queue gate (P1.9) for anything high-stakes.
- Surface these signals distinctly in the API/UI (labeled "detected from satellite imagery — pattern signal, not official record") so users understand the trust tier.
- Feed the signal into the score/prediction inputs only with an appropriately low weight.

**Deliverables:** CV-to-warehouse integration + `source_tier` tagging + review-queue routing for high-stakes cases + API/UI surfacing + tests.

**Acceptance criteria:**
- Change polygons become geocoded, confidence-scored `construction_detected` signals tagged `pattern_cv`.
- No CV signal alone flips a fact to verified or produces a builder judgment (test-enforced).
- The UI clearly labels these as satellite-derived pattern signals, distinct from official facts.

**Depends on:** P4.4, P1.9, P2.1.
