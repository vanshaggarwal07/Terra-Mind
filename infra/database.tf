# Managed Postgres with PostGIS + pgvector. Both extensions are enabled by the
# migration (packages/warehouse) / db-init; RDS Postgres 16 supports them natively.

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-db-subnets" }
}

resource "aws_db_parameter_group" "pg16" {
  name   = "${local.name}-pg16"
  family = "postgres16"

  # Preload libraries needed by PostGIS/pgvector-adjacent tooling.
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name}-pg"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage_gb
  max_allocated_storage = var.db_allocated_storage_gb * 4
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.pg16.name

  multi_az                = local.is_prod
  backup_retention_period = local.is_prod ? 14 : 3
  deletion_protection     = local.is_prod
  skip_final_snapshot     = !local.is_prod
  apply_immediately       = !local.is_prod

  performance_insights_enabled = true
  tags                         = { Name = "${local.name}-pg" }
}
