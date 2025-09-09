output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
  sensitive   = true
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_cluster.main.cache_nodes[0].port
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.exports.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.exports.arn
}

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value = {
    gateway     = aws_ecr_repository.gateway.repository_url
    worker_wa   = aws_ecr_repository.worker_wa.repository_url
    worker_tg   = aws_ecr_repository.worker_tg.repository_url
    aggregator  = aws_ecr_repository.aggregator.repository_url
    web_user    = aws_ecr_repository.web_user.repository_url
    web_admin   = aws_ecr_repository.web_admin.repository_url
  }
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value = {
    gateway     = aws_cloudwatch_log_group.gateway.name
    worker_wa   = aws_cloudwatch_log_group.worker_wa.name
    worker_tg   = aws_cloudwatch_log_group.worker_tg.name
    aggregator  = aws_cloudwatch_log_group.aggregator.name
    web_user    = aws_cloudwatch_log_group.web_user.name
    web_admin   = aws_cloudwatch_log_group.web_admin.name
  }
}

output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.cache_nodes[0].port}"
  sensitive   = true
}

output "application_urls" {
  description = "Application URLs"
  value = {
    api       = var.domain_name != "" ? "https://api.${var.domain_name}" : "http://${aws_lb.main.dns_name}"
    web_user  = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
    web_admin = var.domain_name != "" ? "https://admin.${var.domain_name}" : "http://${aws_lb.main.dns_name}/admin"
  }
}

output "secrets_manager_arns" {
  description = "ARNs of Secrets Manager secrets"
  value = {
    db_password      = aws_secretsmanager_secret.db_password.arn
    jwt_secret       = aws_secretsmanager_secret.jwt_secret.arn
    api_key_pepper   = aws_secretsmanager_secret.api_key_pepper.arn
    numcheck_api_key = aws_secretsmanager_secret.numcheck_api_key.arn
  }
}
