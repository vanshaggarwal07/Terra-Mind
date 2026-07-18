# Object storage — the raw-cache tier (blueprint §3.3). Private, encrypted,
# versioned, with lifecycle expiry on the raw tier to control cost.

resource "aws_s3_bucket" "raw_cache" {
  bucket = "${local.name}-raw-cache"
  tags   = { Name = "${local.name}-raw-cache" }
}

resource "aws_s3_bucket_public_access_block" "raw_cache" {
  bucket                  = aws_s3_bucket.raw_cache.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_cache" {
  bucket = aws_s3_bucket.raw_cache.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "raw_cache" {
  bucket = aws_s3_bucket.raw_cache.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "raw_cache" {
  bucket = aws_s3_bucket.raw_cache.id
  rule {
    id     = "expire-old-noncurrent"
    status = "Enabled"
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# Model-artifact bucket (Phase 3/4 registry).
resource "aws_s3_bucket" "models" {
  bucket = "${local.name}-models"
  tags   = { Name = "${local.name}-models" }
}

resource "aws_s3_bucket_public_access_block" "models" {
  bucket                  = aws_s3_bucket.models.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
