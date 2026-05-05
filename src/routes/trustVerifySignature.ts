import { FastifyPluginAsync } from "fastify"
import {
  isReceiptSigningEnabled,
  RECEIPT_SIGNATURE_ALG,
  verifyReceiptSignature
} from "../lib/signing.js"

export const trustVerifySignatureRoute: FastifyPluginAsync = async (app) => {
  app.post("/trust/verify-signature", async (req, reply) => {
    const body = (req.body || {}) as {
      receipt?: Record<string, unknown>
      signature?: string
      signature_alg?: string
    }

    const receipt = body.receipt
    const signature = body.signature
    const signatureAlg = body.signature_alg

    if (!receipt || typeof receipt !== "object") {
      return reply.code(400).send({
        error: "missing_receipt"
      })
    }

    if (!signature || typeof signature !== "string") {
      return reply.code(400).send({
        error: "missing_signature"
      })
    }

    if (signatureAlg && signatureAlg !== RECEIPT_SIGNATURE_ALG) {
      return reply.code(400).send({
        error: "unsupported_signature_alg"
      })
    }

    if (!isReceiptSigningEnabled()) {
      return reply.code(503).send({
        error: "receipt_signing_not_configured"
      })
    }

    const valid = verifyReceiptSignature({
      payload: receipt,
      signature
    })

    return {
      valid,
      signature_alg: RECEIPT_SIGNATURE_ALG
    }
  })
}
