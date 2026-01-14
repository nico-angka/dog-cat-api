import { z } from "zod";

/**
 * Represents any valid JSON value
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

/**
 * JSON object with string keys and JSON values
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * JSON array containing any JSON values
 */
export type JsonArray = JsonValue[];

/**
 * Result of the JSON replacement operation
 */
export interface ReplacementResult {
  result: JsonValue;
  replacements: number;
  limitReached: boolean;
}

/**
 * Internal context for tracking replacement state during recursion
 */
export interface ReplacementContext {
  count: number;
  limit: number;
  depth: number;
  maxDepth: number;
}

/**
 * Error thrown when recursion depth limit is exceeded
 */
export class DepthLimitExceededError extends Error {
  constructor(maxDepth: number) {
    super(`Maximum recursion depth of ${maxDepth} exceeded`);
    this.name = "DepthLimitExceededError";
  }
}

/**
 * Zod schema for validating the request body
 * Accepts any valid JSON value
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(JsonValueSchema),
    z.array(JsonValueSchema),
  ])
);

/**
 * Schema for the replace endpoint request body
 */
export const ReplaceRequestSchema = z.object({
  body: JsonValueSchema,
});

/**
 * Schema for the replace endpoint response
 */
export const ReplaceResponseSchema = z.object({
  result: JsonValueSchema,
  replacements: z.number().int().nonnegative(),
  limitReached: z.boolean(),
});

export type ReplaceRequest = z.infer<typeof ReplaceRequestSchema>;
export type ReplaceResponse = z.infer<typeof ReplaceResponseSchema>;

/**
 * Application configuration loaded from environment variables.
 * All values have sensible defaults and are validated on startup.
 */
export interface AppConfig {
  /** Server port (default: 3000) */
  port: number;
  /** Host to bind to (default: 0.0.0.0) */
  host: string;
  /** Pino log level (default: info) */
  logLevel: string;

  /** Maximum replacements per request (default: 100) */
  maxReplacements: number;
  /** Maximum JSON nesting depth for DoS protection (default: 100) */
  maxDepth: number;

  /** Maximum request body size in bytes (default: 10MB) */
  bodyLimit: number;
  /** Connection timeout in milliseconds (default: 30000) */
  connectionTimeout: number;
  /** Maximum requests per rate limit window (default: 100) */
  rateLimitMax: number;
  /** Rate limit window in milliseconds (default: 60000) */
  rateLimitWindowMs: number;

  /** Graceful shutdown timeout in milliseconds (default: 30000) */
  shutdownTimeout: number;
}

/**
 * Application metrics for observability.
 * These metrics are tracked in-memory and reset on server restart.
 */
export interface AppMetrics {
  /** Total number of requests processed */
  requestCount: number;
  /** Number of requests with 4xx or 5xx responses */
  errorCount: number;
  /** Sum of all response times in milliseconds */
  totalResponseTime: number;
  /** Server start timestamp */
  startTime: Date;
}

/**
 * Health check response for GET /health endpoint.
 * Used for liveness probes in container orchestration.
 */
export interface HealthResponse {
  /** Service status: ok, degraded, or error */
  status: "ok" | "degraded" | "error";
  /** Current server time (ISO 8601) */
  timestamp: string;
  /** Seconds since server started */
  uptime: number;
  /** Application version from package.json */
  version: string;
}

/**
 * Readiness check response for GET /ready endpoint.
 * Used for readiness probes in Kubernetes.
 */
export interface ReadyResponse {
  /** Overall readiness status */
  ready: boolean;
  /** Individual check results */
  checks: {
    /** Configuration validation status */
    config: boolean;
  };
}

/**
 * Metrics response for GET /metrics endpoint.
 * Provides basic observability data.
 */
export interface MetricsResponse {
  /** Total requests processed since startup */
  requestCount: number;
  /** Requests with 4xx or 5xx responses */
  errorCount: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Seconds since server started */
  uptime: number;
}

/**
 * Standard error response format.
 * All API errors return this structure for consistency.
 */
export interface ErrorResponse {
  /** HTTP status text (e.g., "Bad Request") */
  error: string;
  /** Human-readable error description */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Request correlation ID for log tracing */
  requestId?: string;
}

/**
 * Extended Error type with HTTP status code.
 * Used internally for error handling.
 */
export interface HttpError extends Error {
  /** HTTP status code to return */
  statusCode?: number;
  /** Fastify validation error details */
  validation?: unknown;
}
