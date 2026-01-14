# Architecture Documentation

This document provides detailed technical information about the Dog-to-Cat JSON Replacement API architecture, design decisions, and implementation details.

## System Overview

The API is built as a stateless HTTP service using the Fastify framework. It processes JSON payloads, performs string replacements, and returns modified results with metadata.

```
                                    ┌─────────────────────┐
                                    │    Load Balancer    │
                                    │    (Optional)       │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
          ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
          │   Instance 1    │        │   Instance 2    │        │   Instance N    │
          │   (Stateless)   │        │   (Stateless)   │        │   (Stateless)   │
          └─────────────────┘        └─────────────────┘        └─────────────────┘
```

## Component Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Fastify Server                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Middleware Stack                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Helmet    │→ │ Rate Limit  │→ │   Request   │→ │  Content    │  │  │
│  │  │  (Security) │  │  (Abuse)    │  │   Logging   │  │  Parsing    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                             Routes                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ POST        │  │ GET         │  │ GET         │  │ GET         │  │  │
│  │  │ /replace    │  │ /health     │  │ /ready      │  │ /metrics    │  │  │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └─────────┼─────────────────────────────────────────────────────────────┘  │
│            │                                                                 │
│            ▼                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                            Services                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    JSON Replacer Service                         │  │  │
│  │  │  - replaceDogsWithCats(): Recursive traversal                   │  │  │
│  │  │  - safeJsonParse(): Prototype pollution prevention              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Configuration                                 │  │
│  │  - Environment variables                                              │  │
│  │  - Validation on startup                                              │  │
│  │  - Type-safe access                                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── server.ts              # Application entry point and middleware setup
├── config/
│   └── index.ts           # Configuration loading and validation
├── routes/
│   └── replace.route.ts   # Route handlers
├── services/
│   └── jsonReplacer.ts    # Business logic
└── types/
    └── index.ts           # TypeScript type definitions
```

## Data Flow

### Request Processing Pipeline

```
1. Request Received
   │
   ├─→ Rate Limiter Check ──────────────────────────────→ 429 Too Many Requests
   │   (IP-based, configurable limit)
   │
   ├─→ Security Headers Applied (Helmet)
   │
   ├─→ Request ID Generated/Extracted
   │   (X-Request-Id header or UUID)
   │
   ├─→ Graceful Shutdown Check ─────────────────────────→ 503 Service Unavailable
   │
   ├─→ Content-Type Validation ─────────────────────────→ 415 Unsupported Media Type
   │   (Must be application/json)
   │
   ├─→ Body Size Check ─────────────────────────────────→ 413 Payload Too Large
   │   (Configurable limit)
   │
   ├─→ JSON Parsing ────────────────────────────────────→ 400 Bad Request
   │   (With prototype pollution prevention)
   │
   ├─→ Route Handler
   │   │
   │   ├─→ Replacement Service
   │   │   │
   │   │   ├─→ Depth Check ─────────────────────────────→ 400 Depth Exceeded
   │   │   │
   │   │   └─→ Recursive Traversal
   │   │       (Stops at replacement limit)
   │   │
   │   └─→ Response Formation
   │
   └─→ Response Sent
       (With correlation headers and metrics update)
```

### JSON Traversal Algorithm

```
function traverse(value, context):
    if context.depth > maxDepth:
        throw DepthLimitExceededError

    if context.count >= context.limit:
        return value  // Early termination

    if value is string:
        if value === "dog":
            context.count++
            return "cat"
        return value

    if value is array:
        context.depth++
        result = []
        for each element:
            result.push(traverse(element, context))
        context.depth--
        return result

    if value is object:
        context.depth++
        result = {}
        for each key, val:
            if key is not dangerous:  // __proto__, constructor, prototype
                result[key] = traverse(val, context)
        context.depth--
        return result

    return value  // number, boolean, null
```

## Technology Choices

### Framework: Fastify

**Why Fastify over Express:**
- 2-3x faster request handling
- Built-in schema validation
- First-class TypeScript support
- Plugin-based architecture
- Automatic JSON serialization

### Logging: Pino

**Why Pino:**
- Fastest Node.js logger (10x faster than Winston)
- Structured JSON output (production-ready)
- Low overhead (async by default)
- Pretty printing for development
- Built-in Fastify integration

### Testing: Vitest

**Why Vitest over Jest:**
- Native ESM support
- Faster execution
- Compatible Jest API
- Built-in coverage
- TypeScript support out of the box

### Type System: TypeScript (Strict Mode)

**Strict mode enables:**
- `strictNullChecks`: Catch null/undefined errors
- `noImplicitAny`: Require explicit types
- `strictFunctionTypes`: Proper function variance
- `noUnusedLocals/Parameters`: Clean code

## Security Architecture

### Defense in Depth Layers

```
Layer 1: Network (External)
├── Rate limiting per IP
├── Request size limits
└── Connection timeouts

Layer 2: Input Validation
├── Content-Type enforcement
├── JSON schema validation
└── Prototype pollution prevention

Layer 3: Processing Limits
├── Recursion depth limit
├── Replacement count limit
└── Processing timeout

Layer 4: Output Safety
├── Error message sanitization (production)
├── No stack traces exposed
└── Request ID for correlation
```

### Prototype Pollution Prevention

```javascript
// Dangerous keys that could pollute Object.prototype
const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

// Safe JSON parsing filters these keys
function safeJsonParse(json) {
    return JSON.parse(json, (key, value) => {
        if (isObject(value)) {
            return filterDangerousKeys(value);
        }
        return value;
    });
}
```

### Rate Limiting Strategy

```
Per-IP Rate Limiting
├── Window: 60 seconds (configurable)
├── Limit: 100 requests (configurable)
├── Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
└── Scope: Individual client IPs

Note: For distributed deployments, consider Redis-backed rate limiting
```

## Error Handling Strategy

### Error Response Format

```typescript
interface ErrorResponse {
    error: string;      // HTTP status text
    message: string;    // Human-readable description
    statusCode: number; // HTTP status code
    requestId: string;  // Correlation ID
}
```

### Error Classification

| Category | Status | Logged | Exposed |
|----------|--------|--------|---------|
| Client errors (4xx) | 400-499 | Debug | Full message |
| Server errors (5xx) | 500-599 | Error | Generic message |
| Validation errors | 400 | Debug | Validation details |
| Rate limit errors | 429 | Warn | Retry-After header |

### Graceful Degradation

```
Shutdown Signal Received
│
├─→ Set isShuttingDown = true
│
├─→ Stop accepting new connections
│
├─→ Wait for in-flight requests (with timeout)
│
└─→ Exit process
```

## Observability

### Metrics Collected

```typescript
interface AppMetrics {
    requestCount: number;      // Total requests processed
    errorCount: number;        // Requests with 4xx/5xx responses
    totalResponseTime: number; // Sum of response times (ms)
    startTime: Date;           // Server start timestamp
}
```

### Request Correlation

```
Request → Assign/Extract X-Request-Id → Log with ID → Return in Response

Benefits:
- Trace requests across services
- Correlate logs with client issues
- Debug distributed transactions
```

### Health Check Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Liveness probe | Is the process running? |
| `/ready` | Readiness probe | Is the service ready for traffic? |
| `/metrics` | Observability | Monitoring dashboards |

## Configuration Management

### Environment-Based Configuration

```
Production
├── LOG_LEVEL=info
├── NODE_ENV=production
└── Higher limits for traffic

Development
├── LOG_LEVEL=debug
├── NODE_ENV=development
└── Pretty-printed logs

Testing
├── LOG_LEVEL=warn
├── NODE_ENV=test
└── Isolated test configuration
```

### Configuration Validation

```typescript
function validateConfig(): void {
    // Validates all config values on startup
    // Fails fast if configuration is invalid
    // Provides clear error messages

    if (config.port < 0 || config.port > 65535)
        throw new Error("PORT must be between 0 and 65535");

    if (config.maxDepth < 1)
        throw new Error("MAX_DEPTH must be at least 1");

    // ... additional validations
}
```

## Deployment Architecture

### Docker Multi-Stage Build

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
# - Install all dependencies
# - Compile TypeScript
# - Output: dist/ directory

# Stage 2: Production
FROM node:20-alpine AS production
# - Copy only compiled code
# - Install production dependencies only
# - Run as non-root user
# - Enable health checks
```

### Container Security

```
Security Features:
├── Non-root user (nodejs:nodejs)
├── Read-only filesystem
├── No new privileges
├── Resource limits (CPU, memory)
└── Health checks enabled
```

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Instance 1   │    │  Instance 2   │    │  Instance N   │
│  (Stateless)  │    │  (Stateless)  │    │  (Stateless)  │
└───────────────┘    └───────────────┘    └───────────────┘

Requirements for scaling:
- Stateless design ✓
- No shared state ✓
- External rate limiting (Redis) for distributed deployment
- External session store (if authentication added)
```

## Future Considerations

### Potential Enhancements

1. **Streaming JSON Processing**
   - For very large payloads (>10MB)
   - Reduce memory footprint
   - Enable processing of files

2. **Caching Layer**
   - Hash-based cache for identical payloads
   - Redis for distributed caching
   - Configurable TTL

3. **Distributed Tracing**
   - OpenTelemetry integration
   - Jaeger/Zipkin support
   - Cross-service correlation

4. **Advanced Rate Limiting**
   - Redis-backed for multi-instance
   - Per-API-key limits
   - Tiered rate limits

5. **Authentication/Authorization**
   - JWT token validation
   - API key management
   - Role-based access control
