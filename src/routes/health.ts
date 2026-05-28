import { FastifyInstance } from "fastify"
import {
  isReceiptSigningEnabled,
  isReceiptSigningRequired
} from "../lib/signing.js"
import { checkDatabaseReady } from "../payments/fileStore.js"

function isEvmAddress(value: string | undefined) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""))
}

function isHttpsUrl(value: string | undefined) {
  return /^https:\/\//.test(String(value || ""))
}

export async function healthRoute(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "ai-risk-oracle",
      version: "0.0.1",
      payment_mode: process.env.PAYMENT_MODE || "file",
      trust_signing_enabled: isReceiptSigningEnabled()
    }
  })

  app.get("/ready", async (_req, reply) => {
    const checks: Record<string, boolean> = {
      database: false,
      signing: true,
      onchain_payment_config: true
    }

    try {
      checks.database = checkDatabaseReady()
    } catch {
      checks.database = false
    }

    if (isReceiptSigningRequired() && !isReceiptSigningEnabled()) {
      checks.signing = false
    }

    if (String(process.env.PAYMENT_MODE || "file") === "onchain") {
      checks.onchain_payment_config =
        isEvmAddress(process.env.TOPUP_RECEIVE_ADDRESS) &&
        isHttpsUrl(process.env.BASE_RPC_URL)
    }

    const ready = Object.values(checks).every(Boolean)
    if (!ready) {
      reply.code(503)
    }

    return {
      ok: ready,
      ready,
      service: "ai-risk-oracle",
      version: "0.0.1",
      checks
    }
  })
}
