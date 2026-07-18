output "api_url" {
  description = "Public HTTPS endpoint of the API load balancer."
  value       = "https://${aws_lb.api.dns_name}"
}

output "database_secret_arn" {
  description = "Secrets Manager ARN holding the DB connection (never the value)."
  value       = aws_secretsmanager_secret.db.arn
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "raw_cache_bucket" {
  value = aws_s3_bucket.raw_cache.bucket
}

output "models_bucket" {
  value = aws_s3_bucket.models.bucket
}

output "gpu_job_queue" {
  value = aws_batch_job_queue.gpu.name
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}
