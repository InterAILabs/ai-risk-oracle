import type { FastifyReply, FastifyRequest } from "fastify"
import { HTTPFacilitatorClient } from "@x402/core/server"
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader
} from "@x402/core/http"
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse
} from "@x402/core/types"

import { getBatchAmount, PRICING } from "../config/pricing.js"

const BASE_USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const BASE_NETWORK_ID = "eip155:8453"
const X402_MAX_TIMEOUT_SECONDS = 300

export type X402Service = "verify" | "verify_batch"

export type X402Settlement = {
  paymentPayload: PaymentPayload
  paymentRequirements: PaymentRequirements
  verify: VerifyResponse
  settle: SettleResponse
}

function baseUrlFromRequest(req: FastifyRequest) {
  const host = String(req.headers.host || "localhost:3000")
  const forwardedProto = req.headers["x-forwarded-proto"]
  const proto =
    forwardedProto
      ? String(forwardedProto)
      : host.includes("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https"

  return `${proto}://${host}`
}

function usdcToMicrousdc(amount: string) {
  return String(Math.round(Number(amount) * 1_000_000))
}

function configuredPayTo() {
  return (
    process.env.X402_PAY_TO ||
    process.env.TOPUP_RECEIVE_ADDRESS ||
    process.env.PAY_TO ||
    "0x0000000000000000000000000000000000000000"
  )
}

function serviceDescription(service: X402Service) {
  return service === "verify_batch"
    ? "Batch AI response trust verification with signed receipts."
    : "AI response trust verification with a signed receipt."
}

function servicePath(service: X402Service) {
  return service === "verify_batch" ? "/verify/batch" : "/verify"
}

function facilitatorClient() {
  return new HTTPFacilitatorClient({
    url: process.env.X402_FACILITATOR_URL
  })
}

function paymentRequirementsMatch(
  expected: PaymentRequirements,
  actual: PaymentRequirements | undefined
) {
  if (!actual) return false

  return (
    actual.scheme === expected.scheme &&
    actual.network === expected.network &&
    actual.amount === expected.amount &&
    actual.asset.toLowerCase() === expected.asset.toLowerCase() &&
    actual.payTo.toLowerCase() === expected.payTo.toLowerCase()
  )
}

export function x402AmountForService(service: X402Service, units = 1) {
  return service === "verify" ? PRICING.fast.amount : getBatchAmount(units)
}

export function buildX402Accept(params: {
  service: X402Service
  amountUsdc: string
}): PaymentRequirements {
  return {
    scheme: "exact",
    network: BASE_NETWORK_ID,
    amount: usdcToMicrousdc(params.amountUsdc),
    asset: BASE_USDC_ADDRESS,
    payTo: configuredPayTo(),
    maxTimeoutSeconds: X402_MAX_TIMEOUT_SECONDS,
    extra: {
      name: "USDC",
      version: "2",
      decimals: 6
    }
  }
}

export function buildX402PaymentRequired(params: {
  req: FastifyRequest
  service: X402Service
  amountUsdc?: string
}): PaymentRequired {
  const baseUrl = baseUrlFromRequest(params.req)
  const path = servicePath(params.service)
  const amountUsdc = params.amountUsdc ?? x402AmountForService(params.service)

  return {
    x402Version: 2,
    error: "payment_required",
    resource: {
      url: `${baseUrl}${path}`,
      description: serviceDescription(params.service),
      mimeType: "application/json",
      serviceName: "InterAI Risk Oracle",
      tags: ["ai-agents", "trust", "risk", "receipts"]
    },
    accepts: [
      buildX402Accept({
        service: params.service,
        amountUsdc
      })
    ],
    extensions: {
      interai: {
        production_billing: "x402_or_bearer_prepaid_balance",
        bearer_onboarding_url: `${baseUrl}/onboard`,
        topup_create_url: `${baseUrl}/topup/create`
      }
    }
  }
}

export function paymentSignatureFromRequest(req: FastifyRequest) {
  const raw =
    req.headers["payment-signature"] ||
    req.headers["PAYMENT-SIGNATURE"] ||
    req.headers["x-payment"]

  return Array.isArray(raw) ? raw[0] : raw ? String(raw) : null
}

export function sendX402PaymentRequired(
  reply: FastifyReply,
  paymentRequired: PaymentRequired,
  extra?: Record<string, unknown>
) {
  const response = extra
    ? {
        ...paymentRequired,
        extensions: {
          ...paymentRequired.extensions,
          interai: {
            ...(paymentRequired.extensions?.interai as Record<string, unknown> | undefined),
            ...extra
          }
        }
      }
    : paymentRequired
  const encoded = encodePaymentRequiredHeader(response)

  reply.header("PAYMENT-REQUIRED", encoded)
  reply.header("X-Payment-Required", encoded)
  return reply.code(402).send(response)
}

export async function verifyAndSettleX402Payment(params: {
  req: FastifyRequest
  reply: FastifyReply
  service: X402Service
  amountUsdc?: string
}): Promise<
  | { ok: true; settlement: X402Settlement }
  | { ok: false; handled: true }
  | { ok: false; handled: false }
> {
  const signatureHeader = paymentSignatureFromRequest(params.req)
  if (!signatureHeader) {
    return { ok: false, handled: false }
  }

  let paymentPayload: PaymentPayload
  try {
    paymentPayload = decodePaymentSignatureHeader(signatureHeader)
  } catch {
    sendX402PaymentRequired(
      params.reply,
      buildX402PaymentRequired({
        req: params.req,
        service: params.service,
        amountUsdc: params.amountUsdc
      }),
      { error: "invalid_payment_signature" }
    )
    return { ok: false, handled: true }
  }

  const paymentRequired = buildX402PaymentRequired({
    req: params.req,
    service: params.service,
    amountUsdc: params.amountUsdc
  })
  const paymentRequirements = paymentRequired.accepts[0]

  if (!paymentRequirementsMatch(paymentRequirements, paymentPayload.accepted)) {
    sendX402PaymentRequired(params.reply, paymentRequired, {
      error: "x402_payment_requirements_mismatch"
    })
    return { ok: false, handled: true }
  }

  const client = facilitatorClient()

  let verify: VerifyResponse
  try {
    verify = await client.verify(paymentPayload, paymentRequirements)
  } catch (err) {
    params.req.log.warn({ err }, "x402 facilitator verify failed")
    sendX402PaymentRequired(params.reply, paymentRequired, {
      error: "x402_verify_failed"
    })
    return { ok: false, handled: true }
  }

  if (!verify.isValid) {
    sendX402PaymentRequired(params.reply, paymentRequired, {
      error: verify.invalidReason || "x402_payment_invalid",
      invalid_message: verify.invalidMessage || null
    })
    return { ok: false, handled: true }
  }

  let settle: SettleResponse
  try {
    settle = await client.settle(paymentPayload, paymentRequirements)
  } catch (err) {
    params.req.log.error({ err }, "x402 facilitator settle failed")
    params.reply.code(402).send({
      error: "x402_settle_failed",
      hint: "Payment verified but settlement failed. Retry with a fresh payment signature."
    })
    return { ok: false, handled: true }
  }

  if (!settle.success) {
    params.reply.code(402).send({
      error: settle.errorReason || "x402_settle_failed",
      message: settle.errorMessage || "Payment settlement failed."
    })
    return { ok: false, handled: true }
  }

  params.reply.header("PAYMENT-RESPONSE", encodePaymentResponseHeader(settle))
  params.reply.header("X-Payment-Response", encodePaymentResponseHeader(settle))

  return {
    ok: true,
    settlement: {
      paymentPayload,
      paymentRequirements,
      verify,
      settle
    }
  }
}
