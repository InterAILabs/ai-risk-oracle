const API = "https://ai-risk-oracle.fly.dev"

async function main() {
  const health = await fetch(`${API}/health`).then(r => r.json())
  if (!health.ok) throw new Error("health failed")

  const stats = await fetch(`${API}/stats`).then(r => r.json())
  if (!stats.ok) throw new Error("stats failed")

  const openapi = await fetch(`${API}/.well-known/openapi.json`).then(r => r.json())
  if (!openapi.openapi) throw new Error("openapi failed")

  const discovery = await fetch(`${API}/.well-known/ai-service.json`).then(r => r.json())
  if (!discovery.id) throw new Error("ai-service failed")

  console.log("SMOKE TEST OK")
}

main().catch(err => {
  console.error("SMOKE TEST FAILED")
  console.error(err)
  process.exit(1)
})