import Fastify from "fastify"
import { healthRoute } from "./routes/health.js"
import { quoteRoute } from "./routes/quote.js"
import { verifyRoute } from "./routes/verify.js"
import { verifyBatchRoute } from "./routes/verifyBatch.js"
import { payRoute } from "./routes/pay.js"
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

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || "0.0.0.0"

const BODY_LIMIT_BYTES = Number(process.env.BODY_LIMIT_BYTES || 32_000)
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6_000)

const RL_CAPACITY = Number(process.env.RL_CAPACITY || 120)
const RL_REFILL_PER_SEC = Number(process.env.RL_REFILL_PER_SEC || 2)

const PAYMENT_MODE = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

const app = Fastify({
  logger: true,
  bodyLimit: BODY_LIMIT_BYTES
})

app.addHook("onRequest", async (_req, reply) => {
  const t = setTimeout(() => {
    if (!reply.sent) {
      ;(reply as any).__timedOut = true
      reply.code(503).send({ error: "timeout", hint: "Request took too long" })
    }
  }, REQUEST_TIMEOUT_MS)

  ;(reply as any).__timeout = t
  ;(reply as any).__timedOut = false
})

app.addHook("onResponse", async (_req, reply) => {
  const t = (reply as any).__timeout as NodeJS.Timeout | undefined
  if (t) clearTimeout(t)
})

const rateLimiter = createRateLimiter({
  capacity: RL_CAPACITY,
  refillPerSec: RL_REFILL_PER_SEC
})

app.addHook("preHandler", rateLimiter)

app.get("/", async () => {
  return {
    name: "AI Risk Oracle",
    status: "ok",
    version: "0.0.1",

    auth: {
      primary: {
        type: "Bearer API key",
        header: "Authorization: Bearer <api_key>"
      },
      legacy: {
        type: "X-Payment-Ref"
      }
    },

    endpoints: {
      verify: "POST /verify",
      verify_batch: "POST /verify/batch",
      me: "GET /me",
      health: "GET /health"
    },

    billing: {
      model: "prepaid_balance_per_request",
      default_cost_usdc: "0.0006",
      idempotency_header: "X-Idempotency-Key"
    },

    docs: {
      openapi: "/.well-known/openapi.json",
      service: "/.well-known/ai-service.json"
    }
  }
})

async function start() {
  await app.register(healthRoute)
  await app.register(statsRoute)
  await app.register(quoteRoute)
  await app.register(verifyRoute)
  await app.register(verifyBatchRoute)
  await app.register(accountsRoute)
  await app.register(balanceRoute)
  await app.register(apiKeysRoute)
  await app.register(meRoute)
  await app.register(wellKnownRoute)
  await app.register(openApiRoute)
  await app.register(topupCreateRoute)
  await app.register(topupConfirmRoute)
  
  if (PAYMENT_MODE === "file") {
    await app.register(payRoute)
  }

  await app.listen({ port: PORT, host: HOST })
}

start().catch((err) => {
  app.log.error(err, "Fatal startup error")
  process.exit(1)
})