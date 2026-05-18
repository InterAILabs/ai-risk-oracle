import { FastifyPluginAsync } from "fastify"
import { getTrustReceiptById } from "../payments/fileStore.js"
import { economicError } from "../lib/httpErrors.js"

export const trustReceiptGetRoute: FastifyPluginAsync = async (app) => {
  app.get("/trust/receipts/:receiptId", async (req, reply) => {
    const params = req.params as { receiptId?: string }
    const receiptId = String(params.receiptId || "")

    if (!receiptId) {
      return reply.code(400).send(economicError("missing_receipt_id"))
    }

    const record = getTrustReceiptById(receiptId)

    if (!record) {
      return reply.code(404).send(economicError("trust_receipt_not_found"))
    }

    return {
      ok: true,
      receipt: {
        receipt_id: record.receipt_id,
        issued_at: record.issued_at,
        oracle_version: record.oracle_version,
        signals_version: record.signals_version,
        request_hash: record.request_hash,
        verdict: record.verdict,
        confidence: record.confidence,
        risk_level: record.risk_level,
        confidence_band: record.confidence_band,
        risk_factors: record.risk_factors,
        claims_checked: record.claims_checked,
        claims_supported: record.claims_supported,
        claims_uncertain: record.claims_uncertain,
        decision_basis: {
          dominant_negatives: record.dominant_negatives,
          dominant_positives: record.dominant_positives
        }
      },
      verification: {
        signed: record.signed,
        signature: record.signature,
        signature_alg: record.signature_alg
      },
      trust: {
        domain: record.domain,
        trust_score: record.trust_score,
        risk_level: record.risk_level,
        verdict: record.verdict,
        risk_factors: record.risk_factors,
        confidence_band: record.confidence_band
      }
    }
  })
}
