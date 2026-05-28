import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem"
import { base } from "viem/chains"
import { usdcDecimalToMicrousdc } from "../lib/money.js"

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"

export type OnchainRpcVerifyInput = {
  txHash: `0x${string}`
  payTo: `0x${string}`
  amount: string
  rpcUrl: string
}

export async function verifyUsdcPaymentOnBaseRpc(args: OnchainRpcVerifyInput) {
  const client = createPublicClient({
    chain: base,
    transport: http(args.rpcUrl)
  })

  const receipt = await client.getTransactionReceipt({
    hash: args.txHash
  })

  if (receipt.status !== "success") {
    return { ok: false as const, error: "tx_failed" }
  }

  const transferEvent = parseAbiItem(
    "event Transfer(address indexed from,address indexed to,uint256 value)"
  )

  type ReceiptLog = (typeof receipt.logs)[number]
  type TransferMatch = {
    args: {
      to: `0x${string}`
      value: bigint
    }
  }

  const logs: TransferMatch[] = []

  for (const l of receipt.logs as ReceiptLog[]) {
    if (l.address.toLowerCase() !== USDC_BASE.toLowerCase()) {
      continue
    }

    try {
      const decoded = decodeEventLog({
        abi: [transferEvent],
        data: l.data,
        topics: l.topics
      })

      logs.push({
        args: {
          to: decoded.args.to as `0x${string}`,
          value: decoded.args.value as bigint
        }
      })
    } catch {
      continue
    }
  }

  const payToLower = args.payTo.toLowerCase()

  const minUnits = BigInt(usdcDecimalToMicrousdc(args.amount))

  const paid = logs.some((ev) => {
    const toOk = ev.args.to.toLowerCase() === payToLower
    const valOk = ev.args.value >= minUnits
    return toOk && valOk
  })

  if (!paid) {
    return { ok: false as const, error: "no_usdc_transfer_to_payto" }
  }

  return { ok: true as const }
}
