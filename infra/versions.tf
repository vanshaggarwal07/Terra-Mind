terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state (configure per environment; never commit real backend secrets).
  # Initialize with:  terraform init -backend-config=envs/<env>.backend.hcl
  backend "s3" {}
}
