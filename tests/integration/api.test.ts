import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { buildApp } from "../../src/server.js";
import type { FastifyInstance } from "fastify";

describe("API Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================
  // HEALTH CHECK
  // ============================================
  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
    });

    it("should return valid ISO timestamp", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      const body = JSON.parse(response.body);
      const timestamp = new Date(body.timestamp);
      expect(timestamp.toISOString()).toBe(body.timestamp);
    });
  });

  // ============================================
  // SUCCESS CASES
  // ============================================
  describe("POST /replace - Success Cases", () => {
    it("should return 200 with valid JSON", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ test: "value" }),
      });

      expect(response.statusCode).toBe(200);
    });

    it("should include result field in response", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("result");
    });

    it("should include replacements field in response", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("replacements");
      expect(typeof body.replacements).toBe("number");
    });

    it("should include limitReached field in response", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("limitReached");
      expect(typeof body.limitReached).toBe("boolean");
    });

    it("should replace dog with cat in simple string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("I have a dog"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("I have a cat");
      expect(body.replacements).toBe(1);
      expect(body.limitReached).toBe(false);
    });

    it("should replace dog with cat in object values", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({
          animal: "dog",
          description: "My dog is friendly",
        }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toEqual({
        animal: "cat",
        description: "My cat is friendly",
      });
      expect(body.replacements).toBe(2);
    });

    it("should replace dog with cat in arrays", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(["dog", "cat", "dog"]),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toEqual(["cat", "cat", "cat"]);
      expect(body.replacements).toBe(2);
    });

    it("should handle nested replacement end-to-end", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({
          level1: {
            pets: ["dog", "dog"],
            level2: {
              message: "dog says woof",
              level3: {
                animal: "dog",
              },
            },
          },
        }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toEqual({
        level1: {
          pets: ["cat", "cat"],
          level2: {
            message: "cat says woof",
            level3: {
              animal: "cat",
            },
          },
        },
      });
      expect(body.replacements).toBe(4);
    });

    it("should NOT replace substring matches", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("doghouse and hotdog"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("doghouse and hotdog");
      expect(body.replacements).toBe(0);
    });

    it("should be case-sensitive", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("Dog DOG dog dOg"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("Dog DOG cat dOg");
      expect(body.replacements).toBe(1);
    });

    it("should NOT replace in object keys", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ dog: "value" }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toEqual({ dog: "value" });
      expect(body.replacements).toBe(0);
    });

    it("should handle numbers unchanged", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(42),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe(42);
      expect(body.replacements).toBe(0);
    });

    it("should handle booleans unchanged", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(true),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe(true);
      expect(body.replacements).toBe(0);
    });

    it("should handle null unchanged", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(null),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe(null);
      expect(body.replacements).toBe(0);
    });

    it("should handle empty object", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({}),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toEqual({});
      expect(body.replacements).toBe(0);
    });

    it("should handle empty array", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify([]),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toEqual([]);
      expect(body.replacements).toBe(0);
    });

    it("should handle empty string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(""),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("");
      expect(body.replacements).toBe(0);
    });

    it("should handle content-type with charset", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json; charset=utf-8" },
        payload: JSON.stringify("dog"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("cat");
    });

    it("should handle unicode in payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("My dog 🐕 loves 日本語"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("My cat 🐕 loves 日本語");
      expect(body.replacements).toBe(1);
    });

    it("should handle large payload", async () => {
      const largeArray = Array(500).fill("dog");
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(largeArray),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // Should replace up to limit (default 100)
      expect(body.replacements).toBeLessThanOrEqual(100);
    });

    it("should handle deeply nested structures", async () => {
      let nested: Record<string, unknown> = { value: "dog" };
      for (let i = 0; i < 10; i++) {
        nested = { level: nested };
      }

      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(nested),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(1);
    });
  });

  // ============================================
  // LIMIT ENFORCEMENT
  // ============================================
  describe("POST /replace - Limit Enforcement", () => {
    it("should enforce replacement limit", async () => {
      const manyDogs = Array(200).fill("dog");
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(manyDogs),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(100); // Default limit
      expect(body.limitReached).toBe(true);
    });

    it("should return partial results when limit exceeded", async () => {
      const manyDogs = Array(150).fill("dog");
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(manyDogs),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // First 100 should be replaced, rest should remain
      const result = body.result as string[];
      const replacedCount = result.filter((v) => v === "cat").length;
      const remainingCount = result.filter((v) => v === "dog").length;

      expect(replacedCount).toBe(100);
      expect(remainingCount).toBe(50);
    });

    it("should set limitReached to false when under limit", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(["dog", "dog"]),
      });

      const body = JSON.parse(response.body);
      expect(body.limitReached).toBe(false);
    });

    it("should set limitReached to true when at limit", async () => {
      const exactLimit = Array(100).fill("dog");
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(exactLimit),
      });

      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(100);
      expect(body.limitReached).toBe(true);
    });
  });

  // ============================================
  // QUERY PARAM LIMIT
  // ============================================
  describe("POST /replace - Query Param Limit", () => {
    it("should use limit query param when provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace?limit=3",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(["dog", "dog", "dog", "dog", "dog"]),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(3);
      expect(body.limitReached).toBe(true);
      expect(body.result).toEqual(["cat", "cat", "cat", "dog", "dog"]);
    });

    it("should cap limit at server max", async () => {
      // Server max is 100, requesting 200 should only do 100
      const manyDogs = Array(150).fill("dog");
      const response = await app.inject({
        method: "POST",
        url: "/replace?limit=200",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(manyDogs),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(100); // Capped at server max
      expect(body.limitReached).toBe(true);
    });

    it("should use server default when no limit provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(["dog", "dog"]),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(2);
      expect(body.limitReached).toBe(false);
    });

    it("should reject invalid limit values", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace?limit=abc",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject limit less than 1", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace?limit=0",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================
  // ERROR CASES
  // ============================================
  describe("POST /replace - Error Cases", () => {
    it("should return 400 for invalid JSON", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: "{ invalid json }",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for malformed JSON - missing closing brace", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: '{ "key": "value"',
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for malformed JSON - trailing comma", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: '{ "key": "value", }',
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for malformed JSON - single quotes", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: "{ 'key': 'value' }",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for malformed JSON - unquoted keys", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: '{ key: "value" }',
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 415 for missing Content-Type header", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        payload: JSON.stringify("dog"),
      });

      expect(response.statusCode).toBe(415);
    });

    it("should return 415 for wrong Content-Type (text/plain)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "text/plain" },
        payload: "dog",
      });

      expect(response.statusCode).toBe(415);
    });

    it("should return 415 for wrong Content-Type (text/html)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "text/html" },
        payload: "<html>dog</html>",
      });

      expect(response.statusCode).toBe(415);
    });

    it("should return 415 for wrong Content-Type (application/xml)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/xml" },
        payload: "<root>dog</root>",
      });

      expect(response.statusCode).toBe(415);
    });

    it("should return 415 for wrong Content-Type (multipart/form-data)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "multipart/form-data" },
        payload: "dog",
      });

      expect(response.statusCode).toBe(415);
    });

    it("should return error with message for invalid JSON", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: "not json",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });

    it("should return error with message for wrong content type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "text/plain" },
        payload: "dog",
      });

      expect(response.statusCode).toBe(415);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe("POST /replace - Edge Cases", () => {
    it("should handle root-level string 'dog'", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("cat");
    });

    it("should handle multiple dogs in single string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog dog dog"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("cat cat cat");
      expect(body.replacements).toBe(3);
    });

    it("should handle mixed content with no dogs", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({
          name: "test",
          values: [1, 2, 3],
          active: true,
        }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(0);
    });

    it("should handle special characters around dog", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("(dog) [dog] {dog} <dog>"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("(cat) [cat] {cat} <cat>");
      expect(body.replacements).toBe(4);
    });

    it("should handle newlines and tabs", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog\ndog\tdog"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("cat\ncat\tcat");
      expect(body.replacements).toBe(3);
    });

    it("should handle hyphenated dog", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog-friendly"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("cat-friendly");
    });

    it("should NOT replace dogs (plural)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dogs"),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBe("dogs");
      expect(body.replacements).toBe(0);
    });

    it("should handle realistic API payload", async () => {
      const payload = {
        id: 123,
        user: {
          name: "John Doe",
          email: "john@example.com",
          preferences: {
            pet: "dog",
            notifications: true,
          },
        },
        posts: [
          {
            id: 1,
            title: "My dog story",
            content: "I love my dog. The dog is great!",
            tags: ["dog", "pets", "life"],
          },
        ],
        metadata: {
          created: "2024-01-01",
          source: "api",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(payload),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.replacements).toBe(5);
      expect(body.result.user.preferences.pet).toBe("cat");
      expect(body.result.posts[0].title).toBe("My cat story");
      expect(body.result.posts[0].tags).toContain("cat");
    });
  });

  // ============================================
  // HTTP METHOD TESTS
  // ============================================
  describe("HTTP Methods", () => {
    it("should return 404 for GET /replace", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/replace",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 for PUT /replace", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 for DELETE /replace", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/replace",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 for PATCH /replace", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/replace",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify("dog"),
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 for unknown routes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/unknown",
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

// ============================================
// CONFIGURATION TESTS (separate describe for env var mocking)
// ============================================
describe("Configuration Tests", () => {
  const originalEnv = process.env.MAX_REPLACEMENTS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.MAX_REPLACEMENTS = originalEnv;
    } else {
      delete process.env.MAX_REPLACEMENTS;
    }
    vi.resetModules();
  });

  it("should use default limit of 100 when MAX_REPLACEMENTS not set", async () => {
    delete process.env.MAX_REPLACEMENTS;
    vi.resetModules();

    const { buildApp } = await import("../../src/server.js");
    const app = buildApp();
    await app.ready();

    const manyDogs = Array(150).fill("dog");
    const response = await app.inject({
      method: "POST",
      url: "/replace",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(manyDogs),
    });

    const body = JSON.parse(response.body);
    expect(body.replacements).toBe(100);
    expect(body.limitReached).toBe(true);

    await app.close();
  });

  it("should respect custom MAX_REPLACEMENTS environment variable", async () => {
    process.env.MAX_REPLACEMENTS = "5";
    vi.resetModules();

    const { buildApp } = await import("../../src/server.js");
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/replace",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(Array(10).fill("dog")),
    });

    const body = JSON.parse(response.body);
    expect(body.replacements).toBe(5);
    expect(body.limitReached).toBe(true);

    await app.close();
  });

  it("should handle MAX_REPLACEMENTS=0", async () => {
    process.env.MAX_REPLACEMENTS = "0";
    vi.resetModules();

    const { buildApp } = await import("../../src/server.js");
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/replace",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify("dog"),
    });

    const body = JSON.parse(response.body);
    expect(body.result).toBe("dog");
    expect(body.replacements).toBe(0);
    expect(body.limitReached).toBe(true);

    await app.close();
  });

  it("should handle high MAX_REPLACEMENTS value", async () => {
    process.env.MAX_REPLACEMENTS = "1000";
    vi.resetModules();

    const { buildApp } = await import("../../src/server.js");
    const app = buildApp();
    await app.ready();

    const manyDogs = Array(500).fill("dog");
    const response = await app.inject({
      method: "POST",
      url: "/replace",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(manyDogs),
    });

    const body = JSON.parse(response.body);
    expect(body.replacements).toBe(500);
    expect(body.limitReached).toBe(false);

    await app.close();
  });
});
