# NumCheck Deployment Guide

This guide covers deployment options for the NumCheck system, from local development to production AWS deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [AWS Production Deployment](#aws-production-deployment)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js 20+**: Runtime for all services
- **pnpm 8+**: Package manager
- **Docker & Docker Compose**: For containerized deployment
- **PostgreSQL 15+**: Database
- **Redis 7+**: Cache and event streaming
- **AWS CLI**: For AWS deployment
- **Terraform 1.6+**: Infrastructure as Code

### Required Accounts & Keys

- **AWS Account**: For production deployment
- **NumberCheck.ai API Key**: For WhatsApp validation
- **Telegram API Credentials**: For Telegram validation (optional)

## Local Development

### Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd numcheck-system

# Quick setup (recommended for new developers)
make quick-start
```

This will:
1. Copy `.env.example` to `.env`
2. Install dependencies
3. Start Docker services
4. Run database migrations
5. Seed initial data

### Manual Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure services
docker-compose up -d postgres redis minio

# Wait for services to be ready
sleep 30

# Run database migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Start development servers
pnpm dev
```

### Access Points

- **Gateway API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs
- **Web User Interface**: http://localhost:3001
- **Web Admin Interface**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MinIO Console**: http://localhost:9001

### Default Credentials

```
Admin User:
- Email: admin@numcheck.com
- Password: admin123

Demo User:
- Email: demo@example.com
- Password: demo123

API Keys:
- Default: default-api-key
- Demo: demo-api-key

MinIO:
- Access Key: minioadmin
- Secret Key: minioadmin
```

## Docker Deployment

### Full Stack with Docker Compose

```bash
# Build all images
make docker-build

# Start all services
make docker-up

# Check service health
make health-check

# View logs
make docker-logs

# Stop services
make docker-down
```

### Individual Service Management

```bash
# Start specific services
docker-compose up -d postgres redis minio
docker-compose up -d gateway worker-wa worker-tg aggregator

# Scale workers
docker-compose up -d --scale worker-wa=3 --scale worker-tg=2

# Update service
docker-compose build gateway
docker-compose up -d gateway
```

### Production Docker Setup

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# With environment file
docker-compose --env-file .env.production up -d
```

## AWS Production Deployment

### Prerequisites

1. **AWS CLI Configuration**
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

2. **Create ECR Repositories**
```bash
# Login to ECR
make ecr-login

# Create repositories (run once)
aws ecr create-repository --repository-name numcheck-gateway
aws ecr create-repository --repository-name numcheck-worker-wa
aws ecr create-repository --repository-name numcheck-worker-tg
aws ecr create-repository --repository-name numcheck-aggregator
aws ecr create-repository --repository-name numcheck-web-user
aws ecr create-repository --repository-name numcheck-web-admin
```

### Infrastructure Deployment

1. **Initialize Terraform**
```bash
cd infrastructure/aws
terraform init
```

2. **Create Environment Configuration**
```bash
# Create production.tfvars
cat > production.tfvars << EOF
project_name = "numcheck"
environment = "production"
aws_region = "ap-southeast-1"

# Database
db_instance_class = "db.t3.small"
db_allocated_storage = 100

# Redis
redis_node_type = "cache.t3.small"

# ECS
ecs_cpu = 512
ecs_memory = 1024
gateway_desired_count = 2
worker_wa_desired_count = 3
worker_tg_desired_count = 2
aggregator_desired_count = 1

# Domain (optional)
domain_name = "yourdomain.com"
certificate_arn = "arn:aws:acm:region:account:certificate/cert-id"

# Security
enable_deletion_protection = true
backup_retention_period = 7
EOF
```

3. **Deploy Infrastructure**
```bash
# Plan deployment
terraform plan -var-file="production.tfvars"

# Apply (with manual approval)
terraform apply -var-file="production.tfvars"
```

### Application Deployment

1. **Build and Push Images**
```bash
# Set AWS account ID
export AWS_ACCOUNT_ID=123456789012

# Build and push all images
make build-and-push
```

2. **Deploy Services**
```bash
# Update ECS services
aws ecs update-service --cluster numcheck-production --service numcheck-production-gateway --force-new-deployment
aws ecs update-service --cluster numcheck-production --service numcheck-production-worker-wa --force-new-deployment
aws ecs update-service --cluster numcheck-production --service numcheck-production-worker-tg --force-new-deployment
aws ecs update-service --cluster numcheck-production --service numcheck-production-aggregator --force-new-deployment
```

3. **Run Database Migrations**
```bash
# Get subnet and security group IDs from Terraform output
SUBNET_ID=$(terraform output -raw private_subnet_ids | jq -r '.[0]')
SECURITY_GROUP_ID=$(terraform output -raw ecs_security_group_id)

# Run migration task
aws ecs run-task \
  --cluster numcheck-production \
  --task-definition numcheck-production-gateway \
  --overrides '{"containerOverrides":[{"name":"gateway","command":["pnpm","db:migrate"]}]}' \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=DISABLED}"
```

### CI/CD Pipeline

The GitHub Actions workflow automatically:

1. **On Pull Request**: Run tests and linting
2. **On Push to Main**: Build and push Docker images
3. **On Push to Main**: Deploy to production (with manual approval)

Required GitHub Secrets:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_ACCOUNT_ID
JWT_SECRET
API_KEY_PEPPER
NUMCHECK_API_KEY
PRODUCTION_APPROVERS (comma-separated GitHub usernames)
```

## Environment Configuration

### Required Environment Variables

```bash
# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
API_KEY_PEPPER=your-api-key-pepper-for-hashing

# Database
DATABASE_URL=postgresql://user:password@host:5432/numcheck

# Redis
REDIS_URL=redis://host:6379

# S3 Storage
S3_ENDPOINT=https://s3.ap-southeast-1.amazonaws.com  # or MinIO endpoint
S3_BUCKET=numcheck-exports
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
AWS_REGION=ap-southeast-1

# External APIs
NUMCHECK_API_KEY=your-numbercheck-ai-api-key

# Feature Flags
USE_WA_STAGE1=true

# Rate Limits
QUICK_CHECK_RATE_LIMIT=60
BULK_INGESTION_RATE_LIMIT=200
TG_ACCOUNT_RATE_LIMIT=20
```

### Environment-Specific Configurations

#### Development (.env)
```bash
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/numcheck
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
```

#### Staging (.env.staging)
```bash
NODE_ENV=staging
LOG_LEVEL=info
# Use AWS RDS and ElastiCache endpoints
```

#### Production (.env.production)
```bash
NODE_ENV=production
LOG_LEVEL=warn
# Use AWS Secrets Manager for sensitive values
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check all services
make health-check

# Individual service health
curl http://localhost:3000/healthz
curl http://localhost:3001/
curl http://localhost:3002/
```

### Monitoring Endpoints

- **Metrics**: `/metrics` (Prometheus format)
- **Health**: `/healthz`
- **API Docs**: `/docs`

### Log Management

```bash
# View logs
make logs-gateway
make logs-worker-wa
make logs-worker-tg
make logs-aggregator

# In production (CloudWatch)
aws logs tail /aws/ecs/numcheck-production-gateway --follow
```

### Database Maintenance

```bash
# Backup database
make backup-db

# Restore database
make restore-db BACKUP_FILE=backup_20240101_120000.sql

# Reset development database
make db-reset
```

### Performance Monitoring

1. **Database Performance**
   - Monitor connection pool usage
   - Check slow query logs
   - Monitor index usage

2. **Redis Performance**
   - Monitor memory usage
   - Check hit/miss ratios
   - Monitor stream lag

3. **Application Metrics**
   - Request latency
   - Error rates
   - Queue processing times

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
docker-compose exec postgres pg_isready -U postgres

# Check connection from application
docker-compose exec gateway node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => console.log('Connected')).catch(console.error);
"
```

#### 2. Redis Connection Issues
```bash
# Check Redis connectivity
docker-compose exec redis redis-cli ping

# Check Redis streams
docker-compose exec redis redis-cli XINFO GROUPS bulk:items
```

#### 3. Worker Not Processing Jobs
```bash
# Check worker logs
docker-compose logs worker-wa

# Check Redis streams for pending messages
docker-compose exec redis redis-cli XPENDING bulk:items wa-worker

# Manually process pending messages
docker-compose exec redis redis-cli XCLAIM bulk:items wa-worker consumer1 0 message-id
```

#### 4. High Memory Usage
```bash
# Check container memory usage
docker stats

# Check Node.js heap usage
docker-compose exec gateway node -e "console.log(process.memoryUsage())"
```

#### 5. Rate Limiting Issues
```bash
# Check rate limit status
curl -I http://localhost:3000/api/v1/quick-check

# Reset rate limits (Redis)
docker-compose exec redis redis-cli FLUSHDB
```

### Performance Tuning

#### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'job_items';
```

#### Redis Optimization
```bash
# Monitor Redis performance
redis-cli --latency-history -i 1

# Check memory usage
redis-cli INFO memory
```

#### Application Optimization
- Enable connection pooling
- Implement proper caching strategies
- Use database read replicas for heavy queries
- Optimize worker batch sizes

### Scaling Guidelines

#### Horizontal Scaling
```bash
# Scale workers based on queue length
docker-compose up -d --scale worker-wa=5 --scale worker-tg=3

# In AWS ECS
aws ecs update-service --cluster numcheck-production --service numcheck-production-worker-wa --desired-count 5
```

#### Vertical Scaling
- Increase ECS task CPU/memory
- Upgrade RDS instance class
- Upgrade ElastiCache node type

### Security Considerations

1. **Secrets Management**
   - Use AWS Secrets Manager in production
   - Rotate API keys regularly
   - Use IAM roles instead of access keys

2. **Network Security**
   - Use VPC with private subnets
   - Implement security groups properly
   - Enable WAF for public endpoints

3. **Data Protection**
   - Enable RDS encryption
   - Use HTTPS/TLS for all communications
   - Implement proper backup encryption

### Disaster Recovery

1. **Database Backups**
   - Automated daily backups
   - Cross-region backup replication
   - Regular restore testing

2. **Infrastructure as Code**
   - All infrastructure in Terraform
   - Version controlled configurations
   - Automated deployment pipelines

3. **Monitoring and Alerting**
   - CloudWatch alarms
   - PagerDuty integration
   - Health check monitoring

For additional support, please refer to the [API documentation](./api-spec.yaml) or contact the development team.
