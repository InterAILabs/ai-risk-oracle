import fs from "fs";
import path from "path";
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "payments.json");
let store = {};
function ensureStore() {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE))
        fs.writeFileSync(FILE, JSON.stringify({}));
    const raw = fs.readFileSync(FILE, "utf8");
    store = raw ? JSON.parse(raw) : {};
    if (!store.__used_txs)
        store.__used_txs = {};
}
function flush() {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}
ensureStore();
export function createQuote(ref, amount, pay_to, ttl_ms) {
    const now = Date.now();
    store[ref] = {
        ref,
        amount,
        pay_to,
        created_at: now,
        expires_at: now + ttl_ms,
        status: "quoted"
    };
    flush();
}
export function getPayment(ref) {
    const rec = store[ref];
    if (!rec)
        return null;
    if (Date.now() > rec.expires_at && rec.status === "quoted") {
        rec.status = "expired";
        store[ref] = rec;
        flush();
    }
    return rec;
}
export function markPaid(ref, txHash) {
    const rec = store[ref];
    if (!rec)
        return false;
    rec.status = "paid";
    if (txHash)
        rec.tx_hash = txHash;
    store[ref] = rec;
    flush();
    return true;
}
export function consume(ref) {
    const rec = store[ref];
    if (!rec)
        return false;
    if (rec.status !== "paid")
        return false;
    rec.status = "consumed";
    store[ref] = rec;
    flush();
    return true;
}
export function isTxUsed(txHash) {
    return Boolean(store.__used_txs?.[txHash]);
}
export function markTxUsed(txHash, ref) {
    if (!store.__used_txs)
        store.__used_txs = {};
    store.__used_txs[txHash] = {
        ref,
        used_at: Date.now()
    };
    flush();
}
export function getPaymentStats() {
    let quoted = 0;
    let paid = 0;
    let consumed = 0;
    let expired = 0;
    for (const [key, value] of Object.entries(store)) {
        if (key.startsWith("__"))
            continue;
        const rec = value;
        if (rec.status === "quoted")
            quoted++;
        else if (rec.status === "paid")
            paid++;
        else if (rec.status === "consumed")
            consumed++;
        else if (rec.status === "expired")
            expired++;
    }
    const used_txs = Object.keys(store.__used_txs || {}).length;
    return {
        quoted,
        paid,
        consumed,
        expired,
        used_txs,
        total_payment_references: quoted + paid + consumed + expired
    };
}
