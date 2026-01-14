# Dog-to-Cat API - Interview Notes

## What It Does
HTTP API that replaces `"dog"` → `"cat"` in any JSON payload. Returns the modified JSON, replacement count, and whether the limit was hit.

## Quick Start
```bash
npm install && npm run dev
curl -X POST localhost:3000/replace -H "Content-Type: application/json" -d '{"pet":"dog"}'
# → {"result":{"pet":"cat"},"replacements":1,"limitReached":false}
```

## Key Design Decisions

### 1. Exact Match Only
- `"dog"` → `"cat"` but `"hotdog"` stays unchanged
- Case-sensitive (only lowercase)
- **Why**: Predictable behavior, avoids unintended modifications

### 2. Values Only, Not Keys
- `{"dog": "dog"}` → `{"dog": "cat"}`
- **Why**: Keys are structural; modifying them could break consuming code

### 3. Per-Request Limit (not global)
- Each request gets up to 100 replacements independently
- Returns partial results with `limitReached: true`
- **Why**: Stateless = horizontally scalable, fair resource allocation

### Setting the Limit
```bash
# Server-side default (env var)
MAX_REPLACEMENTS=100 npm run dev

# Per-request override (query param, capped at server max)
curl "localhost:3000/replace?limit=5" -H "Content-Type: application/json" -d '["dog","dog","dog"]'
```

### 4. Recursive Traversal (not string replacement)
- Walk the JSON tree, replace in string values only
- **Why**: `JSON.stringify().replace()` would hit keys and substrings
- **Tradeoff**: Slower but correct

## Architecture

```
Request → Rate Limit → Helmet → JSON Parser → Replacer → Response
                                    ↓
                         (prototype pollution filter)
```

**Files:**
- `src/server.ts` - Fastify setup, middleware, error handling
- `src/routes/replace.route.ts` - POST /replace endpoint
- `src/services/jsonReplacer.ts` - Core replacement logic
- `src/config/index.ts` - Environment config with validation
- `src/types/index.ts` - TypeScript types

## Security Measures
| Protection | Why |
|------------|-----|
| Body limit (10MB) | Prevent memory exhaustion |
| Depth limit (100) | Prevent stack overflow |
| Rate limiting | Prevent abuse |
| Prototype pollution filter | Block `__proto__`, `constructor` |
| Helmet headers | XSS, clickjacking protection |

## Testing
```bash
npm test              # 192 tests
npm run test:coverage # ~88% coverage
```

- **Unit tests**: Replacement logic edge cases
- **Integration tests**: Full HTTP flow
- **Security tests**: DoS, injection attempts

## If Asked...

**"Why Fastify over Express?"**
- Built-in TypeScript, schema validation, 2x faster, better plugin system

**"Why not use regex on the whole JSON string?"**
- Would replace in keys and substrings like "hotdog"
- Can't accurately count "value replacements"

**"How would you scale this?"**
- Stateless design → just add instances behind load balancer
- For distributed rate limiting → add Redis

**"What would you add for production?"**
- Authentication (API keys/JWT)
- Redis-backed rate limiting
- Prometheus metrics
- Distributed tracing
