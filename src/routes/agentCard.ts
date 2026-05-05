import { FastifyPluginAsync } from "fastify"
import { trackDiscoveryEvent } from "../lib/discovery.js"

export const agentCardRoute: FastifyPluginAsync = async (app) => {
  app.get("/.well-known/agent.json", async (req) => {
    trackDiscoveryEvent(req, "agent_card_view", "/.well-known/agent.json")
    const baseUrl =
      (req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]) : "https") +
      "://" +
      String(req.headers.host)

    return {
      name: "InterAI Risk Oracle",
      description:
        "Autonomous-agent verification service for response consistency, hallucination risk, and signed trust receipts with prepaid account billing.",
      url: `${baseUrl}/a2a`,
      provider: {
        organization: "InterAI",
        url: baseUrl
      },
      version: "0.0.1",
      documentationUrl: `${baseUrl}/.well-known/openapi.json`,
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false
      },
      securitySchemes: {
        bearerAuth: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description:
            "Use Authorization: Bearer <api_key>. Obtain credentials from POST /onboard and fund the account before calling the A2A endpoint."
        }
      },
      security: [{ bearerAuth: [] }],
      defaultInputModes: ["application/json", "text/plain"],
      defaultOutputModes: ["application/json"],
      skills: [
        {
          id: "verify_response",
          name: "Verify Response",
          description:
            "Evaluate a prompt/response pair, score consistency and hallucination risk, and return a signed trust receipt when signing is configured.",
          tags: ["verification", "risk", "trust", "hallucination", "preflight"],
          examples: [
            "Verify whether an answer to a factual question is safe to trust before acting on it.",
            "Check a generated recommendation before another agent executes it."
          ],
          inputModes: ["application/json", "text/plain"],
          outputModes: ["application/json"]
        },
        {
          id: "verify_batch",
          name: "Verify Batch",
          description:
            "Evaluate up to 100 prompt/response items in one billed request and return trust receipts for each item.",
          tags: ["verification", "batch", "trust", "billing"],
          examples: [
            "Preflight a list of candidate answers before selecting one.",
            "Audit many generated answers with one A2A request."
          ],
          inputModes: ["application/json", "text/plain"],
          outputModes: ["application/json"]
        }
      ]
    }
  })
}
