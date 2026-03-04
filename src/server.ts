// src/server.ts
import Fastify from "fastify"
import { quoteRoute } from "./routes/quote.js"
import { verifyRoute } from "./routes/verify.js"
import { healthRoute } from "./routes/health.js"
import { payRoute } from "./routes/pay.js"
import { createRateLimiter } from "./middleware/rateLimit.js"

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || "0.0.0.0"

// Hard limits (seguridad)
const BODY_LIMIT_BYTES = Number(process.env.BODY_LIMIT_BYTES || 32_000) // 32KB
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6_000) // 6s

// Rate limit (por IP)
const RL_CAPACITY = Number(process.env.RL_CAPACITY || 120)     // 120 tokens
const RL_REFILL_PER_SEC = Number(process.env.RL_REFILL_PER_SEC || 2) // 2 tokens/sec (~120/min)

const PAYMENT_MODE = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

const app = Fastify({
  logger: false,
  bodyLimit: BODY_LIMIT_BYTES
})

// Timeout simple: si una request excede REQUEST_TIMEOUT_MS, devolvemos 503
app.addHook("onRequest", async (req, reply) => {
  const t = setTimeout(() => {
    if (!reply.sent) {
      reply.code(503).send({ error: "timeout", hint: "Request took too long" })
    }
  }, REQUEST_TIMEOUT_MS)
  ;(reply as any).__timeout = t
})

app.addHook("onResponse", async (_req, reply) => {
  const t = (reply as any).__timeout as NodeJS.Timeout | undefined
  if (t) clearTimeout(t)
})

// Rate limit hook (global)
const rateLimiter = createRateLimiter({
  capacity: RL_CAPACITY,
  refillPerSec: RL_REFILL_PER_SEC
})
app.addHook("preHandler", rateLimiter)

async function start() {
  await healthRoute(app)
  await quoteRoute(app)
  await verifyRoute(app)

  // Solo habilitamos /pay/confirm en file mode
  if (PAYMENT_MODE === "file") {
    await payRoute(app)
  }

  await app.listen({ port: PORT, host: HOST })
}

start()