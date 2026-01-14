# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

#### Core Features
- POST `/replace` endpoint for dog-to-cat JSON replacement
- Support for arbitrary JSON payloads (strings, numbers, booleans, null, objects, arrays)
- Configurable replacement limit (`MAX_REPLACEMENTS`, default: 100)
- Partial results with `limitReached` flag when limit exceeded
- Deep traversal of nested structures with depth limiting

#### Security
- Rate limiting with configurable limits (default: 100 req/min per IP)
- Helmet.js security headers (CSP, HSTS, X-Frame-Options, etc.)
- Request body size limiting (default: 10MB)
- Recursion depth limiting (default: 100 levels)
- Prototype pollution prevention in JSON parsing
- Input validation and Content-Type enforcement
- Graceful shutdown handling

#### Observability
- GET `/health` endpoint for liveness checks
- GET `/ready` endpoint for readiness checks
- GET `/metrics` endpoint for basic metrics
- Structured JSON logging with Pino
- Request correlation IDs (X-Request-Id header)
- Response time tracking

#### Infrastructure
- Multi-stage Dockerfile for optimized production builds
- Docker Compose configuration with health checks
- GitHub Actions CI/CD pipeline
- Makefile for developer convenience
- ESLint configuration with TypeScript support

#### Documentation
- Comprehensive README with quick start guide
- API reference documentation
- Architecture documentation
- Inline code documentation with JSDoc

#### Testing
- Unit tests for core replacement logic (74 tests)
- Integration tests for API endpoints (56 tests)
- Security tests for protection mechanisms (38 tests)
- Configuration tests (19 tests)
- Coverage threshold: 85%+

### Technical Details

#### Dependencies
- Fastify v5.1.0 - Web framework
- @fastify/helmet v13.0.2 - Security headers
- @fastify/rate-limit v10.3.0 - Rate limiting
- Pino v9.5.0 - Logging
- Zod v3.24.1 - Schema validation
- TypeScript v5.7.2 - Type safety

#### Development Dependencies
- Vitest v2.1.8 - Testing framework
- ESLint v9.39.2 - Linting
- tsx v4.19.2 - TypeScript execution

### Known Limitations
- Rate limiting is per-instance (not distributed)
- No authentication/authorization (add as needed)
- In-memory metrics (reset on restart)

---

## [Unreleased]

### Planned
- Distributed rate limiting with Redis
- OpenTelemetry integration
- API key authentication
- Prometheus metrics endpoint
- Performance benchmarking suite

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-01-15 | Initial release |
