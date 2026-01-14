import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Config Module", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("config values", () => {
    it("should use default MAX_REPLACEMENTS when not set", async () => {
      delete process.env.MAX_REPLACEMENTS;
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.maxReplacements).toBe(100);
    });

    it("should use custom MAX_REPLACEMENTS when set", async () => {
      process.env.MAX_REPLACEMENTS = "50";
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.maxReplacements).toBe(50);
    });

    it("should use default PORT when not set", async () => {
      delete process.env.PORT;
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.port).toBe(3000);
    });

    it("should use custom PORT when set", async () => {
      process.env.PORT = "8080";
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.port).toBe(8080);
    });

    it("should use default HOST when not set", async () => {
      delete process.env.HOST;
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.host).toBe("0.0.0.0");
    });

    it("should use custom HOST when set", async () => {
      process.env.HOST = "127.0.0.1";
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.host).toBe("127.0.0.1");
    });

    it("should use default LOG_LEVEL when not set", async () => {
      delete process.env.LOG_LEVEL;
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.logLevel).toBe("info");
    });

    it("should use custom LOG_LEVEL when set", async () => {
      process.env.LOG_LEVEL = "debug";
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.logLevel).toBe("debug");
    });

    it("should handle empty string MAX_REPLACEMENTS as default", async () => {
      process.env.MAX_REPLACEMENTS = "";
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.maxReplacements).toBe(100);
    });

    it("should handle empty string PORT as default", async () => {
      process.env.PORT = "";
      vi.resetModules();

      const { config } = await import("../../src/config/index.js");
      expect(config.port).toBe(3000);
    });
  });

  describe("config validation errors", () => {
    it("should throw error for invalid MAX_REPLACEMENTS (non-numeric)", async () => {
      process.env.MAX_REPLACEMENTS = "invalid";
      vi.resetModules();

      await expect(import("../../src/config/index.js")).rejects.toThrow(
        'Invalid value for MAX_REPLACEMENTS: expected a number, got "invalid"'
      );
    });

    it("should throw error for invalid PORT (non-numeric)", async () => {
      process.env.PORT = "not-a-port";
      vi.resetModules();

      await expect(import("../../src/config/index.js")).rejects.toThrow(
        'Invalid value for PORT: expected a number, got "not-a-port"'
      );
    });
  });

  describe("validateConfig", () => {
    it("should not throw for valid config", async () => {
      process.env.MAX_REPLACEMENTS = "100";
      process.env.PORT = "3000";
      vi.resetModules();

      const { validateConfig } = await import("../../src/config/index.js");
      expect(() => validateConfig()).not.toThrow();
    });

    it("should throw for negative MAX_REPLACEMENTS", async () => {
      process.env.MAX_REPLACEMENTS = "-1";
      vi.resetModules();

      const { validateConfig } = await import("../../src/config/index.js");
      expect(() => validateConfig()).toThrow(
        "MAX_REPLACEMENTS must be a non-negative integer"
      );
    });

    it("should throw for PORT below 0", async () => {
      process.env.PORT = "-1";
      vi.resetModules();

      const { validateConfig } = await import("../../src/config/index.js");
      expect(() => validateConfig()).toThrow("PORT must be between 0 and 65535");
    });

    it("should throw for PORT above 65535", async () => {
      process.env.PORT = "70000";
      vi.resetModules();

      const { validateConfig } = await import("../../src/config/index.js");
      expect(() => validateConfig()).toThrow("PORT must be between 0 and 65535");
    });

    it("should accept PORT at lower boundary (0)", async () => {
      process.env.PORT = "0";
      vi.resetModules();

      const { validateConfig } = await import("../../src/config/index.js");
      expect(() => validateConfig()).not.toThrow();
    });

    it("should accept PORT at upper boundary (65535)", async () => {
      process.env.PORT = "65535";
      vi.resetModules();

      const { validateConfig } = await import("../../src/config/index.js");
      expect(() => validateConfig()).not.toThrow();
    });

    it("should accept MAX_REPLACEMENTS at 0", async () => {
      process.env.MAX_REPLACEMENTS = "0";
      vi.resetModules();

      const { validateConfig } = await import("../../src/config/index.js");
      expect(() => validateConfig()).not.toThrow();
    });
  });
});
