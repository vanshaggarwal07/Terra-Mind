# Phase 3 — Prediction / ML Engine

**Goal:** add trustworthy ML forecasts (price, traffic, flood, water, AQI) that emit the standard envelope, serve them behind an API that enforces confidence bands + disclaimers, and upgrade the copilot to explain ML outputs with citations.

**Entry state:** Phases 1–2 have been running live long enough to accumulate real historical data. **Do not start Phase 3 on thin data** — shipping ML early with sparse inputs produces wrong answers and permanently kills trust (blueprint §1, §5).
**Exit state:** each model trains reproducibly, is versioned, and serves predictions as the standard envelope; the API refuses to emit a bare number; the copilot explains predictions grounded in `contributing_factors` + source facts.

**Blueprint sections implemented:** §5 (all models + accuracy framing), §6 (full RAG copilot).

> Hard rule from §5: **the LLM never produces the numbers.** Numbers come from tabular/time-series/hydrological models. The LLM only explains them.

---

### P3.1 — Feature store / training-data pipeline

**Context:** Models need clean, versioned features assembled from accumulated warehouse + ingestion data.

**Task:** Build a feature pipeline in `packages/ml` that assembles, versions, and materializes training/serving feature tables from the warehouse.

**Tech constraints:**
- Feature builders per domain drawing on §5 inputs: historical prices, infra events, inflation, rental yield, builder track record (price); Maps/historical traffic, road width, new infra (traffic); elevation/DEM, rainfall, drainage, CWC records (flood); CGWB + population + rainfall (water); CPCB + proximity to highways/airport/industry (AQI).
- Point-in-time correctness: features for a training row must reflect only data known as of that row's timestamp (no leakage) — leverage `first_seen_at`/`last_verified_at`.
- Materialize to versioned feature tables (or Parquet in object storage) with a `feature_set_version`.
- A `dataset_card` per feature set documenting coverage, date range, row counts, and known gaps (feeds the honesty framing in §5).

**Deliverables:** feature-builder modules per domain + materialization jobs (Dagster assets) + dataset cards + tests for point-in-time correctness.

**Acceptance criteria:**
- Feature tables materialize deterministically for a given version + as-of date.
- A leakage test proves no future data enters a training row.
- Dataset card reports coverage + gaps per feature set.

**Depends on:** P1.x (accumulated data), P2.1.

---

### P3.2 — Standard prediction envelope + model registry/versioning

**Context:** §5 mandates every model output the **same envelope** so the explanation layer works cleanly. We also need reproducible versioning.

**Task:** Define the shared envelope contract + a model registry that versions trained artifacts and metadata.

**Tech constraints:**
- Envelope (exact, §5):
  ```json
  {
    "prediction": null,
    "confidence": 0.0,
    "contributing_factors": [{"factor": "", "weight": 0.0}],
    "model_version": ""
  }
  ```
  Implement as a Pydantic model reused by ALL models + the serving API. `prediction` for advisory numbers must be expressible as a **range/band**, not only a scalar (§5 accuracy framing).
- Model registry: store artifacts (object storage) + metadata (DB table) — `model_version`, feature_set_version, training date, metrics, confidence-calibration params. Support load-by-version.
- Reuse the existing `future-intelligence-score-v1-rules` envelope (P2.3) so the rule score and ML models are interchangeable to consumers.

**Deliverables:** envelope Pydantic contract + registry module + `model_registry` migration + tests.

**Acceptance criteria:**
- All models (P3.3–P3.7) import and emit the identical envelope type.
- A model can be saved, versioned, and reloaded by version for serving.
- `contributing_factors` is required and non-empty for every served prediction.

**Depends on:** P0.2, P2.3.

---

### P3.3 — Price model (XGBoost / LightGBM)

**Context:** §5 price row. Tabular gradient boosting — **not** an LLM for the number.

**Task:** Train, calibrate, and package a price-estimation model emitting the envelope with a confidence band.

**Tech constraints:**
- XGBoost or LightGBM on the price feature set (P3.1). Target = price/price-per-sqft (or appreciation), framed as a **range** with calibrated confidence, never a point number (§5, §13).
- `contributing_factors` derived from model feature importances / SHAP so the copilot explanation matches the actual drivers.
- Time-based train/validation split (no leakage); report MAE/MAPE + calibration.
- Package to the registry (P3.2) with `model_version`; expose a `predict(features) -> Envelope`.
- Accuracy framing baked in: 1–5yr = moderate confidence range; 10yr+ = directional only, never a specific number (§5).

**Deliverables:** training script + calibration + SHAP factor extraction + registry packaging + eval report + tests.

**Acceptance criteria:**
- Model trains reproducibly and registers with metrics.
- `predict` returns a band + confidence + factors — never a bare scalar.
- Factors trace to real feature importances.

**Depends on:** P3.1, P3.2.

---

### P3.4 — Traffic model

**Context:** §5 traffic row — time-series + graph-based; needs 1–2 years of accumulated traffic history to be meaningful.

**Task:** Train a traffic-forecast model emitting the envelope, gated on data sufficiency.

**Tech constraints:**
- Time-series (and/or graph-based over the road network) on traffic features (P3.1): historical traffic, road width, new infra events.
- **Data-sufficiency gate:** if accumulated history < threshold (e.g. <12–24 months), the model refuses to serve a forecast and returns a low-confidence "insufficient data" envelope rather than a misleading number (§5).
- Envelope + factors as per P3.2.

**Deliverables:** training + serving module + sufficiency gate + eval + tests.

**Acceptance criteria:**
- With insufficient history, serves an explicit low-confidence/insufficient-data envelope, not a fabricated forecast.
- With sufficient history, produces a calibrated banded forecast + factors.

**Depends on:** P3.1, P3.2.

---

### P3.5 — Flood model

**Context:** §5 flood row — hydrological + classifier; **high liability if wrong — keep conservative confidence bands.**

**Task:** Train/assemble a flood-risk model emitting the envelope with deliberately conservative confidence.

**Tech constraints:**
- Combine a hydrological approach (elevation/DEM, drainage, rainfall) with a classifier over CWC flood records (P3.1).
- Conservative calibration: bias toward wider/lower-confidence bands; never output a falsely precise risk (§5, §13 liability).
- Envelope + factors; include a prominent risk disclaimer flag consumed by the API/UI.

**Deliverables:** flood model training/inference + conservative calibration + eval + tests.

**Acceptance criteria:**
- Output is a risk band with conservative confidence + a disclaimer flag.
- No overconfident point risk is ever emitted (test-enforced ceiling on confidence).

**Depends on:** P3.1, P3.2.

---

### P3.6 — Water / groundwater model

**Context:** §5 water row — regression/trend over CGWB data, population growth, rainfall.

**Task:** Train a groundwater trend/regression model emitting the envelope.

**Tech constraints:**
- Regression/trend on CGWB + population + rainfall features (P3.1).
- Envelope + factors; band + confidence per P3.2.

**Deliverables:** training/inference module + eval + tests.

**Acceptance criteria:**
- Produces a banded trend estimate + factors + confidence.
- Reproducible + registered by version.

**Depends on:** P3.1, P3.2.

---

### P3.7 — Noise / AQI model

**Context:** §5 noise/AQI row — regression over CPCB data + proximity to highways/airport/industry.

**Task:** Train an AQI/noise regression model emitting the envelope.

**Tech constraints:**
- Regression on CPCB + proximity features (P3.1). Proximity computed via PostGIS (P2.1).
- Envelope + factors; band + confidence per P3.2.

**Deliverables:** training/inference module + eval + tests.

**Acceptance criteria:**
- Produces a banded AQI/noise estimate + factors + confidence.
- Reproducible + registered by version.

**Depends on:** P3.1, P3.2.

---

### P3.8 — Prediction serving API (bands + disclaimers enforced at the boundary)

**Context:** §5 accuracy framing + §13: users must never see a bare number without a band + disclaimer. Enforce this at the API boundary, not just in the UI.

**Task:** Build the FastAPI prediction endpoints serving each model's envelope, with band + disclaimer enforcement.

**Tech constraints:**
- Endpoints in `packages/api` (`/predictions/price`, `/traffic`, `/flood`, `/water`, `/aqi`) resolving model versions from the registry (P3.2) and returning the envelope.
- Boundary enforcement middleware: reject/transform any response where `prediction` is a bare scalar lacking a band, or where a disclaimer is missing. Attach horizon-appropriate framing (1–5yr range vs 10yr+ directional).
- Version pinning + fallback: if a model is unavailable, return an explicit low-confidence/unavailable envelope, not an error the UI might mishandle.

**Deliverables:** prediction routers + enforcement middleware + schemas + tests (including a test that a bare number is rejected/wrapped).

**Acceptance criteria:**
- Every prediction response carries a band + confidence + disclaimer + `model_version`.
- A model returning a bare scalar is caught by middleware and never reaches the client.
- Horizon framing (short-term range vs long-term directional) is applied.

**Depends on:** P3.3–P3.7.

---

### P3.9 — Full RAG copilot upgrade (explains ML with citations)

**Context:** §6. Upgrade the MVP copilot (P2.6) to explain ML predictions — still grounded, still cited, still never generating the numbers itself.

**Task:** Extend the copilot to retrieve prediction envelopes (P3.8) alongside facts + chunks, and explain the number using its `contributing_factors` + underlying source facts.

**Tech constraints:**
- Retrieval now includes: structured facts (P2.1) + `doc_chunks` (pgvector) + relevant prediction envelopes (P3.8).
- The LLM explains the prediction strictly from the envelope's `contributing_factors` and cited facts — it must quote the model's number/band, never compute or alter it (§5, §6).
- Every explanation cites both the model version and the source facts behind the factors.
- Guardrail tests: the copilot cannot state a number that differs from the served envelope, and cannot upgrade a builder fact into a verdict.

**Deliverables:** upgraded copilot retrieval + prompt assembly + citation of model version + tests.

**Acceptance criteria:**
- Copilot explanations reuse the exact served band/confidence — no divergent numbers.
- Explanations cite `model_version` + source facts.
- Out-of-data / unsupported prediction requests are refused honestly.

**Depends on:** P2.6, P3.8.

---

### P3.10 — Model monitoring, evaluation, and accuracy-framing guards

**Context:** §5 (be honest with users, always) + §13 (users treat predictions as guarantees). We need ongoing eval + drift detection + enforced framing.

**Task:** Add model monitoring, backtesting, drift detection, and automated framing/guard checks.

**Tech constraints:**
- Scheduled backtests comparing past predictions to realized outcomes as data arrives; track MAE/MAPE/calibration per model over time.
- Drift detection on input feature distributions + prediction distributions; alert on significant drift (retrain trigger).
- Automated guard tests in CI: no model may emit a bare number; confidence ceilings for flood (P3.5); horizon-framing correctness (10yr+ directional only).
- A monitoring dashboard (extend `/ops` from P1.11) showing per-model accuracy trend, calibration, and drift.

**Deliverables:** backtest jobs + drift detectors + CI guard tests + monitoring dashboard panels.

**Acceptance criteria:**
- Backtests run on schedule and populate per-model accuracy trends.
- Drift beyond threshold fires an alert.
- CI fails if any model violates band/confidence/horizon-framing rules.

**Depends on:** P3.3–P3.8; dashboard from P1.11.
