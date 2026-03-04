// src/payments/onchainBaseUsdcRpc.ts
// keccak256("Transfer(address,address,uint256)") topic0
const TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
function toLowerHex(x) {
    return x.toLowerCase();
}
function padTopicAddress(addr) {
    // topic is 32 bytes; addresses are right-aligned (last 20 bytes)
    // remove 0x then pad left to 64 hex chars
    const a = addr.slice(2).toLowerCase();
    return "0x" + a.padStart(64, "0");
}
function parseUsdcUnits(decimal, decimals = 6) {
    const [i, f = ""] = decimal.split(".");
    const frac = (f + "0".repeat(decimals)).slice(0, decimals);
    const intPart = BigInt(i || "0");
    const fracPart = BigInt(frac || "0");
    return intPart * BigInt(10 ** decimals) + fracPart;
}
async function rpc(rpcUrl, method, params) {
    const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
    });
    if (!res.ok)
        throw new Error(`RPC HTTP ${res.status}`);
    const json = await res.json();
    if (json.error)
        throw new Error(`RPC error: ${json.error.message || "unknown"}`);
    return json.result;
}
export async function verifyUsdcPaymentOnBaseRpc(input) {
    const minUnits = parseUsdcUnits(input.minAmountDecimal, 6);
    let receipt;
    try {
        receipt = await rpc(input.rpcUrl, "eth_getTransactionReceipt", [input.txHash]);
    }
    catch (e) {
        return { ok: false, reason: `rpc_failed: ${String(e)}` };
    }
    if (!receipt)
        return { ok: false, reason: "tx_not_found" };
    if (receipt.status !== "0x1")
        return { ok: false, reason: "tx_failed" };
    const usdc = toLowerHex(input.usdcAddress);
    const payToTopic = padTopicAddress(input.payTo);
    const logs = receipt.logs || [];
    for (const log of logs) {
        if (!log?.address || toLowerHex(log.address) !== usdc)
            continue;
        const topics = log.topics || [];
        if (topics.length < 3)
            continue;
        if (toLowerHex(topics[0]) !== TRANSFER_TOPIC0)
            continue;
        // topics[2] = to
        if (toLowerHex(topics[2]) !== toLowerHex(payToTopic))
            continue;
        // data = value (uint256)
        const data = log.data;
        if (!data || !data.startsWith("0x"))
            continue;
        const value = BigInt(data);
        if (value >= minUnits) {
            return { ok: true, paidAmountUnits: value };
        }
    }
    return { ok: false, reason: "no_matching_usdc_transfer" };
}
