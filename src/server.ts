import Fastify, { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "crypto";
import { config, validateConfig, APP_VERSION } from "./config/index.js";
import { replaceRoutes } from "./routes/replace.route.js";
import { safeJsonParse } from "./services/jsonReplacer.js";
import type {
  AppMetrics,
  HealthResponse,
  ReadyResponse,
  MetricsResponse,
  ErrorResponse,
  HttpError,
} from "./types/index.js";

// Global metrics for observability
const metrics: AppMetrics = {
  requestCount: 0,
  errorCount: 0,
  totalResponseTime: 0,
  startTime: new Date(),
};

// Flag for graceful shutdown
let isShuttingDown = false;

/**
 * Builds and configures the Fastify application with all security
 * and production-ready features.
 */
export function buildApp(): FastifyInstance {
  const fastify = Fastify({
    // Generate request IDs for correlation
    genReqId: (req) => {
      return (req.headers["x-request-id"] as string) || randomUUID();
    },
    // Request ID header name
    requestIdHeader: "x-request-id",
    // Logging configuration
    logger: {
      level: config.logLevel,
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
              },
            }
          : undefined,
    },
    // DoS protection: body size limit
    bodyLimit: config.bodyLimit,
    // Connection timeout
    connectionTimeout: config.connectionTimeout,
  });

  // ========================================
  // SECURITY MIDDLEWARE
  // ========================================

  // Helmet security headers
  fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
  });

  // Rate limiting
  fastify.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    // Always add rate limit headers
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    // Custom error response
    errorResponseBuilder: (request, context) => {
      return {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        statusCode: 429,
        requestId: request.id,
      };
    },
  });

  // ========================================
  // REQUEST TRACKING & METRICS
  // ========================================

  // Track request timing and add correlation ID to response
  fastify.addHook("onRequest", async (request, reply) => {
    // Store start time for response time calculation
    (request as unknown as { startTime: bigint }).startTime =
      process.hrtime.bigint();

    // Return request ID in response header
    reply.header("x-request-id", request.id);
  });

  // Update metrics after each response
  fastify.addHook("onResponse", async (request, reply) => {
    const startTime = (request as unknown as { startTime: bigint }).startTime;
    const responseTime =
      Number(process.hrtime.bigint() - startTime) / 1_000_000; // Convert to ms

    metrics.requestCount++;
    metrics.totalResponseTime += responseTime;

    if (reply.statusCode >= 400) {
      metrics.errorCount++;
    }
  });

  // ========================================
  // GRACEFUL SHUTDOWN CHECK
  // ========================================

  fastify.addHook("onRequest", async (_request, reply) => {
    if (isShuttingDown) {
      reply.code(503).send({
        error: "Service Unavailable",
        message: "Server is shutting down",
        statusCode: 503,
      });
    }
  });

  // ========================================
  // ERROR HANDLING
  // ========================================

  fastify.setErrorHandler((error: HttpError, request, reply) => {
    const requestId = request.id;

    // Log error with context
    request.log.error(
      {
        err: {
          message: error.message,
          name: error.name,
          // Only include stack in non-production
          ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
        },
        requestId,
      },
      "Request error"
    );

    // Build safe error response (don't leak internals in production)
    const statusCode = error.statusCode ?? 500;
    const response: ErrorResponse = {
      error: getErrorName(statusCode),
      message: sanitizeErrorMessage(error.message, statusCode),
      statusCode,
      requestId,
    };

    // Handle specific error types
    if (error.validation) {
      response.error = "Validation Error";
      response.statusCode = 400;
      reply.code(400).send(response);
      return;
    }

    reply.code(statusCode).send(response);
  });

  // ========================================
  // CONTENT TYPE PARSING
  // ========================================

  // Safe JSON parser with prototype pollution prevention
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        const json = safeJsonParse(body as string);
        done(null, json);
      } catch {
        const error = new Error("Invalid JSON") as HttpError;
        error.statusCode = 400;
        done(error, undefined);
      }
    }
  );

  // Content-Type validation for /replace endpoint
  fastify.addHook("preHandler", async (request, reply) => {
    if (request.method !== "GET" && request.routeOptions.url === "/replace") {
      const contentType = request.headers["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        reply.code(415).send({
          error: "Unsupported Media Type",
          message: "Content-Type must be application/json",
          statusCode: 415,
          requestId: request.id,
        });
      }
    }
  });

  // ========================================
  // HEALTH CHECK ENDPOINTS
  // ========================================

  // Basic health check - always returns 200 if server is running
  fastify.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: getUptimeSeconds(),
      version: APP_VERSION,
    };
  });

  // Readiness check - validates service is ready to accept requests
  fastify.get("/ready", async (): Promise<ReadyResponse> => {
    let configValid = true;
    try {
      validateConfig();
    } catch {
      configValid = false;
    }

    return {
      ready: configValid && !isShuttingDown,
      checks: {
        config: configValid,
      },
    };
  });

  // Metrics endpoint for observability
  fastify.get("/metrics", async (): Promise<MetricsResponse> => {
    const avgResponseTime =
      metrics.requestCount > 0
        ? metrics.totalResponseTime / metrics.requestCount
        : 0;

    return {
      requestCount: metrics.requestCount,
      errorCount: metrics.errorCount,
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      uptime: getUptimeSeconds(),
    };
  });

  // ========================================
  // APPLICATION ROUTES
  // ========================================

  fastify.register(replaceRoutes);

  return fastify;
}

/**
 * Calculate uptime in seconds
 */
function getUptimeSeconds(): number {
  return Math.floor((Date.now() - metrics.startTime.getTime()) / 1000);
}

/**
 * Get human-readable error name from status code
 */
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    413: "Payload Too Large",
    415: "Unsupported Media Type",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return errorNames[statusCode] || "Error";
}

/**
 * Sanitize error messages to not leak internal details in production
 */
function sanitizeErrorMessage(message: string, statusCode: number): string {
  // In production, use generic messages for server errors
  if (process.env.NODE_ENV === "production" && statusCode >= 500) {
    return "An unexpected error occurred";
  }
  return message;
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(app: FastifyInstance): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    app.log.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    try {
      await Promise.race([
        app.close(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Shutdown timeout")),
            config.shutdownTimeout
          )
        ),
      ]);
      app.log.info("Server closed gracefully");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle uncaught errors
  process.on("uncaughtException", (err) => {
    app.log.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    app.log.fatal({ reason }, "Unhandled rejection");
    process.exit(1);
  });
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  try {
    validateConfig();

    const app = buildApp();

    // Setup graceful shutdown
    setupGracefulShutdown(app);

    await app.listen({
      port: config.port,
      host: config.host,
    });

    app.log.info(
      `Server listening on http://${config.host}:${config.port}`
    );
    app.log.info(`Max replacements: ${config.maxReplacements}`);
    app.log.info(`Max depth: ${config.maxDepth}`);
    app.log.info(`Rate limit: ${config.rateLimitMax} req/${config.rateLimitWindowMs}ms`);
    app.log.info(`Body limit: ${config.bodyLimit} bytes`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  start();
}

// Export for testing
export { isShuttingDown, metrics };
