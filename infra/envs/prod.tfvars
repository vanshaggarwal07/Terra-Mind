# Prod environment — HA DB, longer retention, deletion protection. Secrets are NOT
# here; they live in Secrets Manager and are injected at deploy time.
environment             = "prod"
region                  = "ap-south-1"
db_instance_class       = "db.r6g.large"
db_allocated_storage_gb = 100
api_desired_count       = 2
gpu_max_vcpus           = 8
monthly_budget_usd      = 500
budget_alert_emails     = ["ops@example.com"]
