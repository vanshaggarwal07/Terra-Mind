# Property Digital Twin — Future Intelligence Platform
## Full Engineering Blueprint (Data → ML → LLM → Product)
### Scope: Noida · Greater Noida · Yamuna Expressway · Jewar Airport corridor

---

## 0. What This Company Actually Is

Before any code: get the mental model right, because it determines architecture.

| Wrong mental model | Correct mental model |
|---|---|
| "AI real estate app" | Geospatial data infrastructure company, with ML forecasting and an LLM UX layer on top |
| LLM predicts the future | LLM **explains** predictions made by deterministic + ML models, grounded in retrieved facts |
| One big scraper | Dozens of narrow, source-specific ingestion services feeding one normalized schema |
| Build AI first | Build the **data pipeline** first — the AI is worthless without clean, fresh, structured inputs |

Your moat is not the model. It's the **freshness and coverage of the underlying dataset**. Anyone can call an LLM API. Almost nobody will build and maintain 40+ source-specific crawlers for two years. That's the actual barrier to entry.

**Three things to solve before writing prediction code**, because retrofitting them later is expensive:

1. **Builder Trust Score = legal risk.** Don't compute a proprietary "trust judgment." Instead, surface **official regulator records verbatim** — UP-RERA project registration status, delay history, litigation flags, and *cite the source*. You're reporting facts, not rendering a verdict. This is the difference between "aggregator" and "defamer" in the eyes of a lawyer.
2. **Price predictions = advisory-adjacent.** Every number needs a visible disclaimer ("estimate, not investment advice") and a confidence band, not a point number. Treat it like a fintech app treats projected returns.
3. **LLM-extracted facts need a human-verification queue** for anything binary and high-stakes (e.g., "metro approved: yes/no"). Hallucinated facts on a 700-page DPR are a liability, not just a bug.

---

## 1. MVP Scope (do NOT build all 20 features first)

**Build these 5, nothing else, for v1:**

1. Locality Future Timeline (approved infra + expected years — factual, Layer 1 only)
2. Future Intelligence Score (weighted sum of confirmed signals — no ML needed yet)
3. Metro/Airport/Expressway proximity impact card
4. UP-RERA-sourced Builder record card (registration, delay history, complaints — pulled, not judged)
5. AI Property Copilot chat (RAG over your structured data only, not the open web)

**Explicitly deferred to Phase 3+:** price ML forecasting, flood/traffic/noise ML, satellite change-detection CV, simulation sliders. These need 6–12 months of accumulated data to be trustworthy — shipping them early with thin data will produce wrong answers and kill user trust permanently.

---

## 2. System Architecture (Overview)

```
                              USER (Web / App)
                                    │
                        ┌───────────┴────────────┐
                        │   Product / API Layer   │
                        └───────────┬────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
     AI Copilot (LLM+RAG)   Prediction API (ML)   Digital Twin API (facts)
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                     Knowledge Graph + Structured Warehouse
                          (Postgres + PostGIS + Graph DB)
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      Document Intelligence   Satellite CV Pipeline   News/Social NLP
      (PDF/DPR extraction)    (change detection)      (event extraction)
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                 Search → Cache → Verify Ingestion Layer
                 (per-source crawlers, TTL, diff-checking)
                                    │
                                    ▼
                     40+ Government / News / Market Sources
```

---

## 3. The Ingestion Layer — Line by Line

### 3.1 Data Source Registry (build this as a config table, not hardcoded logic)

Store every source as a row in a `sources` table — never hardcode a scraper's target inside the scraper itself. This is what lets you add source #41 without touching code.

| id | source | category | access method | refresh cadence | legal basis |
|---|---|---|---|---|---|
| 1 | YEIDA Master Plan 2041 + GIS Portal | planning | PDF/GIS scrape | monthly | public govt document |
| 2 | Noida & Greater Noida Authority | planning | site scrape | weekly | public |
| 3 | DMRC / NMRC | metro | site + tender scrape | weekly | public |
| 4 | NHAI | highways | site + API | weekly | public |
| 5 | NCRTC | RRTS rail | site scrape | weekly | public |
| 6 | Noida Intl. Airport (Jewar) | airport | press + site | weekly | public |
| 7 | CPPP / GeM | tenders | tender API | daily | public procurement (open) |
| 8 | data.gov.in | cross-domain open data | API | weekly | Open Government Data license |
| 9 | UP-RERA | builder/project registry | site scrape | weekly | public regulator record |
| 10 | CPCB (CAAQMS) | air quality | API | daily | public |
| 11 | CWC + IMD | flood/rainfall | API | daily | public |
| 12 | CGWB | groundwater | dataset download | quarterly | public |
| 13 | Survey of India / SRTM (NASA) / Bhuvan (ISRO) | elevation/DEM | dataset download | one-time + yearly | public |
| 14 | Sentinel-2 (ESA Copernicus) | satellite imagery | API (free, 10m res) | every 5–10 days | open license |
| 15 | News aggregators (local + national) | news | RSS/NLP | daily | fair-use aggregation w/ attribution |
| 16 | X (Twitter) API | social signal | paid API | daily | **paid — budget for this, tiers are expensive** |
| 17 | Builder investor filings / press | builder | scrape | monthly | public |

**Engineering note:** every crawler respects `robots.txt` and rate limits. Government sites are fragile — a crawler that hits them too hard gets you IP-banned and possibly a legal notice. Add exponential backoff and identify your bot honestly in the user-agent string.

### 3.2 Crawler Fleet

One microservice per source, not one monolith crawler. Orchestrated by **Apache Airflow** or **Dagster** (Dagster is easier to reason about for a small team — recommend it).

```
ingestion/
├── orchestrator/          (Dagster DAGs, one per source, scheduled per cadence)
├── crawlers/
│   ├── yeida_crawler.py
│   ├── dmrc_crawler.py
│   ├── nhai_crawler.py
│   ├── rera_crawler.py
│   ├── tender_crawler.py
│   ├── cpcb_crawler.py
│   ├── news_crawler.py
│   ├── satellite_fetcher.py
│   └── x_social_crawler.py
├── common/
│   ├── rate_limiter.py
│   ├── change_hasher.py    (see 3.3)
│   └── raw_store_writer.py (writes to object storage)
```

Each crawler's only job: fetch raw content, compute a content hash, and hand off to the **Search → Cache → Verify** layer below. It does **not** do parsing or interpretation — keep responsibilities separated.

### 3.3 The Search → Cache → Verify Layer (your idea, engineered properly)

Your instinct — "don't just search the web every time, cache what you found, and only re-check if something changed" — is exactly correct and is a known pattern (freshness-aware RAG). Here's how to build it so it's fast **and** correct:

**Storage design (3 tiers):**

1. **Raw cache** (object storage — S3/GCS/Cloudflare R2): every fetched page/PDF saved as-is, named by `source_id + content_hash`, plus a `.md` normalized text version — exactly the file-per-search idea you had, just organized with a hash key instead of a query string so duplicates collapse automatically.
2. **Structured store** (Postgres): parsed facts as rows — `event_id, source_id, project_type, location(geom), status, expected_year, confidence, first_seen_at, last_verified_at`.
3. **Vector index** (pgvector or Weaviate): embeddings of the normalized `.md` text, used by the LLM copilot for retrieval.

**The verify-before-refetch algorithm** (this is the part that saves you time and money):

```
function get_source_data(source_id):
    cached = raw_store.get_latest(source_id)
    if cached is None:
        return full_fetch_and_parse(source_id)

    ttl = ttl_for_category(source_id.category)
    # e.g. gov master plan = 30 days, news = 1 day,
    #      tender = 7 days, satellite = 5-10 days (matches revisit cycle)

    if now() - cached.last_verified_at < ttl:
        return cached.structured_data   # fresh enough, skip network entirely

    # TTL expired — do a CHEAP check before a FULL re-fetch
    lightweight = fetch_lightweight_signal(source_id)
    # e.g. HTTP Last-Modified/ETag header, or hash of just the page's
    # "last updated" div, or RSS feed timestamp — cheap, no full parse

    if lightweight.hash == cached.content_hash:
        cached.last_verified_at = now()   # confirmed unchanged, cheap touch
        return cached.structured_data

    # actual change detected — now do the expensive full fetch + LLM parse
    return full_fetch_and_parse(source_id)
```

This gives you exactly what you wanted: no redundant full re-scraping on every user query, but data never goes stale beyond your TTL, and the expensive LLM-parsing step only runs when content has *actually* changed. This single design decision will save you real infrastructure cost at scale.

### 3.4 Document Intelligence Pipeline (PDF/DPR → structured JSON)

1. PDF → text/layout extraction (use a document-parsing model, not raw `pypdf` — master plans have tables, maps, multi-column layout that plain text extraction mangles).
2. Chunk by section (table of contents-aware chunking beats fixed-size chunking for legal/planning docs).
3. LLM extraction with a **strict JSON schema**, not free text:
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
4. **Human-in-the-loop queue**: any extraction with `confidence < 0.85` OR `status == approved` (high-stakes facts) goes into a review dashboard before it's marked `verified=true` and shown to users. This is the single highest-leverage trust feature you can build — do not skip it to move faster.
5. Verified record written to the Knowledge Graph.

### 3.5 Satellite Change-Detection Pipeline (Phase 3, not MVP)

- Source: **Sentinel-2** (free, 10m resolution, 5-day revisit) via Copernicus API for baseline; **Bhuvan (ISRO)** as an India-specific alternate/backup source.
- Pipeline: pull tile pairs (T0 vs T-6-months) for each tracked locality → run a change-detection CV model (semantic segmentation trained to distinguish vegetation/bare-land/built-structure classes) → flag tiles with new built-up area → geocode flag → create a `construction_detected` event with confidence score, feeding the Knowledge Graph as a *pattern-based* (not fact-based) signal.
- This is genuinely hard and expensive (compute + labeled training data). Budget real time for this — don't attempt it before Phase 3.

### 3.6 News & Social Ingestion

- News: RSS + web scrape → NLP entity/event extraction (same JSON schema as 3.4, lower confidence weighting since news ≠ official record).
- X/Grok: useful for *early signal* (e.g., a builder announcing a launch before it hits any official filing) but treat as **lowest-confidence tier** — never let a tweet alone flip a fact to "verified." Budget for API costs here; this tier is optional for MVP.

---

## 4. Knowledge Graph & Warehouse

**Schema (core entities):**

- `Property` — id, geom (PostGIS point), address, listing data
- `Locality` — id, geom (polygon), name
- `InfraEvent` — id, type, status, expected_year, confidence, source_id, geom
- `Builder` — id, name, rera_id, project_history[]
- `GovBody` — id, name, jurisdiction

**Edges:** `Property -[LOCATED_IN]-> Locality`, `InfraEvent -[AFFECTS within Xkm]-> Locality`, `Builder -[DEVELOPS]-> Property`, `InfraEvent -[APPROVED_BY]-> GovBody`.

Recommendation: **Postgres + PostGIS** for the primary store (geospatial queries, ACID, mature tooling) rather than a dedicated graph DB for v1 — you don't need graph-traversal performance at MVP scale, and PostGIS keeps your stack simpler. Revisit Neo4j/Memgraph only once traversal queries (e.g., "all properties within 3 hops of any approved metro in 5 years") become a real bottleneck.

---

## 5. Prediction / ML Layer (Phase 3)

Every model below outputs the **same standard envelope** — this consistency is what makes the LLM explanation layer work cleanly:

```json
{
  "prediction": <value>,
  "confidence": 0.0-1.0,
  "contributing_factors": [{"factor": "", "weight": 0.0}],
  "model_version": ""
}
```

| Domain | Inputs | Model class | Notes |
|---|---|---|---|
| Price | historical prices, infra events, inflation, rental yield, builder track record | XGBoost/LightGBM (tabular) | Do NOT use an LLM for the number itself |
| Traffic | Maps historical traffic, road width, new infra events | Time-series + graph-based models | Needs 1-2 years of accumulated traffic history to be meaningful |
| Flood | elevation (DEM), rainfall, drainage, CWC flood records | Hydrological model + classifier | High liability if wrong — keep conservative confidence bands |
| Water/groundwater | CGWB data, population growth, rainfall | Regression / trend model | |
| Noise/AQI | CPCB data, proximity to highways/airports/industry | Regression | |
| Builder — do NOT model this | UP-RERA official records only | **No ML** — surface facts, not a score | See Section 0 |

**Accuracy framing (be honest with users, always):** factual/approved-infra data — high confidence. 1–5yr forecasts with strong signal — moderate confidence, shown as a range. 10yr+ — always framed as directional, never a specific number.

---

## 6. LLM / RAG Copilot Layer

```
User query
   → Retrieve: structured facts from Knowledge Graph (SQL/PostGIS query)
             + relevant chunks from vector index (pgvector)
   → Assemble grounded context (facts + citations)
   → LLM generates explanation ONLY from retrieved context (no open-ended generation)
   → Response includes inline source citations to the original gov document/news item
```

- Use the LLM for: chat explanations, document extraction (3.4), news structuring (3.6), comparison summaries.
- Never use the LLM for: the price/traffic/flood numbers themselves (Section 5), or as the source of truth for "is this approved" (that's the Knowledge Graph's job, verified by the pipeline in 3.3–3.4).
- For current model/API options and pricing, check vendor docs directly at build time — this space moves fast enough that anything written here today may be stale within months.

---

## 7. Simulation Engine (Phase 4)

Architecture: sliders modify one or more `InfraEvent` fields (e.g., `expected_year: 2030 → 2032`) → re-run the Section 5 models with the modified graph state → diff against baseline prediction → render before/after. This only works once the ML models in Section 5 are trained and stable — it is a "recompute with modified inputs" feature, not a separate model.

---

## 8. Frontend / Digital Twin UI

- **Framework:** Next.js (React) — matches ecosystem availability of geospatial libraries.
- **Map layer:** Mapbox GL JS or Deck.gl (Deck.gl handles large geospatial overlays — satellite tiles, heatmaps — better at scale).
- **Timeline component:** custom Gantt-style horizontal timeline per locality (matches the visual you sketched — years across, project bars).
- **Score card:** Future Intelligence Score with expandable "why" breakdown (pulls directly from `contributing_factors` in the prediction envelope — don't hand-write these, generate from the same data the model used, so the explanation can never drift from the number).

---

## 9. Infra & DevOps

| Layer | Recommendation |
|---|---|
| Cloud | AWS or GCP (GCP has stronger native geospatial/BigQuery GIS tooling; AWS has broader general ecosystem — either is fine, pick based on team familiarity) |
| Orchestration | Dagster (ingestion DAGs) |
| Primary DB | Postgres + PostGIS |
| Object storage | S3/GCS/R2 (raw cache tier) |
| Vector store | pgvector (keep in Postgres for v1 — avoid a separate vector DB until scale demands it) |
| Compute for CV/ML | GPU spot instances, scheduled batch jobs (not always-on — satellite/CV runs are periodic, not real-time) |
| Observability | Basic: crawler success/failure alerts, TTL-cache hit-rate dashboard, extraction-confidence distribution over time |

**Cost reality check:** at MVP scale (single region, ~5-10 sources active), infra cost is modest (low hundreds of $/month). The X/Twitter API tier and any paid satellite/CV compute are the line items that can spike — budget those deliberately and treat them as optional for MVP, not core.

---

## 10. Team & Phased Timeline

| Phase | Deliverable | Core work | Realistic duration (small team, 2-4 people) |
|---|---|---|---|
| 1 | Data Intelligence Platform | Source registry, 8-10 crawlers, cache/verify layer, document extraction + review queue | 2.5 – 3.5 months |
| 2 | Interactive Digital Twin (facts only, no ML) | Knowledge Graph, map UI, timeline, Future Intelligence Score v1 (rule-weighted, not ML) | 1.5 – 2 months |
| 3 | Prediction Engine | Price/traffic/flood/water/AQI models, RAG copilot | 3 – 4 months (needs accumulated data from Phase 1-2 running live) |
| 4 | Simulation Engine + satellite CV | What-if sliders, change-detection pipeline | 2 – 3 months |

**Total to a genuinely complete v1 with real ML: ~9-13 months** with a focused small team. This is not a weekend build — set expectations accordingly, including with any co-founders or early hires.

---

## 11. Immediate Next 2 Weeks (concrete, not abstract)

1. Pick **3 sources only**: YEIDA Master Plan/GIS, DMRC/NMRC, UP-RERA. Build one crawler for each.
2. Stand up Postgres + PostGIS locally, define the `InfraEvent` and `Builder` tables from Section 4.
3. Build the cache/verify layer (Section 3.3) as a shared library before writing more crawlers — every crawler after this reuses it.
4. Manually extract 20 real infra events from YEIDA's master plan into the schema by hand — this becomes your labeled test set for validating the LLM extraction pipeline later.
5. Ship a static locality timeline page for **one sector** (e.g., Sector 22D) using only hand-entered data — this is your proof-of-concept demo before any automation exists.

---

## 12. Business Model Notes (brief)

- Consumer freemium (basic score free, deep report/copilot paywalled) is the obvious default — but data licensing/API access to *other* proptech platforms (builders, banks doing mortgage risk, brokers) is likely the higher-margin B2B path once the dataset matures, since your real asset is the structured infra-event database, not the consumer UI.

---

## 13. Open Risks Table

| Risk | Mitigation |
|---|---|
| Gov site structure changes break crawlers | Source-isolated crawlers (Section 3.2) so one break doesn't cascade; alerting on crawl failures |
| LLM extraction hallucination | Human review queue for high-stakes facts (Section 3.4) |
| Defamation exposure (builder scoring) | Facts-only, RERA-sourced, cited (Section 0 & 5) |
| Users treat predictions as guarantees | Confidence bands + disclaimers everywhere, never a bare number |
| X/API costs spike | Treat social signal as optional/lowest-tier, not core dependency |
| Data staleness | TTL + verify-before-refetch layer (Section 3.3) |
