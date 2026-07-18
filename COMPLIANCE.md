# Compliance & Trust Guarantees

The platform's legal/trust posture (blueprint §0, §13) is codified and **enforced in
CI** — no future change can quietly violate it. Each guarantee below maps to the
code that enforces it and the test that protects it.

The primitives live in `packages/common/common/compliance.py` (dependency-free) and
are wired into every layer.

| # | Guarantee (blueprint) | Enforcing code | Guard test |
|---|---|---|---|
| 1 | **Facts, not verdicts.** No derived trust score / ranking / judgment on builders, copilot output, or CV signals (§0.1, §13 defamation). | `compliance.assert_no_verdict_fields`; `BuilderRead`/`CopilotAnswer` schemas; copilot `guardrails.enforce`; CV `signals.persist_change_signals` | `api/tests/test_compliance.py::test_builder_response_has_no_verdict_field`, `::test_copilot_response_has_no_verdict_field`; `api/tests/test_builder_no_verdict.py`; `cv/tests/test_signals.py::test_no_verdict_or_builder_field_in_signal` |
| 2 | **Predictions are advisory.** Every advisory number ships a confidence band + disclaimer — never a bare number (§0.2, §13). | `ml/monitoring/guards.py` (`validate_envelope`, `enforce_serving_envelope`); `api/predictions.py` boundary | `api/tests/test_compliance.py::test_bare_advisory_number_is_rejected`; `ml/tests/test_guards.py`; `api/tests/test_predictions.py` |
| 3 | **High-stakes facts are human-verified.** `status==approved` (and any binary high-stakes fact) cannot reach public endpoints without `verified=true` (passed the review queue) (§0.3, §3.4.4). | `compliance.can_expose_publicly`; `InfraEventRepo` public reads filter `verified.is_(True)`; review queue (P1.9) | `common/tests/test_compliance.py::test_high_stakes_exposure_rule`; `api/tests/test_compliance.py::test_public_reads_filter_verified_in_repo_source` |
| 4 | **Attribution + staleness transparency.** Every public fact/news item carries a source citation + link + `as_of`/`last_verified_at` (§3.1, §13). | `compliance.has_attribution`/`has_freshness`; `Citation` on `InfraEventRead`/`BuilderRead`; `<Citation>` UI primitive | `api/tests/test_compliance.py::test_public_fact_carries_citation_and_as_of`, `::test_infra_event_schema_has_citation_field` |
| 5 | **Crawling compliance.** Every crawler routes through `common.http` (robots.txt + honest identifiable UA + rate limits); none uses a raw HTTP client (§3.1). | `common.http.HttpClient` (robots/UA/backoff); `compliance.scan_crawler_compliance` | `api/tests/test_compliance.py::test_no_crawler_bypasses_common_http`; `common/tests/test_http.py` |

## Cost / abuse guards (§9, §13)

- The paid line items (X/social, satellite, GPU) are **optional and gated/off by
  default** and enforced by `common.budget.BudgetGuard`: hitting a monthly cap
  disables the feature (fails safe) and alerts — never a silent overspend.
  Tests: `common/tests/test_budget.py`, `ingestion/tests/test_satellite.py`
  (`test_disabled_satellite_budget_blocks_all_fetches`, `test_satellite_budget_cap_stops_fetching`).
- Cloud backstop: `infra/budgets.tf` AWS Budget threshold alerts.

## Where the guards run

- **Ingestion:** `common.http` (crawling), budget guard (satellite), review queue.
- **API:** facts filtered to `verified=true` with citations; prediction boundary
  enforcement; copilot guardrails; `/ops` surfaces freshness + costs.
- **UI:** `<Citation>`, `<ConfidenceBand>`, `<Disclaimer>` primitives; pattern
  signals labelled distinctly from official facts.

Run the full compliance suite: `pytest packages -k compliance`.
