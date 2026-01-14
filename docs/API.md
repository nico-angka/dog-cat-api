# API Reference

Complete API documentation for the Dog-to-Cat JSON Replacement API.

## Base URL

```
Development: http://localhost:3000
Production:  https://your-domain.com
```

## Authentication

Currently, no authentication is required. For production deployments, consider adding:
- API key authentication
- JWT tokens
- OAuth2

## Common Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes (for POST) | Must be `application/json` |
| `X-Request-Id` | No | Client-provided correlation ID (UUID format recommended) |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Request correlation ID (client-provided or server-generated) |
| `X-RateLimit-Limit` | Maximum requests allowed in window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Content-Type` | Always `application/json` |

## Endpoints

---

### POST /replace

Replaces all occurrences of the exact string `"dog"` with `"cat"` in JSON string values.

#### Request

```http
POST /replace HTTP/1.1
Host: localhost:3000
Content-Type: application/json

<any valid JSON>
```

#### Parameters

| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| body | body | JSON | Any valid JSON value (string, number, boolean, null, object, or array) |

#### Response

##### Success (200 OK)

```json
{
  "result": "<modified JSON with same structure as input>",
  "replacements": "<number of replacements made>",
  "limitReached": "<true if MAX_REPLACEMENTS limit was reached>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `result` | any | The modified JSON payload with replacements applied |
| `replacements` | number | Total count of `"dog"` → `"cat"` replacements made |
| `limitReached` | boolean | `true` if processing stopped due to `MAX_REPLACEMENTS` limit |

##### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid JSON or depth limit exceeded |
| 413 | Payload Too Large | Request body exceeds `BODY_LIMIT` |
| 415 | Unsupported Media Type | Missing or invalid `Content-Type` header |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

#### Replacement Rules

| Rule | Description | Example |
|------|-------------|---------|
| Exact match only | Only the exact string `"dog"` is replaced | `"hotdog"` → `"hotdog"` |
| Case sensitive | Only lowercase `"dog"` matches | `"Dog"` → `"Dog"` |
| Values only | Object keys are not modified | `{"dog": "dog"}` → `{"dog": "cat"}` |
| All types supported | Processes strings, arrays, objects recursively | Deep traversal |
| Non-strings preserved | Numbers, booleans, null returned as-is | `42` → `42` |

#### Examples

##### Simple String

Request:
```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '"I have a dog"'
```

Response:
```json
{
  "result": "I have a cat",
  "replacements": 1,
  "limitReached": false
}
```

##### Nested Object

Request:
```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{
    "pet": "dog",
    "owner": {
      "name": "John",
      "loves": "dog"
    }
  }'
```

Response:
```json
{
  "result": {
    "pet": "cat",
    "owner": {
      "name": "John",
      "loves": "cat"
    }
  },
  "replacements": 2,
  "limitReached": false
}
```

##### Array of Values

Request:
```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '["dog", "fish", "dog", "bird"]'
```

Response:
```json
{
  "result": ["cat", "fish", "cat", "bird"],
  "replacements": 2,
  "limitReached": false
}
```

##### Mixed Types

Request:
```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{
    "animal": "dog",
    "count": 3,
    "active": true,
    "metadata": null
  }'
```

Response:
```json
{
  "result": {
    "animal": "cat",
    "count": 3,
    "active": true,
    "metadata": null
  },
  "replacements": 1,
  "limitReached": false
}
```

##### Limit Reached

Request (with `MAX_REPLACEMENTS=3`):
```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '["dog", "dog", "dog", "dog", "dog"]'
```

Response:
```json
{
  "result": ["cat", "cat", "cat", "dog", "dog"],
  "replacements": 3,
  "limitReached": true
}
```

##### No Replacements

Request:
```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{"animal": "cat", "count": 5}'
```

Response:
```json
{
  "result": {"animal": "cat", "count": 5},
  "replacements": 0,
  "limitReached": false
}
```

##### Primitive Values

Request:
```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '42'
```

Response:
```json
{
  "result": 42,
  "replacements": 0,
  "limitReached": false
}
```

---

### GET /health

Returns the health status of the service. Used for liveness probes.

#### Request

```http
GET /health HTTP/1.1
Host: localhost:3000
```

#### Response

##### Success (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 12345,
  "version": "1.0.0"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Service status: `"ok"`, `"degraded"`, or `"error"` |
| `timestamp` | string | Current server time (ISO 8601) |
| `uptime` | number | Seconds since server started |
| `version` | string | Application version |

#### Example

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

### GET /ready

Returns the readiness status of the service. Used for readiness probes in Kubernetes.

#### Request

```http
GET /ready HTTP/1.1
Host: localhost:3000
```

#### Response

##### Success (200 OK)

```json
{
  "ready": true,
  "checks": {
    "config": true
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ready` | boolean | Overall readiness status |
| `checks.config` | boolean | Configuration validation status |

#### Example

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

---

### GET /metrics

Returns basic service metrics for monitoring.

#### Request

```http
GET /metrics HTTP/1.1
Host: localhost:3000
```

#### Response

##### Success (200 OK)

```json
{
  "requestCount": 1234,
  "errorCount": 5,
  "averageResponseTime": 2.45,
  "uptime": 12345
}
```

| Field | Type | Description |
|-------|------|-------------|
| `requestCount` | number | Total requests processed since startup |
| `errorCount` | number | Requests that returned 4xx or 5xx status |
| `averageResponseTime` | number | Average response time in milliseconds |
| `uptime` | number | Seconds since server started |

#### Example

```bash
curl http://localhost:3000/metrics
```

Response:
```json
{
  "requestCount": 5000,
  "errorCount": 12,
  "averageResponseTime": 1.85,
  "uptime": 7200
}
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "<HTTP status text>",
  "message": "<Human-readable error description>",
  "statusCode": "<HTTP status code>",
  "requestId": "<Correlation ID>"
}
```

### Error Codes

#### 400 Bad Request

Invalid JSON syntax or depth limit exceeded.

```json
{
  "error": "Bad Request",
  "message": "Invalid JSON",
  "statusCode": 400,
  "requestId": "abc-123-def"
}
```

```json
{
  "error": "Bad Request",
  "message": "Maximum recursion depth of 100 exceeded",
  "statusCode": 400,
  "requestId": "abc-123-def"
}
```

#### 413 Payload Too Large

Request body exceeds configured limit.

```json
{
  "error": "Payload Too Large",
  "message": "Request body is too large",
  "statusCode": 413,
  "requestId": "abc-123-def"
}
```

#### 415 Unsupported Media Type

Missing or invalid Content-Type header.

```json
{
  "error": "Unsupported Media Type",
  "message": "Content-Type must be application/json",
  "statusCode": 415,
  "requestId": "abc-123-def"
}
```

#### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "statusCode": 429,
  "requestId": "abc-123-def"
}
```

**Additional Headers:**
- `Retry-After`: Seconds until rate limit resets

#### 500 Internal Server Error

Unexpected server error.

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "statusCode": 500,
  "requestId": "abc-123-def"
}
```

Note: In production, error details are hidden. Use the `requestId` to find details in server logs.

#### 503 Service Unavailable

Server is shutting down.

```json
{
  "error": "Service Unavailable",
  "message": "Server is shutting down",
  "statusCode": 503,
  "requestId": "abc-123-def"
}
```

---

## Rate Limiting

### Default Configuration

| Setting | Value |
|---------|-------|
| Requests per window | 100 |
| Window duration | 60 seconds |
| Scope | Per IP address |

### Response Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

### When Limited

When rate limit is exceeded, the response includes:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312800

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "statusCode": 429,
  "requestId": "abc-123-def"
}
```

---

## Request Limits

| Limit | Default | Configuration |
|-------|---------|---------------|
| Body size | 10 MB | `BODY_LIMIT` |
| JSON depth | 100 levels | `MAX_DEPTH` |
| Replacements | 100 per request | `MAX_REPLACEMENTS` |
| Connection timeout | 30 seconds | `CONNECTION_TIMEOUT` |

---

## Security Headers

All responses include security headers via Helmet.js:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'none'` | Prevent XSS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Strict-Transport-Security` | `max-age=15552000` | Enforce HTTPS |
| `X-DNS-Prefetch-Control` | `off` | Disable DNS prefetch |
| `Referrer-Policy` | `no-referrer` | Control referrer info |

---

## SDK Examples

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/replace', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ pet: 'dog', name: 'Buddy' }),
});

const data = await response.json();
console.log(data);
// { result: { pet: 'cat', name: 'Buddy' }, replacements: 1, limitReached: false }
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/replace',
    json={'pet': 'dog', 'name': 'Buddy'}
)

data = response.json()
print(data)
# {'result': {'pet': 'cat', 'name': 'Buddy'}, 'replacements': 1, 'limitReached': False}
```

### cURL

```bash
curl -X POST http://localhost:3000/replace \
  -H "Content-Type: application/json" \
  -d '{"pet": "dog", "name": "Buddy"}'
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    payload := map[string]string{"pet": "dog", "name": "Buddy"}
    body, _ := json.Marshal(payload)

    resp, _ := http.Post(
        "http://localhost:3000/replace",
        "application/json",
        bytes.NewBuffer(body),
    )
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
}
```

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history.
