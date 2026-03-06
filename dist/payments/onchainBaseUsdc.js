import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { base } from "viem/chains";
const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
export async function verifyUsdcPaymentOnBaseRpc(args) {
    const client = createPublicClient({
        chain: base,
        transport: http(args.rpcUrl)
    });
    const receipt = await client.getTransactionReceipt({
        hash: args.txHash
    });
    if (receipt.status !== "success") {
        return { ok: false, error: "tx_failed" };
    }
    const transferEvent = parseAbiItem("event Transfer(address indexed from,address indexed to,uint256 value)");
    const logs = receipt.logs
        .filter((l) => l.address.toLowerCase() === USDC_BASE.toLowerCase())
        .map((l) => {
        try {
            return decodeEventLog({
                abi: [transferEvent],
                data: l.data,
                topics: l.topics
            });
        }
        catch {
            return null;
        }
    })
        .filter(Boolean);
    const payToLower = args.payTo.toLowerCase();
    const minUnits = BigInt(Math.round(Number(args.amount) * 1_000_000));
    const paid = logs.some((ev) => {
        const toOk = ev.args.to.toLowerCase() === payToLower;
        const valOk = ev.args.value >= minUnits;
        return toOk && valOk;
    });
    if (!paid) {
        return { ok: false, error: "no_usdc_transfer_to_payto" };
    }
    return { ok: true };
}
