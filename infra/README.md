# Infrastructure & Deployment (Phase 5)

Terraform provisions the full AWS stack (blueprint §9): managed Postgres
(PostGIS + pgvector), the raw-cache + model S3 buckets, an ECS Fargate runtime for
the API + Dagster behind an ALB, Secrets Manager, **GPU SPOT batch** for CV/ML
(never always-on), least-privilege IAM, budgets, and observability.

## Layout

```
infra/
├── versions.tf / main.tf      # providers, remote state, locals
├── variables.tf / outputs.tf
├── network.tf                 # VPC, public/private subnets, least-priv security groups
├── database.tf                # RDS Postgres 16 (multi-AZ in prod)
├── storage.tf                 # raw-cache + models buckets (private, encrypted, versioned)
├── secrets.tf                 # Secrets Manager (DB + app) — the only secret source
├── iam.tf                     # scoped execution + task roles
├── compute.tf                 # ECS cluster, ALB, API + Dagster services
├── gpu_batch.tf               # AWS Batch on SPOT (min_vcpus=0 -> scales to zero)
├── budgets.tf                 # AWS Budget alerts (cost backstop, P5.4)
├── observability.tf           # CloudWatch alarms + SNS routing + dashboard (P5.3)
└── envs/{dev,prod}.tfvars      # per-environment config (no secrets)
```

## Prerequisites

- Terraform >= 1.6, AWS credentials with provisioning rights.
- An S3 bucket + DynamoDB table for remote state, and an ACM certificate for HTTPS.

## Deploy runbook

```bash
cd infra
terraform init -backend-config=envs/dev.backend.hcl      # per-env backend
terraform workspace select dev || terraform workspace new dev
terraform plan  -var-file=envs/dev.tfvars -out tf.plan    # review — must be clean
terraform apply tf.plan
```

Populate application secrets AFTER apply (never in code):

```bash
aws secretsmanager put-secret-value --secret-id twin-dev/app \
  --secret-string '{"llm_api_key":"..."}'
```

Application images + rollout are handled by the CD pipeline
(`.github/workflows/cd.yml`): build → push → **gated migration** → deploy dev →
manual approval → prod. `make deploy ENV=dev` runs the plan/apply locally.

## Migration safety

Migrations run as an explicit, reversible pre-deploy step (`alembic upgrade head`).
A failing migration fails the CD job and **blocks the deploy**. To roll a migration
back: `alembic -c packages/warehouse/alembic.ini downgrade -1`.

## Rollback runbook

Application (ECS):

```bash
# ECS deployment circuit breaker auto-rolls-back a failed rollout. To roll back
# manually to the previous task definition:
aws ecs update-service --cluster twin-prod-cluster --service twin-prod-api \
  --task-definition twin-prod-api:<PREVIOUS_REVISION> --force-new-deployment
aws ecs wait services-stable --cluster twin-prod-cluster --services twin-prod-api
```

Database: restore from the automated snapshot (prod retains 14 days) or
`downgrade -1` if the release only added a reversible migration.

Infrastructure: `terraform apply` the previous known-good commit's config.

## Cost posture (§9, P5.4)

- GPU is **SPOT + scale-to-zero** — no idle GPU spend.
- X/social, satellite, and GPU features are gated/off by default; the in-app
  budget guards (`common.budget`) fail features safe before the bill grows, and the
  AWS Budget is the cloud-side backstop.
