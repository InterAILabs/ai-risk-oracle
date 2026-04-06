const Database = require("better-sqlite3");

const db = new Database("/app/data/payments.db", { readonly: true });

const accounts = db.prepare(`
  SELECT id, name, status, created_at
  FROM accounts
  ORDER BY created_at DESC
`).all();

const apiKeys = db.prepare(`
  SELECT id, account_id, name, key_prefix, status, created_at, last_used_at
  FROM api_keys
  ORDER BY created_at DESC
`).all();

const balances = db.prepare(`
  SELECT account_id, balance_microusdc, updated_at
  FROM balances
  ORDER BY updated_at DESC
`).all();

console.log("=== ACCOUNTS ===");
console.log(JSON.stringify(accounts, null, 2));

console.log("\n=== API_KEYS ===");
console.log(JSON.stringify(apiKeys, null, 2));

console.log("\n=== BALANCES ===");
console.log(JSON.stringify(balances, null, 2));