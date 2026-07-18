# GPU compute for CV (P4.4) + heavy ML (P3.x) — AWS Batch on SPOT instances, run
# as scheduled/on-demand batch jobs, NEVER always-on (blueprint §9 cost reality).
# min_vcpus = 0 so the compute environment scales to zero when idle (no idle spend).

resource "aws_iam_role" "batch_service" {
  name = "${local.name}-batch-service"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "batch.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "batch_service" {
  role       = aws_iam_role.batch_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole"
}

resource "aws_iam_role" "spot_fleet" {
  name = "${local.name}-spot-fleet"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "spotfleet.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "spot_fleet" {
  role       = aws_iam_role.spot_fleet.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole"
}

resource "aws_batch_compute_environment" "gpu_spot" {
  compute_environment_name = "${local.name}-gpu-spot"
  type                     = "MANAGED"
  service_role             = aws_iam_role.batch_service.arn

  compute_resources {
    type                = "SPOT" # SPOT ONLY — never on-demand/always-on (§9)
    allocation_strategy = "SPOT_CAPACITY_OPTIMIZED"
    bid_percentage      = 60
    min_vcpus           = 0 # scale to zero when idle -> no idle GPU spend
    max_vcpus           = var.gpu_max_vcpus
    instance_type       = var.gpu_instance_types
    subnets             = aws_subnet.private[*].id
    security_group_ids  = [aws_security_group.app.id]
    spot_iam_fleet_role = aws_iam_role.spot_fleet.arn
    instance_role       = aws_iam_instance_profile.batch_instance.arn
  }
}

resource "aws_iam_role" "batch_instance" {
  name = "${local.name}-batch-instance"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "batch_instance" {
  role       = aws_iam_role.batch_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "batch_instance" {
  name = "${local.name}-batch-instance"
  role = aws_iam_role.batch_instance.name
}

resource "aws_batch_job_queue" "gpu" {
  name     = "${local.name}-gpu-queue"
  state    = "ENABLED"
  priority = 1
  compute_environment_order {
    order               = 1
    compute_environment = aws_batch_compute_environment.gpu_spot.arn
  }
}
