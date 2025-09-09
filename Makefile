.PHONY: help install build dev test clean docker-build docker-up docker-down migrate seed

# Default target
help: ## Show this help message
	@echo "NumCheck System - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
install: ## Install all dependencies
	pnpm install

build: ## Build all packages and services
	pnpm build

dev: ## Start development servers
	pnpm dev

test: ## Run all tests
	pnpm test

test-integration: ## Run integration tests
	pnpm test:integration

test-e2e: ## Run end-to-end tests
	pnpm test:e2e

lint: ## Run linting
	pnpm lint

lint-fix: ## Fix linting issues
	pnpm lint:fix

type-check: ## Run TypeScript type checking
	pnpm type-check

clean: ## Clean all build artifacts and node_modules
	pnpm clean

# Database commands
migrate: ## Run database migrations
	pnpm db:migrate

seed: ## Seed database with initial data
	pnpm db:seed

db-studio: ## Open Prisma Studio
	pnpm db:studio

db-reset: ## Reset database (drop and recreate)
	docker-compose down postgres
	docker volume rm numcheck-system_postgres_data || true
	docker-compose up -d postgres
	sleep 10
	pnpm db:migrate
	pnpm db:seed

# Docker commands
docker-build: ## Build all Docker images
	docker-compose build

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-logs: ## Show logs from all services
	docker-compose logs -f

docker-restart: ## Restart all Docker services
	docker-compose restart

docker-clean: ## Clean Docker images and volumes
	docker-compose down -v
	docker system prune -f

# Infrastructure commands
tf-init: ## Initialize Terraform
	cd infrastructure/aws && terraform init

tf-plan: ## Plan Terraform changes
	cd infrastructure/aws && terraform plan

tf-apply: ## Apply Terraform changes
	cd infrastructure/aws && terraform apply

tf-destroy: ## Destroy Terraform infrastructure
	cd infrastructure/aws && terraform destroy

# AWS deployment commands
ecr-login: ## Login to AWS ECR
	aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.ap-southeast-1.amazonaws.com

build-and-push: ## Build and push all images to ECR
	@echo "Building and pushing images to ECR..."
	@for service in gateway worker-wa worker-tg aggregator web-user web-admin; do \
		echo "Building $$service..."; \
		if [ "$$service" = "web-user" ] || [ "$$service" = "web-admin" ]; then \
			docker build -f apps/$$service/Dockerfile -t numcheck-$$service .; \
		else \
			docker build -f services/$$service/Dockerfile -t numcheck-$$service .; \
		fi; \
		docker tag numcheck-$$service:latest $(AWS_ACCOUNT_ID).dkr.ecr.ap-southeast-1.amazonaws.com/numcheck-$$service:latest; \
		docker push $(AWS_ACCOUNT_ID).dkr.ecr.ap-southeast-1.amazonaws.com/numcheck-$$service:latest; \
	done

deploy-staging: ## Deploy to staging environment
	cd infrastructure/aws && terraform apply -var-file="staging.tfvars" -auto-approve

deploy-production: ## Deploy to production environment
	cd infrastructure/aws && terraform apply -var-file="production.tfvars"

# Monitoring and debugging
logs-gateway: ## Show gateway service logs
	docker-compose logs -f gateway

logs-worker-wa: ## Show WhatsApp worker logs
	docker-compose logs -f worker-wa

logs-worker-tg: ## Show Telegram worker logs
	docker-compose logs -f worker-tg

logs-aggregator: ## Show aggregator service logs
	docker-compose logs -f aggregator

health-check: ## Check health of all services
	@echo "Checking service health..."
	@curl -f http://localhost:3000/healthz || echo "Gateway: UNHEALTHY"
	@curl -f http://localhost:3001/ || echo "Web User: UNHEALTHY"
	@curl -f http://localhost:3002/ || echo "Web Admin: UNHEALTHY"

# Development utilities
setup-dev: ## Setup development environment
	cp .env.example .env
	make install
	make docker-up
	sleep 30
	make migrate
	make seed
	@echo "Development environment ready!"
	@echo "Gateway API: http://localhost:3000"
	@echo "Web User: http://localhost:3001"
	@echo "Web Admin: http://localhost:3002"
	@echo "API Docs: http://localhost:3000/docs"

reset-dev: ## Reset development environment
	make docker-down
	make docker-clean
	make setup-dev

# Testing utilities
test-api: ## Test API endpoints
	@echo "Testing API endpoints..."
	@curl -X POST http://localhost:3000/api/v1/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"demo@example.com","password":"demo123"}' || echo "Login test failed"

benchmark: ## Run performance benchmarks
	@echo "Running performance benchmarks..."
	# Add benchmark commands here

# Security
security-scan: ## Run security scans
	@echo "Running security scans..."
	npm audit
	docker run --rm -v $(PWD):/app -w /app aquasec/trivy fs .

# Documentation
docs-serve: ## Serve documentation locally
	@echo "Starting documentation server..."
	@echo "API Documentation: http://localhost:3000/docs"

# Backup and restore
backup-db: ## Backup database
	docker-compose exec postgres pg_dump -U postgres numcheck > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore-db: ## Restore database from backup (usage: make restore-db BACKUP_FILE=backup.sql)
	docker-compose exec -T postgres psql -U postgres numcheck < $(BACKUP_FILE)

# Environment variables
check-env: ## Check required environment variables
	@echo "Checking environment variables..."
	@test -n "$(JWT_SECRET)" || (echo "JWT_SECRET is not set" && exit 1)
	@test -n "$(DATABASE_URL)" || (echo "DATABASE_URL is not set" && exit 1)
	@test -n "$(REDIS_URL)" || (echo "REDIS_URL is not set" && exit 1)
	@echo "All required environment variables are set!"

# Quick commands for common workflows
quick-start: setup-dev ## Quick start for new developers

full-test: lint type-check test test-integration ## Run all tests and checks

pre-commit: lint-fix type-check test ## Run pre-commit checks

deploy: build-and-push deploy-production ## Build and deploy to production
