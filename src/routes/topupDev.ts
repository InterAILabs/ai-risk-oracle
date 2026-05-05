import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import {
  creditAccount,
  getAccountBalance
} from "../payments/fileStore.js"
import { economicError } from "../lib/httpErrors.js"
import { resolveAccountIdFromBodyOrBearer } from "../auth/resolveBearerAccount.js"

export const topupDevRoute: FastifyPluginAsync = async (app) => {
  app.post("/topup/dev/credit", async (req, reply) => {
    const enabled = String(process.env.DEV_TOPUP_ENABLED || "false").toLowerCase()
    if (!["true", "1", "yes", "on"].includes(enabled)) {
      return reply.code(404).send(economicError("dev_topup_disabled"))
    }

    const body =
      (req.body as {
        account_id?: string
        amount_usdc?: string
        reference?: string
      } | undefined) ?? {}
    if (!body.account_id && !req.headers.authorization) {
      return reply.code(400).send(
        economicError("missing_account_id", {
          hint: "Provide account_id in body or Authorization: Bearer <api_key>"
        })
      )
    }

    const target = resolveAccountIdFromBodyOrBearer({ body, req, reply })
    if (!target) return

    const { accountId } = target

    const amountUsdc = String(body.amount_usdc ?? "0.01")
    const amountMicrousdc = Math.round(Number(amountUsdc) * 1_000_000)

    if (!Number.isFinite(amountMicrousdc) || amountMicrousdc <= 0) {
      return reply.code(400).send(economicError("invalid_amount_usdc"))
    }

    const ledgerId = randomUUID()
    const reference = body.reference ? String(body.reference) : `dev-topup:${randomUUID()}`

    creditAccount({
      ledgerId,
      accountId,
      amountMicrousdc,
      reference,
      metadata: {
        source: "dev_topup",
        note: "Local development balance credit"
      }
    })

    const balance = getAccountBalance(accountId)

    return {
      ok: true,
      credited_usdc: amountUsdc,
      credited_microusdc: amountMicrousdc,
      account_id: accountId,
      balance
    }
  })
}
