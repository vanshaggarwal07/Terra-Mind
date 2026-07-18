variable "environment" {
  description = "Deployment environment (dev|prod). Drives naming, sizing, and guards."
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be 'dev' or 'prod'."
  }
}

variable "region" {
  description = "AWS region."
  type        = string
  default     = "ap-south-1" # Mumbai — closest to the NCR corridor
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

# --- Database (managed Postgres + PostGIS + pgvector) ---
variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "db_allocated_storage_gb" {
  type    = number
  default = 50
}

variable "db_name" {
  type    = string
  default = "twin"
}

variable "db_username" {
  type    = string
  default = "twin"
}

# --- Container runtime sizing ---
variable "api_cpu" {
  type    = number
  default = 512
}

variable "api_memory" {
  type    = number
  default = 1024
}

variable "api_desired_count" {
  type    = number
  default = 1
}

variable "dagster_cpu" {
  type    = number
  default = 512
}

variable "dagster_memory" {
  type    = number
  default = 1024
}

variable "container_image_api" {
  description = "Fully-qualified image ref for the API (set by CD)."
  type        = string
  default     = ""
}

variable "container_image_dagster" {
  description = "Fully-qualified image ref for Dagster (set by CD)."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for the HTTPS listener."
  type        = string
  default     = ""
}

# --- GPU batch (CV/ML) — SPOT ONLY, never always-on (§9) ---
variable "gpu_instance_types" {
  type    = list(string)
  default = ["g5.xlarge", "g4dn.xlarge"]
}

variable "gpu_max_vcpus" {
  type    = number
  default = 8
}

# --- Cost guards (P5.4 cloud backstop) ---
variable "monthly_budget_usd" {
  description = "Total monthly cost-anomaly budget for cloud-side alerting."
  type        = number
  default     = 500
}

variable "budget_alert_emails" {
  description = "Emails to notify on budget threshold breach."
  type        = list(string)
  default     = []
}
