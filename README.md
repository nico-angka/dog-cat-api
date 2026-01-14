# Dog-to-Cat JSON Replacement API

A production-ready HTTP API that replaces `"dog"` with `"cat"` in any JSON payload.

## Quick Start

```bash
npm install
npm run dev
```

```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{"pet": "dog", "says": "woof"}'
```

```json
{"result": {"pet": "cat", "says": "woof"}, "replacements": 1, "limitReached": false}
```

## API

### `POST /replace`

Replace all occurrences of `"dog"` with `"cat"` in string values.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| body | body | yes | Any valid JSON |
| limit | query | no | Max replacements (default: 100) |

**Response:**
```json
{
  "result": "<modified JSON>",
  "replacements": 3,
  "limitReached": false
}
```

**Examples:**
```bash
# Simple
curl -X POST localhost:3000/replace -H "Content-Type: application/json" -d '"dog"'

# With custom limit
curl -X POST "localhost:3000/replace?limit=5" -H "Content-Type: application/json" -d '["dog","dog","dog"]'
```

### `GET /health`

Health check endpoint for liveness probes.

### `GET /ready`

Readiness check endpoint.

### `GET /metrics`

Basic service metrics (request count, error count, avg response time).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MAX_REPLACEMENTS` | 100 | Max replacements per request |
| `MAX_DEPTH` | 100 | Max JSON nesting depth |
| `RATE_LIMIT_MAX` | 100 | Requests per minute per IP |
| `LOG_LEVEL` | info | Log level |

See [.env.example](.env.example) for all options.

## Development

```bash
npm run dev          # Start with hot reload
npm test             # Run tests
npm run test:coverage # Coverage report (~88%)
npm run lint         # ESLint
npm run build        # Build for production
```

## Testing

### Test Results

| Test Suite | Tests | Description |
|------------|-------|-------------|
| `jsonReplacer.test.ts` | 74 | Core replacement logic, edge cases, word boundaries |
| `config.test.ts` | 19 | Environment variable parsing, defaults, validation |
| `api.test.ts` | 61 | HTTP endpoints, request/response flow, query params |
| `security.test.ts` | 38 | Rate limiting, DoS protection, prototype pollution |
| **Total** | **192** | **~88% code coverage** |

### What's Tested

**Unit Tests** (`tests/unit/`)
- String replacement with word boundaries
- Nested object/array traversal
- Type preservation (numbers, booleans, null)
- Replacement limit behavior
- Depth limit protection
- Prototype pollution prevention

**Integration Tests** (`tests/integration/`)
- All HTTP endpoints (POST /replace, GET /health, /ready, /metrics)
- Content-Type validation (415 errors)
- Invalid JSON handling (400 errors)
- Query param limit override
- Request correlation IDs
- Error response format

**Security Tests**
- Rate limiting enforcement
- Large payload rejection
- Deep nesting rejection
- Malicious key filtering (`__proto__`, `constructor`)

## Docker

```bash
docker build -t dog-cat-api .
docker run -p 3000:3000 dog-cat-api
```

Or with docker-compose:
```bash
docker-compose up
```

## Design Notes

- **Exact match only**: `"dog"` → `"cat"`, but `"hotdog"` unchanged
- **Case sensitive**: Only lowercase `"dog"` is replaced
- **Values only**: Object keys are not modified
- **Stateless**: Each request independent, horizontally scalable

## Tech Stack

- **Fastify** - Web framework
- **TypeScript** - Type safety
- **Vitest** - Testing
- **Pino** - Logging
- **Helmet** - Security headers
- **Rate limiting** - DoS protection

## Documentation

- [Interview Notes](INTERVIEW_NOTES.md) - Design decisions summary
- [Full Documentation](docs/FULL_DOCUMENTATION.md) - Comprehensive docs
- [API Reference](docs/API.md) - Complete API details

## License

MIT
