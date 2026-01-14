import { describe, it, expect } from "vitest";
import { replaceDogsWithCats } from "../../src/services/jsonReplacer.js";

describe("replaceDogsWithCats", () => {
  // ============================================
  // BASIC REPLACEMENT TESTS
  // ============================================
  describe("basic replacement", () => {
    it("should replace single 'dog' string", () => {
      const result = replaceDogsWithCats("dog", 100);
      expect(result.result).toBe("cat");
      expect(result.replacements).toBe(1);
      expect(result.limitReached).toBe(false);
    });

    it("should replace multiple 'dog' strings in a sentence", () => {
      const result = replaceDogsWithCats("I have a dog and my dog is cute", 100);
      expect(result.result).toBe("I have a cat and my cat is cute");
      expect(result.replacements).toBe(2);
      expect(result.limitReached).toBe(false);
    });

    it("should replace multiple 'dog' strings in flat object", () => {
      const result = replaceDogsWithCats(
        {
          pet1: "dog",
          pet2: "dog",
          pet3: "cat",
        },
        100
      );
      expect(result.result).toEqual({
        pet1: "cat",
        pet2: "cat",
        pet3: "cat",
      });
      expect(result.replacements).toBe(2);
    });

    it("should replace 'dog' in nested objects (3+ levels deep)", () => {
      const result = replaceDogsWithCats(
        {
          level1: {
            level2: {
              level3: {
                animal: "dog",
              },
            },
          },
        },
        100
      );
      expect(result.result).toEqual({
        level1: {
          level2: {
            level3: {
              animal: "cat",
            },
          },
        },
      });
      expect(result.replacements).toBe(1);
    });

    it("should replace 'dog' in arrays", () => {
      const result = replaceDogsWithCats(["dog", "bird", "dog", "fish"], 100);
      expect(result.result).toEqual(["cat", "bird", "cat", "fish"]);
      expect(result.replacements).toBe(2);
    });

    it("should replace 'dog' in arrays of objects", () => {
      const result = replaceDogsWithCats(
        [
          { name: "dog", sound: "bark" },
          { name: "cat", sound: "meow" },
          { name: "dog", sound: "woof" },
        ],
        100
      );
      expect(result.result).toEqual([
        { name: "cat", sound: "bark" },
        { name: "cat", sound: "meow" },
        { name: "cat", sound: "woof" },
      ]);
      expect(result.replacements).toBe(2);
    });

    it("should replace 'dog' in mixed nested structures", () => {
      const result = replaceDogsWithCats(
        {
          animals: [
            { type: "dog", names: ["dog", "buddy"] },
            { type: "cat", names: ["whiskers"] },
          ],
          message: "I love my dog",
          nested: {
            deep: {
              value: "dog",
            },
          },
        },
        100
      );
      expect(result.result).toEqual({
        animals: [
          { type: "cat", names: ["cat", "buddy"] },
          { type: "cat", names: ["whiskers"] },
        ],
        message: "I love my cat",
        nested: {
          deep: {
            value: "cat",
          },
        },
      });
      expect(result.replacements).toBe(4);
    });
  });

  // ============================================
  // TYPE PRESERVATION TESTS
  // ============================================
  describe("type preservation", () => {
    it("should preserve numbers unchanged", () => {
      const result = replaceDogsWithCats(42, 100);
      expect(result.result).toBe(42);
      expect(result.replacements).toBe(0);
    });

    it("should preserve floating point numbers", () => {
      const result = replaceDogsWithCats(3.14159, 100);
      expect(result.result).toBe(3.14159);
      expect(result.replacements).toBe(0);
    });

    it("should preserve negative numbers", () => {
      const result = replaceDogsWithCats(-100, 100);
      expect(result.result).toBe(-100);
      expect(result.replacements).toBe(0);
    });

    it("should preserve zero", () => {
      const result = replaceDogsWithCats(0, 100);
      expect(result.result).toBe(0);
      expect(result.replacements).toBe(0);
    });

    it("should preserve boolean true", () => {
      const result = replaceDogsWithCats(true, 100);
      expect(result.result).toBe(true);
      expect(result.replacements).toBe(0);
    });

    it("should preserve boolean false", () => {
      const result = replaceDogsWithCats(false, 100);
      expect(result.result).toBe(false);
      expect(result.replacements).toBe(0);
    });

    it("should preserve null values", () => {
      const result = replaceDogsWithCats(null, 100);
      expect(result.result).toBe(null);
      expect(result.replacements).toBe(0);
    });

    it("should preserve empty strings", () => {
      const result = replaceDogsWithCats("", 100);
      expect(result.result).toBe("");
      expect(result.replacements).toBe(0);
    });

    it("should preserve empty objects", () => {
      const result = replaceDogsWithCats({}, 100);
      expect(result.result).toEqual({});
      expect(result.replacements).toBe(0);
    });

    it("should preserve empty arrays", () => {
      const result = replaceDogsWithCats([], 100);
      expect(result.result).toEqual([]);
      expect(result.replacements).toBe(0);
    });

    it("should preserve mixed types in objects", () => {
      const result = replaceDogsWithCats(
        {
          str: "hello",
          num: 42,
          bool: true,
          nil: null,
          arr: [],
          obj: {},
        },
        100
      );
      expect(result.result).toEqual({
        str: "hello",
        num: 42,
        bool: true,
        nil: null,
        arr: [],
        obj: {},
      });
      expect(result.replacements).toBe(0);
    });

    it("should preserve mixed types in arrays", () => {
      const result = replaceDogsWithCats(["string", 42, true, false, null], 100);
      expect(result.result).toEqual(["string", 42, true, false, null]);
      expect(result.replacements).toBe(0);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe("edge cases", () => {
    it("should handle root-level primitive 'dog' string", () => {
      const result = replaceDogsWithCats("dog", 100);
      expect(result.result).toBe("cat");
      expect(result.replacements).toBe(1);
    });

    it("should handle root-level arrays", () => {
      const result = replaceDogsWithCats(["dog", "dog"], 100);
      expect(result.result).toEqual(["cat", "cat"]);
      expect(result.replacements).toBe(2);
    });

    it("should handle very deep nesting (50+ levels)", () => {
      // Create a deeply nested structure
      let deepObj: Record<string, unknown> = { value: "dog" };
      for (let i = 0; i < 50; i++) {
        deepObj = { nested: deepObj };
      }

      const result = replaceDogsWithCats(deepObj as never, 100);

      // Verify the deeply nested value was replaced
      let current = result.result as Record<string, unknown>;
      for (let i = 0; i < 50; i++) {
        current = current.nested as Record<string, unknown>;
      }
      expect(current.value).toBe("cat");
      expect(result.replacements).toBe(1);
    });

    it("should handle large arrays (1000+ items)", () => {
      const largeArray = Array(1000).fill("dog");
      const result = replaceDogsWithCats(largeArray, 2000);

      expect(result.result).toEqual(Array(1000).fill("cat"));
      expect(result.replacements).toBe(1000);
      expect(result.limitReached).toBe(false);
    });

    it("should handle empty input object", () => {
      const result = replaceDogsWithCats({}, 100);
      expect(result.result).toEqual({});
      expect(result.replacements).toBe(0);
    });

    it("should handle empty input array", () => {
      const result = replaceDogsWithCats([], 100);
      expect(result.result).toEqual([]);
      expect(result.replacements).toBe(0);
    });

    it("should handle empty string input", () => {
      const result = replaceDogsWithCats("", 100);
      expect(result.result).toBe("");
      expect(result.replacements).toBe(0);
    });

    it("should handle objects with no 'dog' strings", () => {
      const result = replaceDogsWithCats(
        {
          name: "fluffy",
          type: "cat",
          age: 5,
          active: true,
        },
        100
      );
      expect(result.result).toEqual({
        name: "fluffy",
        type: "cat",
        age: 5,
        active: true,
      });
      expect(result.replacements).toBe(0);
    });

    it("should handle unicode strings with 'dog'", () => {
      const result = replaceDogsWithCats("My dog is 🐕 and loves 日本語", 100);
      expect(result.result).toBe("My cat is 🐕 and loves 日本語");
      expect(result.replacements).toBe(1);
    });

    it("should handle special characters in strings", () => {
      const result = replaceDogsWithCats("dog! dog? dog. dog, dog; dog:", 100);
      expect(result.result).toBe("cat! cat? cat. cat, cat; cat:");
      expect(result.replacements).toBe(6);
    });

    it("should handle strings with newlines and tabs", () => {
      const result = replaceDogsWithCats("dog\ndog\tdog", 100);
      expect(result.result).toBe("cat\ncat\tcat");
      expect(result.replacements).toBe(3);
    });

    it("should handle strings with quotes", () => {
      const result = replaceDogsWithCats('"dog" and \'dog\'', 100);
      expect(result.result).toBe('"cat" and \'cat\'');
      expect(result.replacements).toBe(2);
    });

    it("should handle strings with parentheses and brackets", () => {
      const result = replaceDogsWithCats("(dog) [dog] {dog}", 100);
      expect(result.result).toBe("(cat) [cat] {cat}");
      expect(result.replacements).toBe(3);
    });

    it("should handle very long strings", () => {
      const longString = "dog ".repeat(500) + "end";
      const result = replaceDogsWithCats(longString, 1000);
      expect(result.result).toBe("cat ".repeat(500) + "end");
      expect(result.replacements).toBe(500);
    });
  });

  // ============================================
  // REPLACEMENT LIMIT TESTS
  // ============================================
  describe("replacement limit", () => {
    it("should stop replacing when limit reached", () => {
      const result = replaceDogsWithCats("dog dog dog dog dog", 3);
      expect(result.result).toBe("cat cat cat dog dog");
      expect(result.replacements).toBe(3);
      expect(result.limitReached).toBe(true);
    });

    it("should set limitReached flag correctly when at limit", () => {
      const result = replaceDogsWithCats("dog dog", 2);
      expect(result.replacements).toBe(2);
      expect(result.limitReached).toBe(true);
    });

    it("should set limitReached flag correctly when under limit", () => {
      const result = replaceDogsWithCats("dog dog", 10);
      expect(result.replacements).toBe(2);
      expect(result.limitReached).toBe(false);
    });

    it("should return accurate replacement count", () => {
      const result = replaceDogsWithCats(
        {
          a: "dog",
          b: ["dog", "dog"],
          c: { d: "dog" },
        },
        100
      );
      expect(result.replacements).toBe(4);
    });

    it("should handle limit of 0 (no replacements)", () => {
      const result = replaceDogsWithCats("dog dog dog", 0);
      expect(result.result).toBe("dog dog dog");
      expect(result.replacements).toBe(0);
      expect(result.limitReached).toBe(true);
    });

    it("should handle limit of 1 (single replacement)", () => {
      const result = replaceDogsWithCats("dog dog dog", 1);
      expect(result.result).toBe("cat dog dog");
      expect(result.replacements).toBe(1);
      expect(result.limitReached).toBe(true);
    });

    it("should handle limit greater than occurrences", () => {
      const result = replaceDogsWithCats("dog dog", 100);
      expect(result.result).toBe("cat cat");
      expect(result.replacements).toBe(2);
      expect(result.limitReached).toBe(false);
    });

    it("should respect limit across nested structures", () => {
      const result = replaceDogsWithCats(
        {
          a: "dog",
          b: ["dog", "dog"],
          c: { d: "dog", e: "dog" },
        },
        3
      );
      expect(result.replacements).toBe(3);
      expect(result.limitReached).toBe(true);
    });

    it("should respect limit across multiple strings in same value", () => {
      const result = replaceDogsWithCats("dog dog dog dog dog", 2);
      expect(result.result).toBe("cat cat dog dog dog");
      expect(result.replacements).toBe(2);
      expect(result.limitReached).toBe(true);
    });

    it("should respect limit across arrays", () => {
      const result = replaceDogsWithCats(["dog", "dog", "dog", "dog"], 2);
      expect(result.result).toEqual(["cat", "cat", "dog", "dog"]);
      expect(result.replacements).toBe(2);
      expect(result.limitReached).toBe(true);
    });

    it("should handle very high limits", () => {
      const result = replaceDogsWithCats("dog", Number.MAX_SAFE_INTEGER);
      expect(result.result).toBe("cat");
      expect(result.replacements).toBe(1);
      expect(result.limitReached).toBe(false);
    });
  });

  // ============================================
  // CASE SENSITIVITY TESTS
  // ============================================
  describe("case sensitivity", () => {
    it("should NOT replace 'Dog' (capitalized)", () => {
      const result = replaceDogsWithCats("Dog", 100);
      expect(result.result).toBe("Dog");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'DOG' (all caps)", () => {
      const result = replaceDogsWithCats("DOG", 100);
      expect(result.result).toBe("DOG");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'dOg' (mixed case)", () => {
      const result = replaceDogsWithCats("dOg", 100);
      expect(result.result).toBe("dOg");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'doG' (mixed case)", () => {
      const result = replaceDogsWithCats("doG", 100);
      expect(result.result).toBe("doG");
      expect(result.replacements).toBe(0);
    });

    it("should only replace exact 'dog' in mixed case string", () => {
      const result = replaceDogsWithCats("Dog DOG dog dOg", 100);
      expect(result.result).toBe("Dog DOG cat dOg");
      expect(result.replacements).toBe(1);
    });

    it("should replace all lowercase 'dog' occurrences", () => {
      const result = replaceDogsWithCats("dog dog dog", 100);
      expect(result.result).toBe("cat cat cat");
      expect(result.replacements).toBe(3);
    });
  });

  // ============================================
  // SUBSTRING TESTS
  // ============================================
  describe("substring matching", () => {
    it("should NOT replace 'doghouse' (suffix)", () => {
      const result = replaceDogsWithCats("doghouse", 100);
      expect(result.result).toBe("doghouse");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'hotdog' (prefix)", () => {
      const result = replaceDogsWithCats("hotdog", 100);
      expect(result.result).toBe("hotdog");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'dogs' (plural)", () => {
      const result = replaceDogsWithCats("dogs", 100);
      expect(result.result).toBe("dogs");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'underdog'", () => {
      const result = replaceDogsWithCats("underdog", 100);
      expect(result.result).toBe("underdog");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'doggy'", () => {
      const result = replaceDogsWithCats("doggy", 100);
      expect(result.result).toBe("doggy");
      expect(result.replacements).toBe(0);
    });

    it("should NOT replace 'watchdog'", () => {
      const result = replaceDogsWithCats("watchdog", 100);
      expect(result.result).toBe("watchdog");
      expect(result.replacements).toBe(0);
    });

    it("should replace standalone 'dog' next to compound words", () => {
      const result = replaceDogsWithCats("dog doghouse hotdog dog", 100);
      expect(result.result).toBe("cat doghouse hotdog cat");
      expect(result.replacements).toBe(2);
    });

    it("should handle 'dog' with trailing space correctly", () => {
      const result = replaceDogsWithCats("dog ", 100);
      expect(result.result).toBe("cat ");
      expect(result.replacements).toBe(1);
    });

    it("should handle 'dog' with leading space correctly", () => {
      const result = replaceDogsWithCats(" dog", 100);
      expect(result.result).toBe(" cat");
      expect(result.replacements).toBe(1);
    });

    it("should handle 'dog' surrounded by spaces", () => {
      const result = replaceDogsWithCats(" dog ", 100);
      expect(result.result).toBe(" cat ");
      expect(result.replacements).toBe(1);
    });

    it("should NOT replace 'dog' within numbers", () => {
      const result = replaceDogsWithCats("1dog2", 100);
      expect(result.result).toBe("1dog2");
      expect(result.replacements).toBe(0);
    });

    it("should handle hyphenated words with 'dog'", () => {
      const result = replaceDogsWithCats("dog-friendly", 100);
      expect(result.result).toBe("cat-friendly");
      expect(result.replacements).toBe(1);
    });
  });

  // ============================================
  // COMPLEX SCENARIOS
  // ============================================
  describe("complex scenarios", () => {
    it("should handle realistic JSON payload", () => {
      const input = {
        user: {
          name: "John",
          pets: [
            { type: "dog", name: "Buddy", breed: "golden retriever" },
            { type: "cat", name: "Whiskers", breed: "tabby" },
          ],
        },
        message: "My dog is my best friend. I love my dog!",
        metadata: {
          tags: ["dog", "pet", "animal"],
          description: "A story about a dog owner",
        },
      };

      const result = replaceDogsWithCats(input, 100);

      expect(result.result).toEqual({
        user: {
          name: "John",
          pets: [
            { type: "cat", name: "Buddy", breed: "golden retriever" },
            { type: "cat", name: "Whiskers", breed: "tabby" },
          ],
        },
        message: "My cat is my best friend. I love my cat!",
        metadata: {
          tags: ["cat", "pet", "animal"],
          description: "A story about a cat owner",
        },
      });
      expect(result.replacements).toBe(5);
    });

    it("should handle arrays of arrays", () => {
      const result = replaceDogsWithCats(
        [
          ["dog", "cat"],
          ["dog", "dog"],
          ["bird", "dog"],
        ],
        100
      );
      expect(result.result).toEqual([
        ["cat", "cat"],
        ["cat", "cat"],
        ["bird", "cat"],
      ]);
      expect(result.replacements).toBe(4);
    });

    it("should handle objects with array values containing objects", () => {
      const result = replaceDogsWithCats(
        {
          items: [
            { value: "dog" },
            { value: "cat" },
            { nested: { deep: "dog" } },
          ],
        },
        100
      );
      expect(result.result).toEqual({
        items: [
          { value: "cat" },
          { value: "cat" },
          { nested: { deep: "cat" } },
        ],
      });
      expect(result.replacements).toBe(2);
    });

    it("should preserve object key named 'dog'", () => {
      const result = replaceDogsWithCats(
        {
          dog: "dog",
          cat: "cat",
        },
        100
      );
      expect(result.result).toEqual({
        dog: "cat",
        cat: "cat",
      });
      expect(result.replacements).toBe(1);
    });

    it("should handle multiple 'dog' in same string with limit", () => {
      const result = replaceDogsWithCats(
        "dog dog dog dog dog dog dog dog dog dog",
        5
      );
      expect(result.result).toBe("cat cat cat cat cat dog dog dog dog dog");
      expect(result.replacements).toBe(5);
      expect(result.limitReached).toBe(true);
    });

    it("should handle sparse arrays", () => {
      const sparseArray = ["dog"];
      sparseArray[5] = "dog";
      sparseArray[10] = "dog";

      const result = replaceDogsWithCats(sparseArray, 100);

      expect((result.result as string[])[0]).toBe("cat");
      expect((result.result as string[])[5]).toBe("cat");
      expect((result.result as string[])[10]).toBe("cat");
    });

    it("should handle object with numeric keys", () => {
      const result = replaceDogsWithCats(
        {
          "0": "dog",
          "1": "dog",
          "2": "cat",
        },
        100
      );
      expect(result.result).toEqual({
        "0": "cat",
        "1": "cat",
        "2": "cat",
      });
      expect(result.replacements).toBe(2);
    });
  });

  // ============================================
  // RESPONSE FORMAT TESTS
  // ============================================
  describe("response format", () => {
    it("should always return result field", () => {
      const result = replaceDogsWithCats("dog", 100);
      expect(result).toHaveProperty("result");
    });

    it("should always return replacements field as number", () => {
      const result = replaceDogsWithCats("dog", 100);
      expect(result).toHaveProperty("replacements");
      expect(typeof result.replacements).toBe("number");
    });

    it("should always return limitReached field as boolean", () => {
      const result = replaceDogsWithCats("dog", 100);
      expect(result).toHaveProperty("limitReached");
      expect(typeof result.limitReached).toBe("boolean");
    });

    it("should return correct structure for empty input", () => {
      const result = replaceDogsWithCats({}, 100);
      expect(result).toEqual({
        result: {},
        replacements: 0,
        limitReached: false,
      });
    });

    it("should return correct structure when limit is 0", () => {
      const result = replaceDogsWithCats("dog", 0);
      expect(result).toEqual({
        result: "dog",
        replacements: 0,
        limitReached: true,
      });
    });
  });
});
