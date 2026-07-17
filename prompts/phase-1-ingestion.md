# Phase 1 — Ingestion Layer (the moat)

**Goal:** build the data pipeline that is the actual barrier to entry — a config-driven source registry, the Search → Cache → Verify layer, a source-isolated crawler fleet, the document-intelligence extraction pipeline, the human-review queue, and ingestion observability.

**Entry state:** Phase 0 complete (DB + schema + `common` lib + CI).
**Exit state:** 3+ crawlers run on schedule via Dagster, feed the cache/verify layer, extract structured `infra_events`/`builders` with confidence, route low-confidence/high-stakes items to a review queue, and only verified facts land in the warehouse. Dashboards show crawl health, cache hit-rate, and extraction-confidence.

**Blueprint sections implemented:** §3 (all), §3.1 (registry), §3.2 (fleet), §3.3 (cache/verify), §3.4 (doc intelligence), §3.6 (news/social), §13 (risk mitigations).

> Build order matters: **P1.1 → P1.2 → P1.3 first** (the reusable substrate), then crawlers, then extraction, then review + observability. The blueprint's "pick 3 sources" = P1.4, P1.5, P1.6.

---

### P1.1 — Source Registry (config table + seed + admin CRUD)

**Context:** `sources` table exists (P0.2). The blueprint insists sources be data, never hardcoded inside crawlers, so we can add source #41 without touching code (§3.1).

**Task:** Build the source-registry seed data and a thin admin CRUD API/CLI to manage it.

**Tech constraints:**
- Seed all 17 rows from blueprint §3.1 table into `sources` (id, source_name, category, access_method, refresh_cadence, legal_basis, base_url, crawler_key). Ship as an idempotent seed script wired to `make seed`.
- `crawler_key` maps a source row to its crawler class (e.g. `yeida`, `dmrc`, `rera`). The orchestrator resolves crawlers by this key — never by hardcoded targets.
- `config` JSONB per source holds crawler-specific settings (start URLs, selectors, API params, PDF list URL) so behavior is data-driven.
- Admin CRUD: FastAPI router in `packages/api` (`/admin/sources`) + a `manage.py` CLI in `packages/ingestion` for list/add/enable/disable/edit.
- Validate `refresh_cadence` maps to a TTL used later by the cache layer (P1.2).

**Deliverables:** seed script, `sources` Pydantic schemas, admin router + CLI, tests.

**Acceptance criteria:**
- `make seed` populates 17 sources idempotently (re-running does not duplicate).
- `GET /admin/sources` lists them; disabling a source excludes it from orchestration (verified later in P1.3).
- Adding a new source row requires zero code changes to be picked up by the orchestrator.

**Depends on:** P0.2, P0.3.

---

### P1.2 — Search → Cache → Verify shared library

**Context:** This is the heart of the ingestion cost/correctness design (§3.3). It MUST exist before more crawlers, because every crawler reuses it. `raw_cache` table + `storage`/`hashing`/`http` helpers already exist.

**Task:** Implement the freshness-aware cache library in `packages/ingestion/ingestion/cache/` exactly matching the blueprint's `get_source_data` algorithm.

**Tech constraints:**
- `ttl.py` — `ttl_for_category(category)` per §3.3 (gov master plan 30d, news 1d, tender 7d, satellite 5–10d, air/flood daily, etc.). Read defaults from the source's `refresh_cadence` with category fallbacks.
- `change_hasher.py` — compute content hashes; also a `lightweight_signal(source)` that fetches only a cheap freshness indicator (HTTP `Last-Modified`/`ETag`, RSS timestamp, or hash of a "last updated" element) without a full parse.
- `raw_store_writer.py` — save raw bytes + a normalized `.md` text version to object storage keyed by `source_id + content_hash`, and upsert the `raw_cache` row (duplicates collapse via the unique index).
- `service.py` — implement `get_source_data(source_id)`:
  1. no cache → `full_fetch_and_parse`.
  2. within TTL → return cached structured data (no network).
  3. TTL expired → cheap `lightweight_signal`; if hash unchanged, touch `last_verified_at` and return cached.
  4. change detected → `full_fetch_and_parse` (the only path that triggers expensive parsing/LLM extraction).
- `full_fetch_and_parse` delegates fetching to the crawler (P1.3) and parsing to doc-intelligence (P1.8); keep those responsibilities separated (§3.2).
- Emit metrics: cache hit / lightweight-verify / full-refetch counts (consumed in P1.11).

**Deliverables:** the cache package + comprehensive unit tests covering all four branches with mocked network + storage.

**Acceptance criteria:**
- Tests prove: fresh-within-TTL makes zero network calls; expired-but-unchanged makes only the lightweight call and touches `last_verified_at`; changed content triggers a full re-fetch.
- Re-fetching identical content does not create a duplicate object or `raw_cache` row.
- Cache-decision metrics are recorded per call.

**Depends on:** P0.3, P1.1.

---

### P1.3 — Crawler base class + Dagster orchestration

**Context:** Blueprint §3.2: one microservice per source, orchestrated by Dagster, DAG-per-source scheduled per cadence. Crawlers only fetch raw content + hand off to the cache layer — no parsing.

**Task:** Define the crawler abstraction and the Dagster orchestration that resolves crawlers from the source registry and schedules them by cadence.

**Tech constraints:**
- `BaseCrawler` (abstract) in `packages/ingestion/ingestion/crawlers/base.py` with a registry decorator (`@register_crawler("yeida")`) so `crawler_key` → class resolution is automatic.
- Interface: `fetch_targets(source) -> list[Target]`, `fetch_raw(target) -> RawPayload`, `lightweight_signal(source)`. Crawlers use `common.http` (rate limits, backoff, honest UA, robots.txt). They must NOT parse or interpret.
- Dagster in `packages/ingestion/ingestion/orchestrator/`: a factory that generates one asset/job per active source, with a schedule derived from `refresh_cadence`. Each run calls the cache/verify `get_source_data` flow.
- Per-source isolation: one crawler failing must not fail others (§13). Capture failures as materialization events + alerts (P1.11).
- Local run: `dagster dev` loads the code location; `make` target to launch it.

**Deliverables:** base crawler + registry, Dagster definitions/factory, schedules, a Makefile target, tests for registry resolution + schedule generation.

**Acceptance criteria:**
- `dagster dev` shows one job per active source with the correct schedule.
- Disabling a source (P1.1) removes its job on reload.
- A crawler raising an exception is isolated (marked failed) without aborting sibling jobs.

**Depends on:** P1.1, P1.2.

---

### P1.4 — YEIDA crawler (Master Plan 2041 + GIS portal)

**Context:** First real source (blueprint §11.1). YEIDA publishes the master plan as PDFs + a GIS portal; refresh monthly.

**Task:** Implement `@register_crawler("yeida")` to discover and fetch the master-plan PDFs and GIS layers, handing raw payloads to the cache layer.

**Tech constraints:**
- Discover PDF/document links from the configured start URL(s) in the source's `config`; download each; compute hashes; store raw + normalized `.md` via the cache layer.
- Implement `lightweight_signal` (page "last updated" element or HTTP headers) so monthly re-checks are cheap.
- Respect robots.txt + rate limits (gov sites are fragile — §3.1). Backoff on failure.
- Do NOT parse the PDFs here — that is P1.8.
- Config-driven: all URLs/selectors live in the `sources.config` row, not in code.

**Deliverables:** `crawlers/yeida_crawler.py` + a fixture-based test (saved sample HTML/PDF listing) verifying target discovery + cache hand-off.

**Acceptance criteria:**
- Running the YEIDA job fetches at least the master-plan document(s) and writes raw + `.md` to storage with `raw_cache` rows.
- Second run within TTL performs no full download; after TTL with unchanged content, only the lightweight check runs.
- robots.txt disallowed paths are skipped.

**Depends on:** P1.3.

---

### P1.5 — DMRC / NMRC crawler (metro)

**Context:** Second source (§11.1). DMRC/NMRC publish metro route/tender/press updates; refresh weekly.

**Task:** Implement `@register_crawler("dmrc")` (covering NMRC too via config, or a sibling `nmrc` key) to fetch metro project pages, tenders, and press releases.

**Tech constraints:**
- Same base-crawler contract + cache hand-off as P1.4.
- Handle both site scrape and tender listings (link discovery + pagination as needed).
- `lightweight_signal` via feed/last-updated where available.
- Config-driven URLs/selectors.

**Deliverables:** `crawlers/dmrc_crawler.py` (+ `nmrc` config or crawler) + fixture test.

**Acceptance criteria:**
- Job fetches metro project + tender pages into the cache with correct hashing.
- TTL + verify behavior identical to P1.4.

**Depends on:** P1.3.

---

### P1.6 — UP-RERA crawler (builder/project registry)

**Context:** Third source (§11.1) and the most legally sensitive (§0). We surface official regulator records **verbatim** — registration status, delay history, complaints/litigation flags — never a computed verdict.

**Task:** Implement `@register_crawler("rera")` to fetch UP-RERA project + builder registration records and complaint/delay data.

**Tech constraints:**
- Fetch project registration pages / registry search results; capture registration status, registered dates, promoter/builder name + `rera_id`, project timelines, and any complaint/delay entries — **as published, with the source URL retained**.
- Store raw HTML/PDF + normalized `.md` via the cache layer; keep the exact source citation on every record.
- Config-driven search params; respect robots.txt + rate limits (regulator site).
- Absolutely no scoring/judgment logic in this crawler — it only fetches (§0, §13 defamation risk).

**Deliverables:** `crawlers/rera_crawler.py` + fixture test.

**Acceptance criteria:**
- Job fetches builder/project records with source URLs preserved.
- Raw + `.md` stored; hashes + TTL/verify behavior correct.
- No derived "trust score" field is produced anywhere in this crawler's output.

**Depends on:** P1.3.

---

### P1.7 — Templated remaining crawlers (NHAI, NCRTC, tenders, CPCB, data.gov.in, news)

**Context:** With three crawlers proven, scale the fleet using the same base contract. These correspond to blueprint §3.1 rows 4, 5, 7, 8, 10, 15.

**Task:** Implement crawler classes for: NHAI (highways, site+API), NCRTC (RRTS, site), CPPP/GeM tenders (tender API, daily), data.gov.in (open-data API, weekly), CPCB CAAQMS (air-quality API, daily), and a generic RSS/news crawler (daily).

**Tech constraints:**
- API-based sources (tenders, data.gov.in, CPCB) read endpoints/keys/params from `sources.config`; still route responses through the cache layer (hash the normalized response JSON).
- The news crawler is a reusable RSS + fetch crawler configured per-feed via `config` (multiple feeds → one crawler_key `news`).
- Keep each crawler small and isolated; reuse `common.http`.
- Skip X/Twitter here — social is P1.10 and optional.

**Deliverables:** `crawlers/nhai_crawler.py`, `ncrtc_crawler.py`, `tender_crawler.py`, `datagov_crawler.py`, `cpcb_crawler.py`, `news_crawler.py` + fixture tests each.

**Acceptance criteria:**
- Each new source, once seeded + active, appears as a scheduled Dagster job at the correct cadence with no orchestrator code changes.
- API crawlers correctly hash + cache responses and honor TTL/verify.
- One crawler failing leaves the others running.

**Depends on:** P1.3 (and P1.4–P1.6 as reference).

---

### P1.8 — Document Intelligence pipeline (PDF/DPR → structured JSON)

**Context:** Raw PDFs/pages are cached; now convert them to verified structured facts (§3.4). This is where the LLM extracts — under a strict schema, with confidence — but never invents domain numbers like prices.

**Task:** Build the extraction pipeline: layout-aware parse → TOC-aware chunking → strict-JSON LLM extraction with confidence → embeddings → route to review or warehouse.

**Tech constraints:**
- **Parse:** use a layout-aware document parser (not raw `pypdf`) so tables/maps/multi-column survive (§3.4.1). Store the normalized `.md`.
- **Chunk:** table-of-contents-aware / section-based chunking (§3.4.2), not fixed-size, for planning/legal docs.
- **Extract:** LLM call constrained to this exact JSON schema (from §3.4.3), one record per detected infra project:
  ```json
  {
    "project_type": "metro | road | airport | mall | school | hospital | industrial",
    "location": {"sector": "", "lat": null, "lng": null},
    "status": "proposed | approved | under_construction | operational",
    "expected_completion_year": null,
    "budget_inr_cr": null,
    "source_document": "",
    "extraction_confidence": 0.0
  }
  ```
  Use structured/function-calling output; validate with Pydantic; reject/repair malformed output. The LLM must ground every field in the provided chunk text (no open-web knowledge).
- **Geocode** `location.sector` → lat/lng where possible; map to a `locality_id`.
- **Embed** each chunk into `doc_chunks.embedding` (pgvector) with `section_title` + `source_id` metadata for later RAG (Phase 2/3).
- **Route (gate):** per §3.4.4, any extraction with `extraction_confidence < 0.85` **OR** `status == "approved"` (high-stakes) goes to `review_queue` (`verified=false`). Everything else may be written as an `infra_events` row (still `verified=false` until confirmed — keep the human gate strict for MVP).
- **Labeled test set task:** provide a script/fixture harness to load 20 hand-extracted YEIDA infra events (blueprint §11.4) as ground truth and report extraction precision/recall against them.

**Deliverables:** `packages/ingestion/ingestion/docintel/` (parser, chunker, extractor, geocoder, embedder, router) + Pydantic schema + the labeled-set evaluation harness + tests.

**Acceptance criteria:**
- Feeding a sample master-plan PDF yields schema-valid JSON records with confidence scores.
- Records with confidence < 0.85 or status == approved land in `review_queue`, not directly visible.
- Chunks are embedded into `doc_chunks` and retrievable by vector similarity.
- The eval harness reports precision/recall vs the 20-event labeled set.

**Depends on:** P0.2, P1.2; benefits from P1.4 (YEIDA docs available).

---

### P1.9 — Human-in-the-loop review queue + dashboard

**Context:** The single highest-leverage trust feature (§3.4.4, §13). Nothing binary/high-stakes reaches users unverified.

**Task:** Build the review workflow API + a reviewer dashboard to approve/reject/edit queued extractions, promoting approved ones to `verified=true`.

**Tech constraints:**
- API in `packages/api` (`/review`): list pending items (filter by entity_type, reason, source, confidence), get item with the source citation + raw `.md` excerpt, and decide (approve / reject / edit-then-approve). Approving sets `infra_events.verified=true` (or creates the row from the queued payload); editing lets a human correct extracted fields before approval; all decisions stamp `reviewer` + `decided_at`.
- Dashboard in `apps/web` (`/review`): queue table, a detail view showing extracted fields **side-by-side with the cited source excerpt**, and approve/reject/edit controls. Show confidence + reason prominently.
- Audit: every decision is logged immutably.
- Only `verified=true` facts are exposed by the public facts API (enforced in Phase 2).

**Deliverables:** review API router + schemas, Next.js review dashboard pages, tests.

**Acceptance criteria:**
- A queued low-confidence extraction can be approved, rejected, or edited-then-approved from the UI.
- Approval flips the fact to `verified=true` and it becomes eligible for public display; rejection keeps it hidden.
- Every extracted field is shown next to its source citation before a human decides.
- Decisions are auditable (reviewer + timestamp retained).

**Depends on:** P0.2, P1.8; UI shell benefits from P2.7 (can stub styling if built earlier).

---

### P1.10 — News & social ingestion (lowest-confidence tier)

**Context:** §3.6. News/social provide early signal but are the lowest-confidence tier — a tweet alone never flips a fact to verified.

**Task:** Add NLP entity/event extraction for news (and optional X/social) using the same JSON schema as P1.8 but with a lower confidence ceiling and a `source_tier` marker.

**Tech constraints:**
- News: RSS + fetched articles (from P1.7 `news` crawler) → NLP entity/event extraction into the §3.4 schema, tagged `source_tier="news"` with a capped/attenuated confidence weight (news ≠ official record).
- Social (optional, feature-flagged OFF by default): X/Twitter API integration tagged `source_tier="social"`, **lowest** confidence. Budget note: X API tiers are expensive (§3.6, §13) — keep it optional and off unless explicitly enabled.
- Enforce the rule in code: a `news`/`social`-only signal can never set `verified=true` — it can only create a low-confidence candidate that requires an official corroborating source (or human review) to be promoted.
- Everything still flows through the cache layer + review queue where high-stakes.

**Deliverables:** `docintel` news/social extractors + tiering logic + tests proving the "cannot self-verify" rule; feature flag for social.

**Acceptance criteria:**
- News articles produce low-confidence candidate events with attribution.
- No news/social-only signal can reach `verified=true` without corroboration/review (test-enforced).
- Social integration is behind an off-by-default flag and incurs no cost when disabled.

**Depends on:** P1.7, P1.8, P1.9.

---

### P1.11 — Ingestion observability

**Context:** §9, §13. We need to see crawler health, cache efficiency, and extraction quality over time to catch broken gov-site crawlers and hallucination drift early.

**Task:** Add metrics + dashboards + alerts for the ingestion layer.

**Tech constraints:**
- Emit metrics (Prometheus-style or logged structured metrics) for: crawl success/failure per source, cache decision breakdown (hit / lightweight-verify / full-refetch — the hit-rate KPI), extraction-confidence distribution over time, review-queue depth + age.
- Alerts: crawl-failure alert per source (a broken crawler is a §13 top risk), and an anomaly alert if a source's extraction-confidence distribution shifts sharply.
- Dashboard: a simple metrics page (Grafana config OR a Next.js `/ops` page reading a metrics endpoint) showing the four metric families above.
- Wire crawl failures from Dagster (P1.3) and cache decisions from P1.2 into these metrics.

**Deliverables:** metrics instrumentation in ingestion + cache, alert definitions, a dashboard (Grafana provisioning or `/ops` page), tests for metric emission.

**Acceptance criteria:**
- Cache hit-rate, per-source crawl success/failure, extraction-confidence distribution, and review-queue depth are all visible on the dashboard.
- A simulated crawl failure fires an alert.
- Metrics update as crawlers/cache/extraction run.

**Depends on:** P1.2, P1.3, P1.8.
