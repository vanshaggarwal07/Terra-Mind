# Phase 5 — Infra, DevOps & Compliance (cross-cutting)

**Goal:** make the platform deployable, observable, cost-controlled, and legally defensible. This phase is cross-cutting — start the compliance prompts (P5.5) as early as Phase 1, and harden deploy/observability once Phases 1–2 are functional.

**Entry state:** Phases 0–2 functional locally (later prompts assume Phase 3–4 exist for full observability).
**Exit state:** one-command reproducible cloud deploy, unified observability, enforced cost guards on the expensive line items, and codified compliance (robots.txt, attribution, disclaimers, defamation-safe builder handling).

**Blueprint sections implemented:** §9 (infra/devops), §0 (trust/legal foundations), §13 (open risks + mitigations).

> Ordering note: **P5.5 (compliance) is not last in practice** — its rules (robots.txt, attribution, facts-not-verdicts, disclaimers) must be honored from the first crawler. It lives here so the codified, testable version is centralized, but wire its guards in as you build Phases 1–4.

---

### P5.1 — Cloud infrastructure as code

**Context:** §9. AWS or GCP (GCP has stronger native geospatial/BigQuery GIS; AWS broader ecosystem — pick by team familiarity). Everything reproducible.

**Task:** Author IaC provisioning the full stack in `infra/`.

**Tech constraints:**
- Terraform (or the chosen cloud's IaC) provisioning: managed Postgres with PostGIS + pgvector, object storage bucket (raw cache tier), container runtime for the API + Dagster, a secrets manager, and networking/IAM with least privilege.
- Separate `dev` / `prod` workspaces/environments; all config via variables, no hardcoded secrets.
- GPU spot capacity for CV/ML **batch** jobs (P4.4, P3.x) provisioned as scheduled/on-demand, **not always-on** (§9 cost reality).
- Document a `make deploy` (or equivalent) path.

**Deliverables:** `infra/` Terraform modules + environment configs + a deploy runbook.

**Acceptance criteria:**
- `terraform plan` is clean; applying to a dev environment provisions DB + storage + compute + secrets.
- No secret is committed; all injected via the secrets manager.
- GPU compute is spot/batch, not always-on.

**Depends on:** P0.1, P0.2.

---

### P5.2 — Deployment pipeline (CD)

**Context:** §9. Automated, safe deploys of API, ingestion/Dagster, and the web app.

**Task:** Build the CD pipeline deploying each deployable unit on merge to the release branch.

**Tech constraints:**
- Extend CI (P0.4) with CD: build + push container images (API, Dagster, web), run migrations (P0.2) as a gated step, and deploy to the provisioned environment (P5.1).
- Migration safety: run Alembic migrations as an explicit, reversible pre-deploy step; block deploy on migration failure.
- Environment promotion dev → prod with manual approval gate for prod.
- Zero-downtime-ish rollout + rollback path documented.

**Deliverables:** CD workflow(s) + migration-gate job + rollback runbook.

**Acceptance criteria:**
- Merge to release deploys API + Dagster + web to dev automatically; prod requires approval.
- A failing migration blocks the deploy.
- Rollback procedure is documented and tested once.

**Depends on:** P0.4, P5.1.

---

### P5.3 — Unified observability

**Context:** §9 baseline observability + consolidation of the ingestion (P1.11) and ML (P3.10) dashboards into one operational view.

**Task:** Stand up centralized logging, metrics, tracing, and alerting across all services.

**Tech constraints:**
- Aggregate structured logs (from `common.logging`) + metrics into one stack (e.g. Prometheus + Grafana, or the cloud-native equivalent).
- Consolidated dashboards: crawler success/failure + cache hit-rate (P1.11), extraction-confidence distribution (P1.8/P1.11), review-queue depth (P1.9), model accuracy/drift (P3.10), and API latency/error rates.
- Alerting routes (email/Slack/pager) for: crawl failures (§13 top risk), extraction-confidence anomalies, model drift, deploy failures, and API error spikes.
- Uptime/health checks on API + Dagster.

**Deliverables:** observability stack config/provisioning + consolidated dashboards + alert routing + health checks.

**Acceptance criteria:**
- One dashboard surface shows ingestion, review, ML, and API health.
- Each critical alert (crawl failure, drift, deploy failure, error spike) is wired to a route and test-fired once.
- Health checks report per-service status.

**Depends on:** P1.11, P3.10 (partial dashboards usable earlier).

---

### P5.4 — Cost controls & budget guards (X API / satellite / GPU)

**Context:** §9 cost reality + §13 (X/API costs spike). MVP infra is modest; the spend risks are the X/Twitter API tier and paid satellite/CV compute — budget deliberately, treat as optional.

**Task:** Implement cost tracking + hard budget guards on the expensive line items.

**Tech constraints:**
- Budget guards: configurable monthly caps for the X/social API (P1.10), satellite API pulls (P4.3), and GPU batch compute (P3.x/P4.4). Exceeding a cap disables the optional feature (fails safe / feature-flag off) and alerts — never silently overspends.
- Cost dashboard: per-line-item spend + burn-rate vs budget, on the `/ops`/observability surface.
- Default posture: X/social OFF (P1.10 flag); satellite/CV gated behind explicit enablement (§9/§13 "optional for MVP").
- Cloud budget alerts (via P5.1 IaC) as a backstop.

**Deliverables:** budget-guard middleware/config + cost dashboard + cloud budget alerts + tests for cap-tripping behavior.

**Acceptance criteria:**
- Hitting a configured cap disables the optional feature and alerts, with no silent overspend.
- Cost dashboard shows per-line-item spend vs budget.
- X/social and satellite/CV are optional and off/gated by default.

**Depends on:** P5.1, P5.3; guards feature P1.10, P4.3.

---

### P5.5 — Compliance layer (robots.txt, attribution, disclaimers, defamation-safe builders)

**Context:** §0 (trust foundations), §13 (defamation exposure, data staleness). These rules are legal guardrails, not features — codify + test them so no future change can quietly violate them. Wire the guards in from Phase 1 onward; this prompt centralizes + enforces them.

**Task:** Implement a testable compliance layer enforcing the platform's legal/trust guarantees across ingestion, API, and UI.

**Tech constraints:**
- **Crawling compliance (§3.1):** central enforcement that every crawler respects `robots.txt`, rate limits, and sends the honest identifiable UA; a CI check that no crawler bypasses `common.http`.
- **Attribution (§3.1 news fair-use):** every displayed fact/news item carries source attribution + link + fetch date (`<Citation>` from P2.7); a test that public API fact responses always include a citation.
- **Facts-not-verdicts (§0.1, §13 defamation):** an enforced invariant that no builder/RERA response, copilot output, or CV signal produces a derived trust score/ranking/judgment. Add a guard test that fails the build if a verdict-like field is introduced to builder or copilot outputs.
- **Predictions = advisory (§0.2, §13):** an enforced invariant that every predictive/advisory response includes a confidence band + disclaimer (complements P3.8 middleware); guard test for bare numbers reaching any client.
- **Human-verification for high-stakes (§0.3, §3.4.4):** an enforced invariant that binary high-stakes facts (`status==approved`, "metro approved: yes/no") cannot reach public endpoints without `verified=true` (i.e. having passed the review queue P1.9); guard test.
- **Data-staleness transparency (§13):** every fact/prediction surfaces its `last_verified_at`/as-of date so users see freshness.
- Produce a short `COMPLIANCE.md` documenting each guarantee, the code that enforces it, and the test that protects it.

**Deliverables:** compliance-guard modules + CI guard tests for each invariant + `COMPLIANCE.md`.

**Acceptance criteria:**
- CI fails if: a crawler bypasses robots.txt/UA/rate-limits; a builder/copilot/CV output gains a verdict/score field; a bare number reaches a client; an unverified high-stakes fact is exposed publicly; or a public fact lacks a citation + as-of date.
- `COMPLIANCE.md` maps every §0/§13 guarantee to its enforcing code + test.
- All guarantees hold across ingestion, API, and UI.

**Depends on:** touches P1.x, P2.x, P3.x, P4.x — wire guards incrementally, finalize + enforce here.
