const store = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 min
export function createQuote(ref, amount, pay_to) {
    const now = Date.now();
    const q = {
        ref,
        amount,
        currency: "USDC",
        chain: "base",
        pay_to,
        status: "quoted",
        created_at_ms: now,
        expires_at_ms: now + TTL_MS
    };
    store.set(ref, q);
    return q;
}
export function getQuote(ref) {
    const q = store.get(ref);
    if (!q)
        return undefined;
    if (Date.now() > q.expires_at_ms) {
        q.status = "expired";
        store.set(ref, q);
    }
    return q;
}
export function markPaid(ref) {
    const q = getQuote(ref);
    if (!q)
        return undefined;
    if (q.status === "expired")
        return q;
    q.status = "paid";
    store.set(ref, q);
    return q;
}
export function isPaid(ref) {
    const q = getQuote(ref);
    return !!q && q.status === "paid";
}
