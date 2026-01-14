import type { FastifyInstance, FastifyRequest } from "fastify";
import { replaceDogsWithCats } from "../services/jsonReplacer.js";
import { config } from "../config/index.js";
import type { JsonValue, ReplaceResponse, HttpError } from "../types/index.js";
import { DepthLimitExceededError } from "../types/index.js";

interface ReplaceQuerystring {
  limit?: number;
}

export async function replaceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Querystring: ReplaceQuerystring }>(
    "/replace",
    {
      schema: {
        description: "Replace 'dog' with 'cat' in JSON payload",
        querystring: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              minimum: 1,
              description: "Max replacements (capped at server max)",
            },
          },
        },
        body: {
          description: "Any valid JSON value",
        },
        response: {
          200: {
            type: "object",
            properties: {
              result: {},
              replacements: { type: "number" },
              limitReached: { type: "boolean" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
              statusCode: { type: "number" },
              requestId: { type: "string" },
            },
          },
        },
      },
    },
    async (request): Promise<ReplaceResponse> => {
      const body = request.body as JsonValue;
      const requestLimit = request.query.limit;

      // Use requested limit if provided, but cap at server max
      const effectiveLimit = requestLimit
        ? Math.min(requestLimit, config.maxReplacements)
        : config.maxReplacements;

      request.log.debug({ body, effectiveLimit }, "Processing replacement request");

      try {
        const result = replaceDogsWithCats(
          body,
          effectiveLimit,
          config.maxDepth
        );

        request.log.info(
          {
            replacements: result.replacements,
            limitReached: result.limitReached,
          },
          "Replacement completed"
        );

        return result;
      } catch (error) {
        if (error instanceof DepthLimitExceededError) {
          request.log.warn(
            { maxDepth: config.maxDepth },
            "Depth limit exceeded"
          );
          const err = new Error(error.message) as HttpError;
          err.statusCode = 400;
          throw err;
        }
        throw error;
      }
    }
  );
}
