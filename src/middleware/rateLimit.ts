import { createHash } from "crypto"
import { FastifyReply, FastifyRequest } from "fastify"

type Bucket = {
  tokens: number
  lastRefillMs: number
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function defaultKeyFn(req: FastifyRequest) {
  const authHeader = req.headers["authorization"]
  if (typeof authHeader === "string" && authHeader.trim()) {
    return `auth:${hashValue(authHeader.trim())}`
  }

  const paymentRef = req.headers["x-payment-ref"]
  if (typeof paymentRef === "string" && paymentRef.trim()) {
    return `payref:${hashValue(paymentRef.trim())}`
  }

  return `ip:${req.ip || "unknown"}`
}

export function createRateLimiter(opts: {
  capacity: number
  refillPerSec: number
  keyFn?: (req: FastifyRequest) => string
}) {
  const buckets = new Map<string, Bucket>()
  const keyFn = opts.keyFn ?? defaultKeyFn

  setInterval(() => {
    const now = Date.now()
    for (const [k, b] of buckets) {
      if (now - b.lastRefillMs > 10 * 60 * 1000) buckets.delete(k)
    }
  }, 60 * 1000).unref?.()

  return async function rateLimitHook(req: FastifyRequest, reply: FastifyReply) {
    const key = keyFn(req)
    const now = Date.now()

    const b = buckets.get(key) ?? {
      tokens: opts.capacity,
      lastRefillMs: now
    }

    const elapsedSec = (now - b.lastRefillMs) / 1000
    if (elapsedSec > 0) {
      b.tokens = Math.min(opts.capacity, b.tokens + elapsedSec * opts.refillPerSec)
      b.lastRefillMs = now
    }

    if (b.tokens < 1) {
      buckets.set(key, b)
      return reply.code(429).send({
        error: "rate_limited",
        hint: "Too many requests. Slow down."
      })
    }

    b.tokens -= 1
    buckets.set(key, b)
  }
}