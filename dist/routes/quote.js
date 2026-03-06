import { randomUUID } from "crypto";
import { createQuote } from "../payments/fileStore.js";
const PRICING = { fast: "0.0006" };
const TTL_MS = 10 * 60 * 1000;
const CHAIN = "base";
const CHAIN_ID = 8453;
const TOKEN = {
    symbol: "USDC",
    decimals: 6,
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
};
export const quoteRoute = async (app) => {
    app.post("/quote", async (req, reply) => {
        const body = req.body;
        const mode = body?.mode ?? "fast";
        if (!(mode in PRICING))
            return reply.code(400).send({ error: "invalid_mode" });
        const ref = randomUUID();
        const pay_to = (process.env.PAY_TO ||
            "0x0000000000000000000000000000000000000000");
        createQuote(ref, PRICING[mode], pay_to, TTL_MS);
        return {
            payment_reference: ref,
            amount: PRICING[mode],
            currency: "USDC",
            chain: CHAIN,
            chain_id: CHAIN_ID,
            token: TOKEN,
            pay_to,
            expires_at_ms: Date.now() + TTL_MS
        };
    });
};
