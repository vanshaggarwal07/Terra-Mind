# Secrets manager — the SINGLE source of runtime secrets. Nothing sensitive is
# committed or hardcoded (P5.1 acceptance). The DB password is generated here and
# never rendered into state output.

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db" {
  name        = "${local.name}/database"
  description = "Postgres connection for ${local.name}"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = var.db_name
    url      = "postgresql+psycopg://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${var.db_name}"
  })
}

# Application secrets (LLM key, object-storage creds, etc.) are created empty here
# and populated out-of-band (console/CLI) or by a separate secret-loader — never in
# code. CD reads them at deploy time.
resource "aws_secretsmanager_secret" "app" {
  name        = "${local.name}/app"
  description = "Application secrets (LLM key, etc.) for ${local.name}"
}
