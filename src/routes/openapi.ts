// src/routes/openapi.ts
import { FastifyInstance } from "fastify"

export async function openApiRoute(app: FastifyInstance) {
  app.get("/.well-known/openapi.json", async (req) => {
    const baseUrl =
      (req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]) : "https") +
      "://" +
      String(req.headers.host)

    return {
      openapi: "3.0.3",
      info: {
        title: "InterAI Risk Oracle",
        version: "0.0.1",
        description: "AI response risk/consistency oracle with payment-gated verification."
      },
      servers: [{ url: baseUrl }],
      paths: {
        "/health": {
          get: {
            responses: {
              "200": { description: "OK" }
            }
          }
        },
        "/quote": {
          post: {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      prompt: { type: "string" },
                      response: { type: "string" },
                      mode: { type: "string", enum: ["fast"] }
                    },
                    required: ["prompt", "response", "mode"]
                  }
                }
              }
            },
            responses: {
              "200": {
                description: "Quote created",
                content: {
                  "application/json": {
                    schema: { type: "object" }
                  }
                }
              }
            }
          }
        },
        "/verify": {
          post: {
            parameters: [
              {
                name: "X-Payment-Ref",
                in: "header",
                required: true,
                schema: { type: "string" }
              }
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      prompt: { type: "string" },
                      response: { type: "string" },
                      domain: { type: "string" }
                    },
                    required: ["prompt", "response"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Verification result" },
              "402": { description: "Payment required" }
            }
          }
        }
      }
    }
  })
}