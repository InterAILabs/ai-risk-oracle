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
        description:
          "AI response risk/consistency oracle with prepaid balance billing for autonomous agents."
      },
      servers: [{ url: baseUrl }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer"
          }
        }
      },
      paths: {
        "/health": {
          get: {
            responses: {
              "200": { description: "OK" }
            }
          }
        },
        "/me": {
          get: {
            security: [{ bearerAuth: [] }],
            responses: {
              "200": { description: "Authenticated account profile and balance" },
              "401": { description: "Missing or invalid API key" }
            }
          }
        },
        "/verify": {
          post: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "X-Idempotency-Key",
                in: "header",
                required: false,
                schema: { type: "string" }
              },
              {
                name: "X-Payment-Ref",
                in: "header",
                required: false,
                schema: { type: "string" },
                description: "Legacy compatibility mode only"
              },
              {
                name: "X-Payment-Tx",
                in: "header",
                required: false,
                schema: { type: "string" },
                description: "Legacy compatibility mode only"
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
              "401": { description: "Invalid API key" },
              "402": { description: "Insufficient balance or payment required" }
            }
          }
        },
        "/verify/batch": {
          post: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "X-Idempotency-Key",
                in: "header",
                required: false,
                schema: { type: "string" }
              },
              {
                name: "X-Payment-Ref",
                in: "header",
                required: false,
                schema: { type: "string" },
                description: "Legacy compatibility mode only"
              },
              {
                name: "X-Payment-Tx",
                in: "header",
                required: false,
                schema: { type: "string" },
                description: "Legacy compatibility mode only"
              }
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        minItems: 1,
                        maxItems: 100,
                        items: {
                          type: "object",
                          properties: {
                            prompt: { type: "string" },
                            response: { type: "string" },
                            domain: { type: "string" }
                          },
                          required: ["prompt", "response"]
                        }
                      }
                    },
                    required: ["items"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Batch verification result" },
              "401": { description: "Invalid API key" },
              "402": { description: "Insufficient balance or payment required" }
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
                      service: { type: "string", enum: ["verify"] },
                      mode: { type: "string", enum: ["fast", "batch"] },
                      items_count: { type: "integer" }
                    },
                    required: ["service", "mode"]
                  }
                }
              }
            },
            responses: {
              "200": {
                description: "Legacy compatibility quote created"
              }
            }
          }
        }
      }
    }
  })
}