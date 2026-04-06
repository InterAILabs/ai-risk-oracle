import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.resolve("./payments.db");

console.log("Intentando abrir:", dbPath);
console.log("Existe:", fs.existsSync(dbPath));

const db = new Database(dbPath, { readonly: true });

console.log("\n=== ACCOUNTS ===");
const accounts = db.prepare(`
  SELECT id, name, status, created_at
  FROM accounts
  ORDER BY created_at DESC
`).all();
console.log(accounts);

console.log("\n=== API KEYS ===");
const apiKeys = db.prepare(`
  SELECT id, account_id, name, key_prefix, status, created_at, last_used_at
  FROM api_keys
  ORDER BY created_at DESC
`).all();
console.log(apiKeys);

console.log("\n=== BALANCES ===");
const balances = db.prepare(`
  SELECT account_id, balance_microusdc, updated_at
  FROM balances
  ORDER BY updated_at DESC
`).all();
console.log(balances);