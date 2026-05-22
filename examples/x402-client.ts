import { decodePaymentRequiredHeader } from "@x402/core/http"

import { OracleHttpError } from "../sdk/interai-risk-oracle.ts"

const BASE_URL = process.env.ORACLE_BASE_URL || "https://ai-risk-oracle.fly.dev"

async function main() {
  const response = await fetch(`${BASE_URL}/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt: "What is 2 + 2?",
      response: "4",
      domain: "math"
    })
  })

  const body = await response.json()

  if (response.status !== 402) {
    console.log(body)
    return
  }

  const paymentRequiredHeader = response.headers.get("PAYMENT-REQUIRED")
  if (!paymentRequiredHeader) {
    throw new Error("Expected PAYMENT-REQUIRED header")
  }

  const paymentRequired = decodePaymentRequiredHeader(paymentRequiredHeader)
  const accept = paymentRequired.accepts[0]

  console.log({
    status: response.status,
    resource: paymentRequired.resource,
    scheme: accept.scheme,
    network: accept.network,
    amount: accept.amount,
    asset: accept.asset,
    payTo: accept.payTo
  })

  const error = new OracleHttpError({
    method: "POST",
    path: "/verify",
    status: response.status,
    body,
    headers: Object.fromEntries(response.headers.entries())
  })

  console.log({
    sdk_error_status: error.status,
    sdk_payment_required: Boolean(error.paymentRequired)
  })
}

main().catch((error) => {
  console.error("X402_CLIENT_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
