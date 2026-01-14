import { config as dotenvConfig } from "dotenv";
import type { AppConfig } from "../types/index.js";

dotenvConfig();

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Invalid value for ${key}: expected a number, got "${value}"`
    );
  }
  return parsed;
}

function getEnvString(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value !== undefined && value !== "" ? value : defaultValue;
}

export const config: AppConfig = {
  // Server settings
  port: getEnvNumber("PORT", 3000),
  host: getEnvString("HOST", "0.0.0.0"),
  logLevel: getEnvString("LOG_LEVEL", "info"),

  // Replacement settings
  maxReplacements: getEnvNumber("MAX_REPLACEMENTS", 100),
  maxDepth: getEnvNumber("MAX_DEPTH", 100),

  // Security settings
  bodyLimit: getEnvNumber("BODY_LIMIT", 10 * 1024 * 1024), // 10MB default
  connectionTimeout: getEnvNumber("CONNECTION_TIMEOUT", 30000), // 30s default
  rateLimitMax: getEnvNumber("RATE_LIMIT_MAX", 100),
  rateLimitWindowMs: getEnvNumber("RATE_LIMIT_WINDOW_MS", 60000), // 1 minute

  // Graceful shutdown
  shutdownTimeout: getEnvNumber("SHUTDOWN_TIMEOUT", 30000), // 30s default
};

export function validateConfig(): void {
  if (config.maxReplacements < 0) {
    throw new Error("MAX_REPLACEMENTS must be a non-negative integer");
  }
  if (config.port < 0 || config.port > 65535) {
    throw new Error("PORT must be between 0 and 65535");
  }
  if (config.maxDepth < 1) {
    throw new Error("MAX_DEPTH must be at least 1");
  }
  if (config.bodyLimit < 1) {
    throw new Error("BODY_LIMIT must be at least 1 byte");
  }
  if (config.connectionTimeout < 1000) {
    throw new Error("CONNECTION_TIMEOUT must be at least 1000ms");
  }
  if (config.rateLimitMax < 1) {
    throw new Error("RATE_LIMIT_MAX must be at least 1");
  }
  if (config.rateLimitWindowMs < 1000) {
    throw new Error("RATE_LIMIT_WINDOW_MS must be at least 1000ms");
  }
  if (config.shutdownTimeout < 1000) {
    throw new Error("SHUTDOWN_TIMEOUT must be at least 1000ms");
  }
}

// Version from package.json (loaded at runtime for health checks)
export const APP_VERSION = "1.0.0";
