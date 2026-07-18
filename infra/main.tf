# Property Digital Twin — AWS infrastructure (blueprint §9; Phase 5 P5.1).
#
# Reproducible provisioning of: managed Postgres (PostGIS + pgvector), the raw-cache
# object-storage bucket, a container runtime for the API + Dagster, a secrets
# manager, GPU SPOT batch for CV/ML (never always-on), and least-privilege IAM.
#
# Environments are separated via the `environment` variable + tfvars (dev/prod).
# NO secret is hardcoded — all sensitive values come from the secrets manager.

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "property-digital-twin"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name        = "twin-${var.environment}"
  is_prod     = var.environment == "prod"
  common_tags = { Project = "property-digital-twin", Environment = var.environment }
}
