// src/middleware/rateLimit.ts
import { FastifyReply, FastifyRequest } from "fastify"

type Bucket = {
  tokens: number
  lastRefillMs: number
}

export function createRateLimiter(opts: {
  capacity: number        // tokens máximos
  refillPerSec: number    // tokens que se recargan por segundo
  keyFn?: (req: FastifyRequest) => string
}) {
  const buckets = new Map<string, Bucket>()
  const keyFn = opts.keyFn ?? ((req) => (req.ip || "unknown"))

  // Limpieza simple para no crecer infinito
  setInterval(() => {
    const now = Date.now()
    for (const [k, b] of buckets) {
      // si no se usó hace 10 min, borramos
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

    // refill
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