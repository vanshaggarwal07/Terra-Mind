# Observability (P5.3)

One consolidated operational surface across ingestion, review, ML, cost, and API.

## Sources

- **In-app `/ops` API** (`api/routers/ops.py`): `/ops/health` (per-service),
  `/ops/metrics` (ingestion crawl + cache hit-rate + extraction confidence +
  review-queue depth + model status + costs), `/ops/costs` (budget dashboard).
- **Structured logs** (`common.logging`, JSON) ship to the ECS CloudWatch log
  groups (cloud) or stdout (local).
- **Web `/ops` page** renders the consolidated dashboard for humans.

## Two deployment options

1. **Cloud-native (default in `infra/`)** — CloudWatch alarms + SNS routing +
   dashboard (`observability.tf`). Zero extra infra.
2. **Portable Prometheus/Grafana** — `prometheus.yml` scrapes `/ops/*`,
   `alert_rules.yml` + `alertmanager.yml` route each §13 risk (crawl failure,
   confidence anomaly, drift, deploy failure, API error spike) to oncall/Slack.

## Alert coverage (each is test-fired once)

| Alert | Risk (§13) | Route |
|---|---|---|
| CrawlFailureSpike | broken gov-site crawler | oncall |
| ExtractionConfidenceDrop | hallucination drift | slack |
| ModelDrift (PSI>0.2) | stale/wrong forecasts | slack |
| ApiErrorSpike / ApiDown | outage | oncall |
| BudgetCapApproaching | cost spike (X/satellite/GPU) | slack |
| (CD) deploy failure | bad release | oncall (GitHub + circuit breaker) |
