# Changelog

All notable changes to the NumCheck system will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

#### Core System
- **Event-driven architecture** with Redis Streams for reliable message processing
- **Multi-tenant support** with isolated data and rate limiting per tenant
- **Microservices architecture** with dedicated services for different responsibilities
- **Comprehensive API** with OpenAPI/Swagger documentation
- **Production-ready deployment** with Docker and AWS infrastructure

#### Services
- **Gateway API Service**: REST API with authentication, rate limiting, and request routing
- **WhatsApp Worker**: Two-stage validation (heuristic + NumberCheck.ai API)
- **Telegram Worker**: GramJS-based validation with account pool management
- **Aggregator Service**: Job progress tracking and result export generation

#### Features
- **Quick Check**: Synchronous validation for up to 100 numbers (≤5 seconds)
- **Bulk Check**: Asynchronous validation for up to 1 million numbers
- **Real-time Progress**: Server-Sent Events for live job progress updates
- **Result Export**: CSV export with signed S3 URLs
- **Caching**: 7-day TTL for validation results per number/platform
- **Rate Limiting**: Configurable limits per tenant (60 req/min default)

#### Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **API Key Support**: Alternative authentication method for programmatic access
- **Role-based Access Control**: ADMIN, TENANT_ADMIN, USER roles
- **Multi-tenant Isolation**: Complete data separation between tenants

#### WhatsApp Validation
- **Stage 1 (Free)**: Heuristic detection via wa.me URLs for business accounts
- **Stage 2 (Paid)**: NumberCheck.ai API integration with fallback
- **Smart Caching**: Avoid redundant API calls with Redis caching
- **Cost Optimization**: Feature flags to control validation stages

#### Telegram Validation
- **GramJS Integration**: Native Telegram MTProto client
- **Account Pool Management**: Round-robin distribution across multiple accounts
- **Proxy Support**: Optional SOCKS5 proxy configuration per account
- **Flood Wait Handling**: Automatic backoff and retry mechanisms
- **Daily Limits**: Configurable request limits per Telegram account

#### Database & Storage
- **PostgreSQL**: Primary database with Prisma ORM
- **Redis**: Caching and event streaming
- **S3 Compatible Storage**: Result exports (AWS S3 or MinIO)
- **Database Migrations**: Automated schema management
- **Seed Data**: Initial admin and demo accounts

#### Web Interfaces
- **User Dashboard**: React SPA for number validation and job management
- **Admin Panel**: Tenant, user, and system management interface
- **Responsive Design**: TailwindCSS-based modern UI
- **Real-time Updates**: Live progress tracking and notifications

#### Infrastructure & Deployment
- **Docker Support**: Complete containerization with docker-compose
- **AWS Infrastructure**: Terraform-based ECS Fargate deployment
- **CI/CD Pipeline**: GitHub Actions with automated testing and deployment
- **Monitoring**: Prometheus metrics, Grafana dashboards, structured logging
- **Health Checks**: Comprehensive service health monitoring

#### Developer Experience
- **Monorepo Structure**: pnpm workspaces for efficient dependency management
- **TypeScript**: Full type safety across all services
- **Code Quality**: ESLint, Prettier, and automated testing
- **API Documentation**: OpenAPI spec with Postman collection
- **Development Tools**: Makefile with common commands

#### Testing & Quality
- **Unit Tests**: Comprehensive test coverage for core functionality
- **Integration Tests**: End-to-end testing of API endpoints
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Linting**: Automated code quality checks
- **Security Scanning**: Trivy vulnerability scanning in CI/CD

#### Documentation
- **API Specification**: Complete OpenAPI 3.0 documentation
- **Postman Collection**: Ready-to-use API testing collection
- **Deployment Guide**: Comprehensive deployment instructions
- **README**: Quick start and overview documentation
- **Code Comments**: Inline documentation for complex logic

### Technical Specifications

#### Architecture
- **Language**: Node.js 20 LTS with TypeScript
- **Framework**: Fastify for high-performance API
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache/Queue**: Redis 7 with Streams
- **Storage**: S3-compatible object storage
- **Frontend**: React 18 with TailwindCSS

#### Performance
- **Quick Check**: <5 second response time for 100 numbers
- **Bulk Processing**: 200 items/second ingestion rate
- **Caching**: 7-day TTL reduces API costs by ~80%
- **Rate Limiting**: Configurable per-tenant limits
- **Horizontal Scaling**: Stateless services for easy scaling

#### Security
- **Authentication**: JWT + API Key support
- **Authorization**: Role-based access control
- **Data Isolation**: Multi-tenant architecture
- **Encryption**: TLS/HTTPS for all communications
- **Secrets Management**: AWS Secrets Manager integration

#### Reliability
- **Event Sourcing**: Redis Streams for reliable message processing
- **Retry Logic**: Exponential backoff for external API calls
- **Circuit Breakers**: Fault tolerance for external dependencies
- **Health Checks**: Comprehensive service monitoring
- **Graceful Shutdown**: Proper cleanup on service termination

#### Scalability
- **Microservices**: Independent scaling of components
- **Stateless Design**: Easy horizontal scaling
- **Database Optimization**: Proper indexing and query optimization
- **Caching Strategy**: Multi-layer caching for performance
- **Load Balancing**: ALB with health check integration

### Configuration

#### Environment Variables
- **Security**: JWT_SECRET, API_KEY_PEPPER
- **Database**: DATABASE_URL (PostgreSQL connection)
- **Cache**: REDIS_URL (Redis connection)
- **Storage**: S3 configuration (endpoint, bucket, credentials)
- **External APIs**: NUMCHECK_API_KEY
- **Feature Flags**: USE_WA_STAGE1

#### Rate Limits (Default)
- **Quick Check**: 60 requests/minute per tenant
- **Bulk Ingestion**: 200 items/second total
- **Telegram Accounts**: 20 requests/minute per account

#### Cache TTL
- **Validation Results**: 7 days per number/platform
- **Rate Limit Counters**: 1 minute sliding window
- **JWT Tokens**: 24 hours (configurable)

### Deployment Options

#### Local Development
```bash
make quick-start
```

#### Docker Compose
```bash
docker-compose up -d
```

#### AWS Production
```bash
cd infrastructure/aws
terraform apply
```

### API Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/me` - Current user information

#### Validation
- `POST /api/v1/quick-check` - Synchronous validation
- `POST /api/v1/bulk/start` - Start bulk job
- `GET /api/v1/bulk/status` - Job status
- `GET /api/v1/bulk/stream` - SSE progress stream
- `GET /api/v1/bulk/export.csv` - Export results

#### Admin
- `GET /api/admin/tenants` - Tenant management
- `GET /api/admin/users` - User management
- `GET /api/admin/tg-accounts` - Telegram account management
- `GET /api/admin/jobs` - Job monitoring

### Default Credentials

#### Users
- **Admin**: admin@numcheck.com / admin123
- **Demo**: demo@example.com / demo123

#### API Keys
- **Default**: default-api-key
- **Demo**: demo-api-key

### Known Limitations

1. **Telegram Rate Limits**: Subject to Telegram's flood control
2. **WhatsApp Detection**: Stage 1 heuristics may have false negatives
3. **NumberCheck.ai Dependency**: Stage 2 requires external API credits
4. **Memory Usage**: Large bulk jobs may require increased memory limits

### Future Enhancements

1. **Additional Platforms**: Signal, Discord validation
2. **Advanced Analytics**: Usage statistics and reporting
3. **Webhook Support**: Real-time notifications for job completion
4. **API Rate Limiting**: More granular rate limiting options
5. **Batch Export**: Multiple format support (JSON, Excel)

---

For detailed deployment instructions, see [DEPLOYMENT.md](./docs/DEPLOYMENT.md).
For API documentation, see [api-spec.yaml](./docs/api-spec.yaml).
