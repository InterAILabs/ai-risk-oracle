import { FastifyPluginAsync } from "fastify"
import { listTrustReceipts } from "../payments/fileStore.js"
import { isReceiptSigningEnabled } from "../lib/signing.js"
import { requireResolvedBearerAccount } from "../auth/resolveBearerAccount.js"

export const trustReceiptsRoute: FastifyPluginAsync = async (app) => {
  app.get("/trust/receipts", async (req, reply) => {
    const resolved = requireResolvedBearerAccount(req, reply, {
      missingError: "missing_api_key"
    })
    if (!resolved) return

    const query = (req.query || {}) as { limit?: string | number }
    const limitRaw = Number(query.limit ?? 50)
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(200, limitRaw))
      : 50

    const receipts = listTrustReceipts({
      accountId: resolved.account_id,
      limit
    })

    return {
      receipts,
      count: receipts.length,
      signing: {
        enabled: isReceiptSigningEnabled()
      }
    }
  })
}
