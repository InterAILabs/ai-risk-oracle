import { FastifyPluginAsync } from "fastify"
import { randomUUID, randomBytes } from "crypto"
import {
  createAccount,
  createApiKey,
  getAccountBalance,
  creditAccount
} from "../payments/fileStore.js"
import { PRICING } from "../config/pricing.js"
import { trackServiceEvent } from "../lib/discovery.js"
import { getTrialOffer, isEnabled } from "../lib/publicMeta.js"

function generateRawApiKey() {
  return `iao_live_${randomBytes(24).toString("hex")}`
}

export const onboardRoute: FastifyPluginAsync = async (app) => {
  app.post("/onboard", async (req, reply) => {
    const body =
      (req.body as {
        account_id?: string
        name?: string
        api_key_name?: string
        recommended_topup_usdc?: string
        dev_auto_credit_usdc?: string
      } | undefined) ?? {}

    const onboardingEnabled = isEnabled(process.env.ONBOARDING_ENABLED, "true")
    if (!onboardingEnabled) {
      return reply.code(404).send({ error: "onboarding_disabled" })
    }

    const accountId = body.account_id ? String(body.account_id) : randomUUID()
    const accountName = body.name ? String(body.name) : undefined
    const apiKeyName = body.api_key_name ? String(body.api_key_name) : "default"
    const recommendedTopupUsdc = String(
      body.recommended_topup_usdc ?? process.env.DEFAULT_RECOMMENDED_TOPUP_USDC ?? "0.01"
    )

    const account = createAccount(accountId, accountName)
    const apiKey = generateRawApiKey()

    const record = createApiKey({
      id: randomUUID(),
      accountId: account.id,
      rawKey: apiKey,
      name: apiKeyName
    })

    const trialOffer = getTrialOffer()
    const devAutoCreditEnabled = isEnabled(process.env.ONBOARDING_DEV_AUTO_CREDIT_ENABLED, "false")
    const devAutoCreditUsdc = String(
      body.dev_auto_credit_usdc ??
        process.env.ONBOARDING_DEV_AUTO_CREDIT_USDC ??
        "0.01"
    )

    let trialCreditApplied = false
    let trialCreditedMicrousdc = 0
    let devAutoCreditApplied = false
    let devCreditedMicrousdc = 0

    if (trialOffer.enabled && trialOffer.amount_microusdc > 0) {
      creditAccount({
        ledgerId: randomUUID(),
        accountId: account.id,
        amountMicrousdc: trialOffer.amount_microusdc,
        reference: `onboard-trial-credit:${account.id}`,
        metadata: {
          source: "onboard_trial_credit"
        }
      })

      trialCreditApplied = true
      trialCreditedMicrousdc = trialOffer.amount_microusdc
      trackServiceEvent(req, "trial_credit_granted", "/onboard")
    }

    if (devAutoCreditEnabled) {
      const amountMicrousdc = Math.round(Number(devAutoCreditUsdc) * 1_000_000)

      if (Number.isFinite(amountMicrousdc) && amountMicrousdc > 0) {
        creditAccount({
          ledgerId: randomUUID(),
          accountId: account.id,
          amountMicrousdc,
          reference: `onboard-dev-credit:${account.id}`,
          metadata: {
            source: "onboard_dev_auto_credit"
          }
        })

        devAutoCreditApplied = true
        devCreditedMicrousdc = amountMicrousdc
      }
    }

    const balance = getAccountBalance(account.id)

    const host = String(req.headers.host || "localhost:3000")
    const forwardedProto = req.headers["x-forwarded-proto"]
    const proto =
     forwardedProto
      ? String(forwardedProto)
      : host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https"
    const baseUrl = `${proto}://${host}`

    trackServiceEvent(req, "onboard_success", "/onboard")

    return {
      ok: true,
      message: "account_created",
      account,
      api_key: apiKey,
      api_key_record: record,
      balance,
      billing: {
        verify_cost_usdc: PRICING.fast.amount,
        currency: "USDC",
        chain: "base"
      },
      funding: {
        create_topup_url: `${baseUrl}/topup/create`,
        confirm_topup_url: `${baseUrl}/topup/confirm`,
        receive_address: process.env.TOPUP_RECEIVE_ADDRESS || null,
        recommended_topup_usdc: recommendedTopupUsdc,
        ...(isEnabled(process.env.DEV_TOPUP_ENABLED, "false")
          ? { dev_credit_url: `${baseUrl}/topup/dev/credit` }
          : {})
      },
      trial: {
        enabled: trialOffer.enabled,
        credit_applied: trialCreditApplied,
        credited_usdc: trialCreditApplied ? trialOffer.amount_usdc : "0",
        credited_microusdc: trialCreditedMicrousdc,
        estimated_verify_calls: trialOffer.estimated_verify_calls,
        estimated_calls_by_mode: trialOffer.estimated_calls_by_mode
      },
      dev: {
        auto_credit_enabled: devAutoCreditEnabled,
        auto_credit_applied: devAutoCreditApplied,
        auto_credit_usdc: devAutoCreditApplied ? devAutoCreditUsdc : "0",
        auto_credit_microusdc: devCreditedMicrousdc
      },
      quickstart: {
        me_curl: `curl -X GET ${baseUrl}/me -H "Authorization: Bearer ${apiKey}"`,
        verify_curl: `curl -X POST ${baseUrl}/verify -H "Content-Type: application/json" -H "Authorization: Bearer ${apiKey}" -H "X-Idempotency-Key: demo-1" -d '{"prompt":"What is the capital of France?","response":"Paris","domain":"general"}'`
      },
      next_steps: [
        "Call GET /me with the returned Bearer API key.",
        isEnabled(process.env.DEV_TOPUP_ENABLED, "false")
          ? "If balance is zero, call GET /pricing and then POST /topup/create or POST /topup/dev/credit."
          : "If balance is zero, call GET /pricing and then POST /topup/create.",
        "For onchain funding, send USDC on Base and then call POST /topup/confirm.",
        "Call POST /verify with Authorization: Bearer <api_key>."
      ]
    }
  })
}
