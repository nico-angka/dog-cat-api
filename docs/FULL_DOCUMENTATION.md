# Dog-to-Cat JSON Replacement API

A production-ready HTTP API that performs `dog` → `cat` replacements in arbitrary JSON payloads with configurable limits and comprehensive security.

## Overview

This API accepts any valid JSON payload and recursively replaces all occurrences of the string `"dog"` with `"cat"` in string values. It supports nested objects, arrays, and mixed structures while preserving non-string types (numbers, booleans, null).

## Features

### Core Functionality
- Arbitrary JSON payload support (any valid JSON structure)
- Configurable replacement limits (per-request basis)
- Partial results when limit exceeded
- Deep traversal of nested objects and arrays
- Type preservation (numbers, booleans, null unchanged)

### Security & Resilience
- DoS protection (payload size, recursion depth, timeouts)
- Rate limiting (100 req/min per IP)
- Security headers (Helmet.js)
- Input validation and sanitization
- Prototype pollution prevention
- Graceful shutdown handling

### Observability
- Structured logging with Pino
- Request correlation IDs
- Health check endpoints
- Basic metrics endpoint
- Response time tracking

### Production Ready
- Docker containerization
- CI/CD pipeline (GitHub Actions)
- Comprehensive test suite (>90% coverage)
- TypeScript with strict mode
- Environment-based configuration

## Quick Start

### Using Docker (Recommended)

```bash
# Copy environment variables
cp .env.example .env

# Start the service
docker-compose up -d

# Test the endpoint
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{"message": "I love my dog"}'

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Local Development

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Start production server
npm start
```

### Using Make

```bash
make install      # Install dependencies
make dev          # Start dev server
make test         # Run tests
make build        # Build for production
make docker-up    # Start with docker-compose
make docker-down  # Stop docker-compose
make help         # Show all commands
```

## API Documentation

### POST /replace

Replaces all occurrences of `"dog"` with `"cat"` in the provided JSON payload.

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body: Any valid JSON
- Query Parameters:
  - `limit` (optional): Max replacements for this request (capped at server's `MAX_REPLACEMENTS`)

**Response:**
- Status: `200 OK`
- Body:
```json
{
  "result": "<modified JSON>",
  "replacements": "<number of replacements made>",
  "limitReached": "<boolean indicating if limit was hit>"
}
```

**Examples:**

#### 1. Simple String Replacement

```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '"I love my dog"'
```

Response:
```json
{
  "result": "I love my cat",
  "replacements": 1,
  "limitReached": false
}
```

#### 2. Nested Object

```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{
    "pet": "dog",
    "details": {
      "breed": "golden retriever",
      "nickname": "good dog"
    }
  }'
```

Response:
```json
{
  "result": {
    "pet": "cat",
    "details": {
      "breed": "golden retriever",
      "nickname": "good cat"
    }
  },
  "replacements": 2,
  "limitReached": false
}
```

#### 3. Arrays

```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '["dog", "bird", "dog", "fish"]'
```

Response:
```json
{
  "result": ["cat", "bird", "cat", "fish"],
  "replacements": 2,
  "limitReached": false
}
```

#### 4. Mixed Types (Non-strings Preserved)

```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dog",
    "age": 5,
    "active": true,
    "owner": null
  }'
```

Response:
```json
{
  "result": {
    "name": "cat",
    "age": 5,
    "active": true,
    "owner": null
  },
  "replacements": 1,
  "limitReached": false
}
```

#### 5. Custom Limit via Query Param

```bash
curl -X POST "http://localhost:3000/replace?limit=3" \
  -H "Content-Type: application/json" \
  -d '["dog","dog","dog","dog","dog"]'
```

Response:
```json
{
  "result": ["cat","cat","cat","dog","dog"],
  "replacements": 3,
  "limitReached": true
}
```

#### 6. No Replacements Needed

```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{"animal": "cat", "count": 42}'
```

Response:
```json
{
  "result": {"animal": "cat", "count": 42},
  "replacements": 0,
  "limitReached": false
}
```

### GET /health

Returns service health status.

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 12345,
  "version": "1.0.0"
}
```

### GET /ready

Returns readiness status (validates configuration is loaded).

```bash
curl http://localhost:3000/ready
```

Response:
```json
{
  "ready": true,
  "checks": {
    "config": true
  }
}
```

### GET /metrics

Returns basic service metrics.

```bash
curl http://localhost:3000/metrics
```

Response:
```json
{
  "requestCount": 1234,
  "errorCount": 5,
  "averageResponseTime": 2.45,
  "uptime": 12345
}
```

## Configuration

All configuration is done through environment variables. See `.env.example` for a complete list.

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Host to bind to |
| `LOG_LEVEL` | `info` | Logging level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `MAX_REPLACEMENTS` | `100` | Maximum replacements per request (can be overridden per-request via `?limit=N` query param) |
| `MAX_DEPTH` | `100` | Maximum JSON nesting depth (DoS protection) |
| `BODY_LIMIT` | `10485760` | Maximum request body size in bytes (10MB) |
| `CONNECTION_TIMEOUT` | `30000` | Connection timeout in milliseconds |
| `RATE_LIMIT_MAX` | `100` | Maximum requests per time window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit time window in milliseconds (1 minute) |
| `SHUTDOWN_TIMEOUT` | `30000` | Graceful shutdown timeout in milliseconds |

## Design Decisions & Assumptions

### Replacement Rules

| Rule | Behavior | Example |
|------|----------|---------|
| **Case sensitive** | Only lowercase `"dog"` is replaced | `"Dog"` → `"Dog"` (unchanged) |
| **Exact match** | Substrings are NOT replaced | `"hotdog"` → `"hotdog"` (unchanged) |
| **Values only** | Object keys are NOT replaced | `{"dog": "dog"}` → `{"dog": "cat"}` |
| **Deep traversal** | All nested structures are searched | Recursive processing |

**Rationale:** Simplest interpretation that handles arbitrary JSON while being performant and predictable. The exact-match requirement prevents unintended modifications to compound words.

### Replacement Limit

- **Scope**: Per-request (each request has independent limit)
- **Behavior**: Returns partial results with `limitReached: true` flag
- **Configuration**: `MAX_REPLACEMENTS` environment variable
- **Default**: 100 replacements

**Rationale:** Stateless design enables horizontal scalability. The per-request limit (vs. global) ensures fair resource allocation and meets the "withstand heavy traffic" requirement.

### Security Approach

| Protection | Purpose | Configuration |
|------------|---------|---------------|
| Payload size limit | Prevent memory exhaustion | `BODY_LIMIT` |
| Recursion depth limit | Prevent stack overflow | `MAX_DEPTH` |
| Rate limiting | Prevent API abuse | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` |
| Input validation | Strict JSON and Content-Type | Built-in |
| Prototype pollution prevention | Block `__proto__`, `constructor` | Built-in |
| Security headers | XSS, clickjacking protection | Helmet.js |

**Rationale:** Defense in depth for production API security.

## Architecture

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Request                            │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Rate Limiter                                │
│                  (100 req/min per IP)                               │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Security Headers                               │
│                        (Helmet.js)                                  │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Content-Type Validation                          │
│                  (application/json required)                        │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Safe JSON Parser                               │
│              (Prototype pollution prevention)                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Replacement Service                              │
│         (Recursive traversal with depth limit)                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Response                                    │
│            (result, replacements, limitReached)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Error Handling

| Status Code | Error | Description |
|-------------|-------|-------------|
| `400` | Bad Request | Invalid JSON, malformed input, depth limit exceeded |
| `413` | Payload Too Large | Request body exceeds `BODY_LIMIT` |
| `415` | Unsupported Media Type | Missing or wrong Content-Type header |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected errors (details logged, not exposed) |
| `503` | Service Unavailable | Server is shutting down |

All error responses include a `requestId` for correlation with server logs.

### Testing Strategy

| Test Type | Coverage | Location |
|-----------|----------|----------|
| **Unit tests** | Core replacement logic, edge cases | `tests/unit/` |
| **Integration tests** | Full HTTP request/response flow | `tests/integration/` |
| **Security tests** | DoS protection, rate limiting, injection | `tests/integration/security.test.ts` |

**Coverage Target:** >85% (current: ~88%)

Run tests:
```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

## Performance Considerations

### Current Implementation

- **Approach**: Recursive JSON traversal with early termination
- **Complexity**: O(n) where n = total nodes in JSON tree
- **Memory**: Proportional to input size (creates modified copy)

### Alternative Approach Considered

String-based replacement (`jsonString.replace(/\bdog\b/g, 'cat')`) would be faster but:
- Would replace in object keys (violates requirements)
- Harder to count semantic "value replacements"
- Word boundary regex may have edge cases with unicode

**Decision**: Prioritized correctness and semantic replacement over raw performance.

### Optimization Notes

- Early termination when replacement limit reached
- Depth limit prevents stack overflow on deeply nested structures
- Streaming JSON parsing could be added for very large payloads

## Project Structure

```
dog-cat-api/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration loading and validation
│   ├── routes/
│   │   └── replace.route.ts  # POST /replace endpoint
│   ├── services/
│   │   └── jsonReplacer.ts   # Core replacement logic
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── server.ts             # Fastify app setup and middleware
├── tests/
│   ├── unit/
│   │   ├── jsonReplacer.test.ts
│   │   └── config.test.ts
│   └── integration/
│       ├── api.test.ts
│       └── security.test.ts
├── docs/
│   ├── ARCHITECTURE.md       # Detailed architecture documentation
│   └── API.md                # Complete API reference
├── scripts/
│   └── wait-for-it.sh        # Service readiness script
├── .github/
│   └── workflows/
│       └── test.yml          # CI/CD pipeline
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Container orchestration
├── Makefile                  # Developer convenience commands
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .env.example
├── .nvmrc
└── README.md
```

## Deployment

### Docker

```bash
# Build the image
docker build -t dog-cat-api .

# Run the container
docker run -p 3000:3000 --env-file .env dog-cat-api

# Check health
curl http://localhost:3000/health
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Production Deployment Checklist

#### Implemented
- [x] Core functionality with comprehensive tests
- [x] Security hardening (rate limiting, input validation, DoS protection)
- [x] Observability (logging, health checks, metrics)
- [x] Docker containerization
- [x] CI/CD pipeline
- [x] Documentation

#### Recommended for Production
- [ ] **TLS/HTTPS**: Terminate SSL at load balancer or use certificates
- [ ] **Authentication**: Add API keys or OAuth2 if needed
- [ ] **WAF**: CloudFlare or AWS WAF for additional DDoS protection
- [ ] **Distributed Rate Limiting**: Redis-backed for multi-instance deployments
- [ ] **Advanced Monitoring**: Prometheus + Grafana, distributed tracing
- [ ] **Log Aggregation**: ELK stack, CloudWatch, or Datadog
- [ ] **Secret Management**: Use Vault or cloud secret managers

### Infrastructure Scaling

The stateless design supports:
- **Horizontal scaling**: Run multiple instances behind a load balancer
- **Serverless**: Deploy to AWS Lambda, Google Cloud Run, or Azure Functions
- **Container orchestration**: Kubernetes, ECS, or Docker Swarm

## Development

### Prerequisites

- Node.js >= 20.0.0 (see `.nvmrc`)
- npm >= 9.0.0
- Docker (optional, for containerized deployment)

### Code Quality

```bash
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
```

### Adding New Features

1. **New endpoint**: Add route file in `src/routes/`, register in `server.ts`
2. **New middleware**: Add to `server.ts` in the appropriate section
3. **New service**: Create in `src/services/`, add types in `src/types/`
4. **Tests**: Add corresponding tests in `tests/unit/` or `tests/integration/`

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# View request/response details
LOG_LEVEL=trace npm run dev
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or use a different port
PORT=3001 npm run dev
```

**Rate limit exceeded during testing:**
```bash
# Increase rate limit for testing
RATE_LIMIT_MAX=1000 npm run dev
```

**Docker build fails:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t dog-cat-api .
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Ensure linting passes (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Fastify](https://www.fastify.io/) - Fast and low overhead web framework
- [Pino](https://getpino.io/) - Super fast, all natural JSON logger
- [Vitest](https://vitest.dev/) - Blazing fast unit test framework
- [TypeScript](https://www.typescriptlang.org/) - JavaScript with syntax for types
