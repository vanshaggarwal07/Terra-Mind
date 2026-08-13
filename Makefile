# Property Digital Twin — developer command surface.
# All targets are safe to re-run. Unimplemented feature targets print a notice.

SHELL := /bin/bash
PACKAGES := common warehouse ingestion api ml cv simulation
PY ?= python3
VENV ?= .venv
ENV ?= dev

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

$(VENV): ## Create the local virtualenv
	$(PY) -m venv $(VENV)
	$(VENV)/bin/python -m pip install --upgrade pip

.PHONY: bootstrap
bootstrap: $(VENV) ## Install all Python packages (editable) + web deps
	$(VENV)/bin/pip install $(foreach p,$(PACKAGES),-e packages/$(p)) 
	$(VENV)/bin/pip install ruff mypy pytest pytest-cov
	@if command -v pnpm >/dev/null 2>&1; then \
		pnpm --dir apps/web install; \
	else \
		echo "pnpm not found — skipping web deps (install pnpm to enable the frontend)"; \
	fi

.PHONY: migrate
migrate: ## Apply DB migrations (Alembic, in packages/warehouse)
	$(VENV)/bin/alembic -c packages/warehouse/alembic.ini upgrade head

.PHONY: downgrade
downgrade: ## Roll back one DB migration
	$(VENV)/bin/alembic -c packages/warehouse/alembic.ini downgrade -1

.PHONY: seed
seed: ## Seed the source registry (Phase 1 / P1.1)
	@if [ -f packages/ingestion/ingestion/seed_sources.py ]; then \
		$(VENV)/bin/python -m ingestion.seed_sources; \
	else \
		echo "seed not yet implemented (arrives in P1.1)"; \
	fi

.PHONY: seed-demo
seed-demo: ## Seed demo localities + verified infra events + edges (DB-backed demo)
	$(VENV)/bin/python -m warehouse.seed_demo

.PHONY: train
train: ## Train + register all Phase-3 prediction models (P3.1-P3.7)
	@if [ -f packages/ml/ml/training/train.py ]; then \
		$(VENV)/bin/python -m ml.training.train; \
	else \
		echo "ml training not yet implemented (arrives in Phase 3)"; \
	fi

.PHONY: deploy
deploy: ## Terraform plan+apply for an environment (ENV=dev|prod) — Phase 5 P5.1
	@if [ -d infra ]; then \
		cd infra && terraform plan -var-file=envs/$(ENV).tfvars -out tf.plan && terraform apply tf.plan; \
	else \
		echo "infra/ not present"; \
	fi

.PHONY: train-cv
train-cv: ## Train + register the Phase-4 change-detection segmenter (P4.4)
	@if [ -f packages/cv/cv/training.py ]; then \
		$(VENV)/bin/python -m cv.training; \
	else \
		echo "cv training not yet implemented (arrives in Phase 4)"; \
	fi

.PHONY: dagster
dagster: ## Launch Dagster dev UI (Phase 1 / P1.3)
	@if [ -d packages/ingestion/ingestion/orchestrator ]; then \
		$(VENV)/bin/dagster dev -m ingestion.orchestrator; \
	else \
		echo "orchestrator not yet implemented (arrives in P1.3)"; \
	fi

.PHONY: api
api: ## Run the FastAPI app
	$(VENV)/bin/uvicorn api.main:app --reload --port 8000

.PHONY: web
web: ## Run the Next.js frontend
	pnpm --dir apps/web dev

.PHONY: lint
lint: ## Lint Python (ruff)
	$(VENV)/bin/ruff check packages
	$(VENV)/bin/ruff format --check packages

.PHONY: fmt
fmt: ## Auto-format Python (ruff)
	$(VENV)/bin/ruff check --fix packages
	$(VENV)/bin/ruff format packages

.PHONY: typecheck
typecheck: ## Type-check Python (mypy)
	$(VENV)/bin/mypy packages

.PHONY: test
test: ## Run the Python test suite
	$(VENV)/bin/pytest
