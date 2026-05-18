import "dotenv/config"
import Fastify from "fastify"
import { pathToFileURL } from "url"
import { healthRoute } from "./routes/health.js"
import { quoteRoute } from "./routes/quote.js"
import { pricingRoute } from "./routes/pricing.js"
import { verifyRoute } from "./routes/verify.js"
import { verifyBatchRoute } from "./routes/verifyBatch.js"
import { payRoute } from "./routes/pay.js"
import { landingRoute } from "./routes/landing.js"
import { wellKnownRoute } from "./routes/wellKnown.js"
import { openApiRoute } from "./routes/openapi.js"
import { statsRoute } from "./routes/stats.js"
import { createRateLimiter } from "./middleware/rateLimit.js"
import { accountsRoute } from "./routes/accounts.js"
import { balanceRoute } from "./routes/balance.js"
import { apiKeysRoute } from "./routes/apiKeys.js"
import { meRoute } from "./routes/me.js"
import { topupCreateRoute } from "./routes/topupCreate.js"
import { topupConfirmRoute } from "./routes/topupConfirm.js"
import { onboardRoute } from "./routes/onboard.js"
import { topupStatusRoute } from "./routes/topupStatus.js"
import { topupDevRoute } from "./routes/topupDev.js"
import { ledgerRoute } from "./routes/ledger.js"
import { usageRoute } from "./routes/usage.js"
import { trustReceiptsRoute } from "./routes/trustReceipts.js"
import { trustVerifySignatureRoute } from "./routes/trustVerifySignature.js"
import { trustReceiptGetRoute } from "./routes/trustReceiptGet.js"
import { trustReputationRoute } from "./routes/trustReputation.js"
import { schemasRoute } from "./routes/schemas.js"
import { trackDiscoveryEvent } from "./lib/discovery.js"
import { agentCardRoute } from "./routes/agentCard.js"
import { a2aRoute } from "./routes/a2a.js"
import { discoveryBundleRoute } from "./routes/discoveryBundle.js"
import { mcpRoute } from "./routes/mcp.js"

declare module "fastify" {
  interface FastifyReply {
    __timeout?: NodeJS.Timeout
    __timedOut?: boolean
  }
}

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || "0.0.0.0"

const BODY_LIMIT_BYTES = Number(process.env.BODY_LIMIT_BYTES || 32_000)
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6_000)

const RL_CAPACITY = Number(process.env.RL_CAPACITY || 120)
const RL_REFILL_PER_SEC = Number(process.env.RL_REFILL_PER_SEC || 2)

const PAYMENT_MODE = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

export function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: BODY_LIMIT_BYTES
  })

  app.addHook("onRequest", async (_req, reply) => {
    const t = setTimeout(() => {
      if (!reply.sent) {
        reply.__timedOut = true
        reply.code(503).send({ error: "timeout", hint: "Request took too long" })
      }
    }, REQUEST_TIMEOUT_MS)

    reply.__timeout = t
    reply.__timedOut = false
  })

  app.addHook("onResponse", async (_req, reply) => {
    const t = reply.__timeout
    if (t) clearTimeout(t)
  })

  const rateLimiter = createRateLimiter({
    capacity: RL_CAPACITY,
    refillPerSec: RL_REFILL_PER_SEC
  })

  app.addHook("preHandler", rateLimiter)

  app.setNotFoundHandler(async (req, reply) => {
    trackDiscoveryEvent(req, "not_found", req.url)
    reply.code(404)
    return {
      message: `Route ${req.method}:${req.url} not found`,
      error: "Not Found",
      statusCode: 404,
      discovery: {
        home: "/",
        service: "/.well-known/ai-service.json",
        openapi: "/.well-known/openapi.json",
        agent_card: "/.well-known/agent.json",
        discovery_bundle: "/.well-known/discovery-bundle.json",
        pricing: "/pricing"
      }
    }
  })

  return app
}

async function registerRoutes(app: ReturnType<typeof buildApp>) {
  await app.register(landingRoute)
  await app.register(healthRoute)
  await app.register(statsRoute)
  await app.register(pricingRoute)
  await app.register(quoteRoute)
  await app.register(verifyRoute)
  await app.register(verifyBatchRoute)
  await app.register(accountsRoute)
  await app.register(balanceRoute)
  await app.register(apiKeysRoute)
  await app.register(meRoute)
  await app.register(ledgerRoute)
  await app.register(usageRoute)
  await app.register(agentCardRoute)
  await app.register(discoveryBundleRoute)
  await app.register(mcpRoute)
  await app.register(wellKnownRoute)
  await app.register(openApiRoute)
  await app.register(onboardRoute)
  await app.register(topupCreateRoute)
  await app.register(topupConfirmRoute)
  await app.register(topupStatusRoute)
  await app.register(topupDevRoute)
  await app.register(trustReceiptsRoute)
  await app.register(trustReputationRoute)
  await app.register(trustReceiptGetRoute)
  await app.register(trustVerifySignatureRoute)
  await app.register(schemasRoute)
  await app.register(a2aRoute)
  if (PAYMENT_MODE === "file") {
    await app.register(payRoute)
  }

  return app
}

export async function createApp() {
  const app = buildApp()
  await registerRoutes(app)
  return app
}

export async function start() {
  const app = await createApp()

  await app.listen({ port: PORT, host: HOST })

  return app
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  start().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
