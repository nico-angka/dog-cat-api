import type {
  JsonValue,
  JsonObject,
  ReplacementResult,
  ReplacementContext,
} from "../types/index.js";
import { DepthLimitExceededError } from "../types/index.js";

const SOURCE_WORD = "dog";
const TARGET_WORD = "cat";

/**
 * Dangerous keys that could be used for prototype pollution attacks.
 * These are filtered out during JSON traversal.
 */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Replaces exact occurrences of "dog" with "cat" in string values throughout a JSON structure.
 * Includes protection against:
 * - Deep recursion attacks (maxDepth limit)
 * - Prototype pollution (filters dangerous keys)
 *
 * @param input - The JSON value to process
 * @param maxReplacements - Maximum number of replacements allowed
 * @param maxDepth - Maximum recursion depth allowed (default: 100)
 * @returns ReplacementResult containing the modified JSON, count, and limit status
 * @throws DepthLimitExceededError if recursion depth exceeds maxDepth
 */
export function replaceDogsWithCats(
  input: JsonValue,
  maxReplacements: number,
  maxDepth: number = 100
): ReplacementResult {
  const context: ReplacementContext = {
    count: 0,
    limit: maxReplacements,
    depth: 0,
    maxDepth,
  };

  const result = traverse(input, context);

  return {
    result,
    replacements: context.count,
    limitReached: context.count >= context.limit,
  };
}

/**
 * Recursively traverses a JSON value and performs replacements.
 * Tracks recursion depth and throws if limit exceeded.
 */
function traverse(value: JsonValue, context: ReplacementContext): JsonValue {
  // Check depth limit before processing
  if (context.depth > context.maxDepth) {
    throw new DepthLimitExceededError(context.maxDepth);
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return replaceInString(value, context);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  // Increment depth for nested structures
  context.depth++;

  try {
    if (Array.isArray(value)) {
      return traverseArray(value, context);
    }

    return traverseObject(value, context);
  } finally {
    // Restore depth when exiting this level
    context.depth--;
  }
}

/**
 * Replaces exact "dog" occurrences in a string value.
 * Uses word boundary matching to avoid substring replacements.
 */
function replaceInString(str: string, context: ReplacementContext): string {
  if (context.count >= context.limit) {
    return str;
  }

  // Match "dog" as a whole word only (case-sensitive)
  // Word boundaries: start/end of string, whitespace, or punctuation
  const wordBoundary = "(?<![a-zA-Z0-9])";
  const wordBoundaryEnd = "(?![a-zA-Z0-9])";
  const pattern = new RegExp(
    `${wordBoundary}${SOURCE_WORD}${wordBoundaryEnd}`,
    "g"
  );

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(str)) !== null) {
    if (context.count >= context.limit) {
      // Append the rest of the string without further replacements
      result += str.slice(lastIndex);
      return result;
    }

    result += str.slice(lastIndex, match.index);
    result += TARGET_WORD;
    lastIndex = match.index + SOURCE_WORD.length;
    context.count++;
  }

  result += str.slice(lastIndex);
  return result;
}

/**
 * Traverses an array and processes each element.
 */
function traverseArray(
  arr: JsonValue[],
  context: ReplacementContext
): JsonValue[] {
  return arr.map((item) => traverse(item, context));
}

/**
 * Traverses an object and processes each value.
 * Filters out dangerous keys to prevent prototype pollution.
 * Object keys are preserved (not replaced).
 */
function traverseObject(
  obj: JsonObject,
  context: ReplacementContext
): JsonObject {
  const result: JsonObject = {};

  for (const key of Object.keys(obj)) {
    // Skip dangerous keys to prevent prototype pollution
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }
    result[key] = traverse(obj[key], context);
  }

  return result;
}

/**
 * Safely parses JSON with prototype pollution prevention.
 * Use this instead of JSON.parse for untrusted input.
 *
 * @param json - The JSON string to parse
 * @returns The parsed JSON value with dangerous keys removed
 */
export function safeJsonParse(json: string): JsonValue {
  return JSON.parse(json, (_key, value) => {
    // For objects, filter out dangerous keys
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const safeObj: Record<string, unknown> = {};
      for (const k of Object.keys(value)) {
        if (!DANGEROUS_KEYS.has(k)) {
          safeObj[k] = value[k];
        }
      }
      return safeObj;
    }
    return value;
  }) as JsonValue;
}
