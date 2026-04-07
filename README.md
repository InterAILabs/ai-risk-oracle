# InterAI Risk Oracle

AI response risk/consistency oracle with prepaid balance billing for autonomous agents.

## Fastest path

### 1. Onboard

```bash
curl -X POST http://localhost:3000/onboard \
  -H "Content-Type: application/json" \
  -d '{"name":"demo-agent"}'

This returns:

account
api_key
funding instructions
ready-to-run curl examples
2. Check account
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_API_KEY"
3. Create a top-up intent
curl -X POST http://localhost:3000/topup/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"0.01"}'
4. Confirm top-up
curl -X POST http://localhost:3000/topup/confirm \
  -H "X-Topup-Id: YOUR_TOPUP_ID" \
  -H "X-Tx-Hash: YOUR_BASE_USDC_TX_HASH"
5. Verify a response
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Idempotency-Key: demo-1" \
  -d '{"prompt":"What is the capital of France?","response":"Paris","domain":"general"}'
Notes
Primary integration path is Bearer API key auth.
Legacy quote / pay / verify is still available for compatibility.
Billing is prepaid and debited automatically per request.

---