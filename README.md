# NumCheck System

Event-driven, multi-tenant system for bulk validation of WhatsApp & Telegram numbers.

## Architecture

- **Gateway API**: Fastify + OpenAPI/Swagger
- **Workers**: wa-checker, tg-checker, aggregator, bulk-runner
- **Event Bus**: Redis Streams with consumer groups
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (7-day TTL per number/platform)
- **Storage**: S3 (MinIO for local)
- **UI**: React + TailwindCSS (User & Admin panels)

## Quick Start (Local)

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Start services
docker-compose up -d

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Start development
pnpm dev
```

## Services

- **Gateway**: http://localhost:3000 (API + Swagger at /docs)
- **Web User**: http://localhost:3001
- **Web Admin**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MinIO**: http://localhost:9000

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with email/password
- `GET /api/v1/me` - Get current user info

### Number Validation
- `POST /api/v1/quick-check` - Sync validation (≤100 numbers)
- `POST /api/v1/bulk/start` - Start bulk job
- `GET /api/v1/bulk/status?jobId=` - Get job status
- `GET /api/v1/bulk/stream?jobId=` - SSE progress stream
- `GET /api/v1/bulk/export.csv?jobId=` - Export results

### Admin
- `GET /api/admin/tenants` - Manage tenants
- `GET /api/admin/users` - Manage users
- `GET /api/admin/tg-accounts` - Manage Telegram accounts
- `GET /api/admin/jobs` - View all jobs

## Environment Variables

```env
JWT_SECRET=change_me
API_KEY_PEPPER=change_me
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/numcheck
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_BUCKET=numcheck-exports
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
AWS_REGION=ap-southeast-1
NUMCHECK_API_KEY=your_key
USE_WA_STAGE1=true
```

## WhatsApp Validation Strategy

1. **Stage 1** (Free/Cheap): Heuristic detection via wa.me/<E164>
2. **Stage 2** (Paid): NumberCheck.ai API fallback

## Telegram Validation

- GramJS/MTProto with account pool
- Round-robin with rate limiting
- Proxy support per account
- Exponential backoff for flood-wait

## Rate Limits

- Quick check: 60 req/min per tenant
- Bulk ingestion: 200 items/sec total
- Telegram: ~20 req/min per account

## Deployment

### Local Development
```bash
docker-compose up -d
pnpm dev
```

### AWS Production
```bash
cd infrastructure/aws
terraform init
terraform plan
terraform apply
```

## Testing

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

## Monitoring

- Health checks: `/healthz` on each service
- Metrics: Prometheus format at `/metrics`
- Tracing: OpenTelemetry
- Logs: Structured JSON to stdout


## Changelog
- init
