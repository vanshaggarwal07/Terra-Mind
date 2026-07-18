# Dev environment — small, cheap, non-HA. Nothing sensitive here.
environment             = "dev"
region                  = "ap-south-1"
db_instance_class       = "db.t4g.medium"
db_allocated_storage_gb = 20
api_desired_count       = 1
gpu_max_vcpus           = 4
monthly_budget_usd      = 150
budget_alert_emails     = []
