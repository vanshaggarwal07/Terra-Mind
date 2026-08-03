# Phase 2 — Interactive Digital Twin (facts only, no ML)

**Goal:** ship the 5 MVP v1 features on top of verified facts only — Locality Future Timeline, Future Intelligence Score v1 (rule-weighted), Metro/Airport/Expressway proximity card, UP-RERA builder record card, and the AI Property Copilot (RAG over structured data only). This is the demoable product.

**Entry state:** Phase 1 running — verified `infra_events`, `builders`, `localities`, and `doc_chunks` embeddings exist.
**Exit state:** a Next.js app renders a map, a per-locality Gantt timeline, a Future Intelligence Score card with an expandable "why", a cited RERA builder card, a proximity impact card, and a grounded copilot chat — all backed by FastAPI endpoints that expose **only `verified=true` facts** with citations, confidence bands, and disclaimers.

**Blueprint sections implemented:** §1 (MVP 5 features), §4 (schema/graph), §6 (RAG copilot — MVP subset), §8 (frontend/UI).

> Explicitly out of scope here (deferred to Phase 3+): price/traffic/flood/AQI ML, satellite CV, simulation sliders (§1). Do not add them.

---

### P2.1 — Knowledge-graph repository layer (PostGIS)

**Context:** Schema exists (P0.2). The API needs a clean, reusable data-access layer for the entities + edges in §4 — kept in Postgres/PostGIS (no separate graph DB for v1, per §4).

**Task:** Build a repository layer in `packages/warehouse` exposing typed query methods for localities, infra events, builders, gov bodies, and their relationships, including geospatial queries.

**Tech constraints:**
- Repositories: `LocalityRepo`, `InfraEventRepo`, `BuilderRepo`, `GovBodyRepo`, plus an `EdgesRepo` for `AFFECTS`/`DEVELOPS`/`APPROVED_BY`.
- **Only expose `verified=true` infra events** via public read methods (a separate `include_unverified` flag reserved for internal/review use).
- Geospatial methods via PostGIS: `infra_events_within_km(point, km)`, `nearest_infra_by_type(point, type)`, `localities_containing(point)`, `distance_km(a, b)`.
- A materialization helper that computes + upserts `infra_event_affects_locality` edges (distance-based, within a configurable radius, e.g. 3–5 km).
- All methods typed + Pydantic-modeled results carrying the `source_id` / `source_document` citation.

**Deliverables:** repository modules + edge-materialization job + tests against a seeded test DB.

**Acceptance criteria:**
- Geospatial queries return correct results on seeded fixtures (verified via known distances).
- Public read methods never return `verified=false` rows.
- Every returned fact carries its source citation.

**Depends on:** P0.2, P0.3; real data from P1.8/P1.9.

---

### P2.2 — Digital Twin Facts API + Locality Future Timeline endpoint

**Context:** Feature 1 of the MVP (§1): the Locality Future Timeline (approved infra + expected years, factual, Layer-1 only).

**Task:** Build the FastAPI facts endpoints, including the timeline endpoint powering the Gantt UI.

**Tech constraints:**
- Endpoints in `packages/api`:
  - `GET /localities` and `GET /localities/{id}` (geometry + metadata).
  - `GET /localities/{id}/timeline` → ordered list of verified infra events affecting the locality, each with `type`, `status`, `expected_year`, `confidence`, and a **citation** to the source document. Group/sort by year for a Gantt render.
  - `GET /infra-events` with geospatial + type/status filters.
- Responses include an explicit `data_layer: "factual"` marker and a source citation on every event (§0: report facts, cite sources).
- Pagination + OpenAPI docs.

**Deliverables:** facts router + response schemas + tests.

**Acceptance criteria:**
- `GET /localities/{id}/timeline` returns only verified events with year + status + citation, ordered for timeline rendering.
- No unverified event ever appears.
- OpenAPI schema documents citation fields.

**Depends on:** P2.1.

---

### P2.3 — Future Intelligence Score v1 (rule-weighted, no ML)

**Context:** Feature 2 (§1): a weighted sum of confirmed signals — explicitly **no ML yet**. The score must emit the standard envelope so the "why" can never drift from the number (§8).

**Task:** Implement a deterministic, rule-weighted scoring engine for a locality and expose it via API.

**Tech constraints:**
- Pure function: inputs = verified infra events affecting the locality (count/type/status/proximity/expected_year recency) → output the **standard prediction envelope** (blueprint §5):
  ```json
  {
    "prediction": 0.0,
    "confidence": 0.0,
    "contributing_factors": [{"factor": "", "weight": 0.0}],
    "model_version": "future-intelligence-score-v1-rules"
  }
  ```
- Weights are explicit config (e.g. approved metro within 2 km > proposed mall 5 km away), documented and versioned. No opaque logic.
- `contributing_factors` are generated from the same data used to compute the score (§8) — the UI reads these directly; never hand-write explanations.
- `confidence` reflects data completeness/recency, not a guess.
- `GET /localities/{id}/score` returns the envelope.

**Deliverables:** `packages/api` (or `packages/warehouse`) scoring module + config + endpoint + tests (including golden tests pinning score for a known fixture locality).

**Acceptance criteria:**
- Score is deterministic and reproducible for identical inputs.
- `contributing_factors` sum/align with the computed score and are derived, not hardcoded.
- Changing an input event changes both the score and its factors consistently.

**Depends on:** P2.1, P2.2.

---

### P2.4 — UP-RERA Builder record card API (facts, not verdicts)

**Context:** Feature 4 (§1) and the highest legal-risk surface (§0, §13). Surface official regulator records verbatim with citations — never a computed judgment.

**Task:** Build the builder record endpoint returning UP-RERA-sourced facts with sources.

**Tech constraints:**
- `GET /builders/{id}` and `GET /builders?rera_id=` → registration status, registered projects + timelines, delay history, complaint/litigation flags — **each field carrying its RERA source URL + fetch date**.
- Absolutely no derived "trust score", ranking, or adjectival judgment fields. If a consumer wants a summary, the copilot may summarize the cited facts (P2.6) but the API returns facts only.
- Include an explicit disclaimer field: records are sourced from UP-RERA public data as of `<last_verified_at>`.

**Deliverables:** builder router + schemas + tests asserting no verdict/score fields exist.

**Acceptance criteria:**
- Response contains only sourced, cited facts + fetch dates + disclaimer.
- A test fails the build if any judgment/score field is added to the builder response.
- Every fact is traceable to a RERA source URL.

**Depends on:** P2.1; data from P1.6.

---

### P2.5 — Metro/Airport/Expressway proximity impact card API

**Context:** Feature 3 (§1): proximity impact card for the three highest-impact infra classes in this corridor.

**Task:** Build an endpoint computing, for a property/locality, distance + status + expected year for the nearest metro, the Jewar airport, and the nearest expressway/RRTS, with an impact summary drawn from verified events.

**Tech constraints:**
- `GET /localities/{id}/proximity` (and/or `?lat=&lng=`) → for each of `{metro, airport, expressway/rrts}`: nearest verified event, `distance_km`, `status`, `expected_year`, citation.
- Use the PostGIS proximity methods (P2.1). Impact framing must be factual (distance + status), not a predicted price effect (that is Phase 3).
- Include confidence + disclaimer consistent with the rest of the API.

**Deliverables:** proximity router + schemas + tests with known-distance fixtures.

**Acceptance criteria:**
- Returns correct nearest metro/airport/expressway with accurate distances + citations.
- No predicted monetary impact is asserted (facts only at MVP).

**Depends on:** P2.1.

---

### P2.6 — MVP AI Property Copilot (RAG over structured data only)

**Context:** Feature 5 (§1) and §6. The copilot explains/answers using **only** retrieved structured facts + cited chunks from your own data — never the open web, and never generating domain numbers.

**Task:** Build the RAG copilot endpoint: retrieve structured facts (SQL/PostGIS) + relevant `doc_chunks` (pgvector) → assemble grounded, cited context → LLM explains strictly from that context.

**Tech constraints:**
- Pipeline (exactly §6):
  1. Parse the query → identify locality/builder/topic.
  2. Retrieve structured facts from the warehouse (P2.1) + top-k `doc_chunks` by vector similarity.
  3. Assemble grounded context = facts + citations.
  4. LLM generates an explanation **only** from retrieved context (no open-ended generation); refuses / says "not in my data" when unsupported.
  5. Response includes **inline source citations** to the original gov document/news item.
- Guardrails: the copilot must NOT produce price/traffic/flood numbers (those are Phase 3 ML), and must NOT render a builder verdict — it may summarize cited RERA facts only.
- Vendor-agnostic LLM client (check pricing at build time per §6); temperature low; structured citation objects in the response.
- Streaming response supported for the chat UI.

**Deliverables:** `packages/api` copilot router + retrieval + prompt assembly + citation formatting + tests (including a test that an unsupported question is refused rather than hallucinated).

**Acceptance criteria:**
- Answers are grounded: every claim maps to a retrieved fact/chunk citation.
- Asking something outside the dataset yields an honest "not in my data" rather than a fabricated answer.
- The copilot never emits a numeric price/flood/traffic prediction or a builder verdict.

**Depends on:** P2.1, P2.2, P1.8 (embeddings).

---

### P2.7 — Next.js app scaffold, design system, and trust UI primitives

**Context:** §8. The frontend must make disclaimers + confidence first-class, not afterthoughts (§0.2, §13).

**Task:** Scaffold the web app structure, a small design system, and reusable trust primitives used across every feature.

**Tech constraints:**
- Next.js App Router + TypeScript (from P0.1). Typed API client generated from the FastAPI OpenAPI schema.
- Design system: layout shell, theme, typography, and components (Card, Badge, Table, Tabs).
- **Trust primitives (mandatory, reused everywhere):**
  - `<ConfidenceBand>` — renders a range + confidence level, never a bare point number (§5, §13).
  - `<Disclaimer>` — "estimate, not investment advice" style banners for any predictive/advisory content.
  - `<Citation>` — inline source link + fetch date, used by facts, builder card, and copilot.
- App routes stubbed: `/`, `/locality/[id]`, `/builder/[id]`, `/copilot`, `/review` (P1.9), `/ops` (P1.11).

**Deliverables:** web app shell, API client, design-system + trust primitive components, route stubs, component tests/stories.

**Acceptance criteria:**
- App builds and typechecks; API client is generated from OpenAPI.
- `<ConfidenceBand>` refuses to render a bare point number (renders a range/qualifier).
- `<Citation>` and `<Disclaimer>` are reusable and used by later feature pages.

**Depends on:** P0.1; API contracts from P2.2–P2.6.

---

### P2.8 — Map layer (Deck.gl + Mapbox)

**Context:** §8: Deck.gl handles large geospatial overlays better at scale; Mapbox GL JS as the base map.

**Task:** Build the interactive corridor map: base map + locality polygons + infra-event markers, with click-through to locality detail.

**Tech constraints:**
- Deck.gl layers over a Mapbox base, centered on the Noida–Greater Noida–Yamuna Expressway–Jewar corridor.
- Render `localities` polygons + verified `infra_events` as typed markers (color/icon by `type`, styling by `status`).
- Click a locality → navigate to `/locality/[id]`; hover → tooltip with name + top signals.
- Data from the facts API (P2.2); handle loading/empty states.
- Mapbox token via env (documented in `.env.example`).

**Deliverables:** map component + layers + tooltip/interaction + integration into `/` and `/locality/[id]`.

**Acceptance criteria:**
- Map renders localities + verified infra events for the corridor.
- Clicking a locality routes to its detail page; unverified events are absent.

**Depends on:** P2.7, P2.2.

---

### P2.9 — Locality Future Timeline (Gantt) — also the PoC demo page

**Context:** Feature 1 UI (§1, §8) and the blueprint's Section-11 proof-of-concept (a static timeline for one sector, e.g. Sector 22D, from hand-entered data).

**Task:** Build the custom Gantt-style horizontal timeline component (years across, project bars per locality) and wire it to the timeline API.

**Tech constraints:**
- Custom horizontal Gantt: x-axis = years; each verified infra event = a bar positioned by `expected_year`/status, colored by `type`, with a `<Citation>` and `<ConfidenceBand>` on hover/expand.
- Support a **hand-entered-data mode** (static JSON for one sector) so the PoC demo (§11.5) works before automation is complete — same component, data source swappable.
- Rendered on `/locality/[id]`; empty/partial-data states handled gracefully.

**Deliverables:** timeline component + static-data mode + integration on the locality page + a Sector-22D demo fixture.

**Acceptance criteria:**
- Timeline renders verified events across years with citations + confidence on each bar.
- The Sector-22D static PoC page renders without any backend automation.

**Depends on:** P2.7, P2.2.

---

### P2.10 — Future Intelligence Score card + expandable "why"

**Context:** Feature 2 UI (§1, §8). The "why" breakdown pulls directly from `contributing_factors` so it can never drift from the number.

**Task:** Build the score card showing the Future Intelligence Score with an expandable breakdown driven by the envelope's `contributing_factors`.

**Tech constraints:**
- Card shows the score with a `<ConfidenceBand>` (never a bare number) and a `<Disclaimer>`.
- Expandable "why": renders each `contributing_factor` (factor + weight) **directly from the API envelope** (P2.3) — no hand-written copy.
- Each factor links to the underlying facts/citations where applicable.

**Deliverables:** score-card component + expand interaction + integration on `/locality/[id]`.

**Acceptance criteria:**
- The "why" list is generated from `contributing_factors`, not hardcoded.
- Editing weights/data server-side changes the displayed breakdown with no frontend edits.
- Score is shown with confidence framing + disclaimer.

**Depends on:** P2.7, P2.3.

---

### P2.11 — Copilot chat UI

**Context:** Feature 5 UI (§1, §6). Chat over the grounded, cited copilot (P2.6).

**Task:** Build the copilot chat interface with streaming answers and rendered inline citations.

**Tech constraints:**
- Chat UI on `/copilot` (and an embeddable panel on `/locality/[id]`): streaming responses, message history, and **inline `<Citation>` chips** linking to source documents/news.
- Show a persistent `<Disclaimer>` that answers are grounded in the platform's data and are not investment advice.
- Render honest "not in my data" responses clearly (no fabricated confidence).
- Never render a raw numeric prediction from the copilot (guardrail from P2.6 surfaced in UI).

**Deliverables:** chat components + streaming client + citation rendering + integration.

**Acceptance criteria:**
- User can chat and receive streamed, cited answers.
- Citations are clickable and resolve to sources.
- Out-of-data questions display the honest refusal; disclaimer is always visible.

**Depends on:** P2.7, P2.6.
