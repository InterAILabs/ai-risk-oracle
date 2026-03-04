import fs from "fs";
import path from "path";
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "payments.json");
let store = {};
function ensureStore() {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) {
        fs.writeFileSync(FILE, JSON.stringify({}));
    }
    const raw = fs.readFileSync(FILE, "utf8");
    store = raw ? JSON.parse(raw) : {};
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
export function markPaid(ref) {
    const rec = store[ref];
    if (!rec)
        return false;
    rec.status = "paid";
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
    flush();
    return true;
}
export function getPayment(ref) {
    const rec = store[ref];
    if (!rec)
        return null;
    if (Date.now() > rec.expires_at && rec.status === "quoted") {
        rec.status = "expired";
        flush();
    }
    return rec;
}
