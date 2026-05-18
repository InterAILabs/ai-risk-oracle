import type { FastifyReply, FastifyRequest } from "fastify"

import { getBatchAmount, PRICING } from "../config/pricing.js"

const BASE_USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const BASE_NETWORK_ID = "eip155:8453"

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

export function buildX402Accept(params: {
  baseUrl: string
  path: string
  service: "verify" | "verify_batch"
  amountUsdc: string
}) {
  const description =
    params.service === "verify_batch"
      ? "Batch AI response trust verification with signed receipts."
      : "AI response trust verification with a signed receipt."

  return {
    scheme: "exact",
    network: BASE_NETWORK_ID,
    price: `$${params.amountUsdc}`,
    maxAmountRequired: usdcToMicrousdc(params.amountUsdc),
    resource: `${params.baseUrl}${params.path}`,
    description,
    mimeType: "application/json",
    payTo: configuredPayTo(),
    asset: {
      symbol: "USDC",
      address: BASE_USDC_ADDRESS,
      decimals: 6
    }
  }
}

export function buildX402PaymentRequirements(params: {
  req: FastifyRequest
  path: string
  service: "verify" | "verify_batch"
  amountUsdc?: string
}) {
  const baseUrl = baseUrlFromRequest(params.req)
  const amountUsdc =
    params.amountUsdc ??
    (params.service === "verify" ? PRICING.fast.amount : getBatchAmount(1))

  return {
    x402Version: 2,
    error: "payment_required",
    accepts: [
      buildX402Accept({
        baseUrl,
        path: params.path,
        service: params.service,
        amountUsdc
      })
    ],
    interai: {
      status: "x402_advertised",
      production_billing: "bearer_prepaid_balance",
      note:
        "This service advertises x402 payment requirements for agent-native clients while production settlement currently uses prepaid Base USDC account balance."
    }
  }
}

export function sendX402PaymentRequired(
  reply: FastifyReply,
  requirements: ReturnType<typeof buildX402PaymentRequirements>,
  extra?: Record<string, unknown>
) {
  const encoded = Buffer.from(JSON.stringify(requirements)).toString("base64")
  reply.header("PAYMENT-REQUIRED", encoded)
  reply.header("X-Payment-Required", encoded)
  return reply.code(402).send({
    ...requirements,
    ...(extra ? { interai: { ...requirements.interai, ...extra } } : {})
  })
}
