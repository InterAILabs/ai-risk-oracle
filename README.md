# InterAI Risk Oracle

A prepaid AI-to-AI verification primitive.

This service allows autonomous systems and developers to:

* evaluate response consistency
* estimate hallucination risk
* take safer downstream actions
* pay per request using a prepaid balance

---

## Core Model

The system operates on:

account → balance → API key → usage → billing

Each request:

* consumes balance
* returns risk + consistency metrics
* is idempotent-safe

---

## Quickstart (2 minutes)

### 1. Create an account

```bash
curl -X POST https://ai-risk-oracle.fly.dev/accounts/create \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN" \
  -d '{"account_id":"acct_example","name":"Example"}'
```

---

### 2. Create an API key

```bash
curl -X POST https://ai-risk-oracle.fly.dev/accounts/acct_example/api-keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN" \
  -d '{"name":"main-key"}'
```

Save the returned API key.

---

### 3. Create a top-up request

```bash
curl -X POST https://ai-risk-oracle.fly.dev/topup/create \
  -H "Content-Type: application/json" \
  -d '{
    "account_id":"acct_example",
    "amount_usdc":"0.01"
  }'
```

Response:

```json
{
  "topup_id": "...",
  "amount": "0.01",
  "pay_to": "0x...",
  "chain": "base"
}
```

---

### 4. Send USDC

From your wallet:

* network: Base
* token: USDC
* amount: exact match
* destination: `pay_to`

---

### 5. Confirm payment

```bash
curl -X POST https://ai-risk-oracle.fly.dev/topup/confirm \
  -H "X-Topup-Id: YOUR_TOPUP_ID" \
  -H "X-Tx-Hash: YOUR_TX_HASH"
```

---

### 6. Verify a response

```bash
curl -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"What is the capital of France?",
    "response":"Paris is the capital of France."
  }'
```

---

## Idempotency

Use:

```
X-Idempotency-Key
```

Same request + same key → no double charge.

---

## Billing

* currency: USDC
* unit: microusdc
* model: prepaid balance
* default verify cost: 0.0006 USDC

---

## Endpoints

| Endpoint            | Description             |
| ------------------- | ----------------------- |
| POST /verify        | Single verification     |
| POST /verify/batch  | Batch verification      |
| POST /topup/create  | Generate payment        |
| POST /topup/confirm | Confirm onchain payment |
| GET /me             | Account + balance       |

---

## Design Goal

To act as a reusable economic primitive for AI-to-AI systems:

* composable
* autonomous
* payment-aware
* trust-aware

---

## Status

Early production-ready.

Stable core:

* account + balance
* API keys
* onchain top-up
* idempotent billing

---

## License

TBD
