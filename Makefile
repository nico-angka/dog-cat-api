# =============================================================================
# Makefile - Developer Convenience Commands
# =============================================================================
# Usage: make <command>
# Run 'make help' to see all available commands

# Default shell
SHELL := /bin/bash

# Variables
DOCKER_IMAGE := dog-cat-api
DOCKER_TAG := latest
CONTAINER_NAME := dog-cat-api

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Help
# =============================================================================
.PHONY: help
help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  %-20s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# =============================================================================
# Development
# =============================================================================
.PHONY: install
install: ## Install dependencies
	npm ci

.PHONY: dev
dev: ## Start development server with hot reload
	npm run dev

.PHONY: build
build: ## Build TypeScript for production
	npm run build

.PHONY: start
start: ## Start production server (requires build first)
	npm start

# =============================================================================
# Testing
# =============================================================================
.PHONY: test
test: ## Run tests
	npm test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	npm run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report
	npm run test:coverage

# =============================================================================
# Code Quality
# =============================================================================
.PHONY: lint
lint: ## Run ESLint
	npm run lint

.PHONY: lint-fix
lint-fix: ## Run ESLint with auto-fix
	npm run lint:fix

.PHONY: type-check
type-check: ## Run TypeScript type checking
	npm run type-check

.PHONY: check
check: type-check lint test ## Run all checks (type-check, lint, test)

# =============================================================================
# Docker
# =============================================================================
.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

.PHONY: docker-run
docker-run: ## Run Docker container
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p 3000:3000 \
		--env-file .env \
		$(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: docker-stop
docker-stop: ## Stop Docker container
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

.PHONY: docker-logs
docker-logs: ## View Docker container logs
	docker logs -f $(CONTAINER_NAME)

.PHONY: docker-shell
docker-shell: ## Open shell in running container
	docker exec -it $(CONTAINER_NAME) /bin/sh

# =============================================================================
# Docker Compose
# =============================================================================
.PHONY: docker-up
docker-up: ## Start services with docker-compose
	docker-compose up -d

.PHONY: docker-down
docker-down: ## Stop services with docker-compose
	docker-compose down

.PHONY: docker-restart
docker-restart: docker-down docker-up ## Restart services

.PHONY: docker-rebuild
docker-rebuild: ## Rebuild and restart services
	docker-compose up -d --build

.PHONY: docker-compose-logs
docker-compose-logs: ## View docker-compose logs
	docker-compose logs -f

# =============================================================================
# Cleanup
# =============================================================================
.PHONY: clean
clean: ## Remove build artifacts
	rm -rf dist
	rm -rf coverage
	rm -rf node_modules/.cache

.PHONY: clean-all
clean-all: clean ## Remove all generated files including node_modules
	rm -rf node_modules

.PHONY: docker-clean
docker-clean: docker-stop ## Remove Docker image
	docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) || true

# =============================================================================
# Utilities
# =============================================================================
.PHONY: health
health: ## Check application health
	@curl -s http://localhost:3000/health | jq . || echo "Service not running"

.PHONY: metrics
metrics: ## View application metrics
	@curl -s http://localhost:3000/metrics | jq . || echo "Service not running"

.PHONY: ready
ready: ## Check application readiness
	@curl -s http://localhost:3000/ready | jq . || echo "Service not running"
