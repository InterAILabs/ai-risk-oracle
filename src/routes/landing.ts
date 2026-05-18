import { FastifyPluginAsync, FastifyRequest } from "fastify"

import { trackDiscoveryEvent } from "../lib/discovery.js"
import { buildPublicPricing, getTrialOffer, isEnabled } from "../lib/publicMeta.js"
import { isReceiptSigningEnabled } from "../lib/signing.js"

function baseUrlFromRequest(req: FastifyRequest) {
  const host = String(req.headers.host || "localhost:3000")
  const forwardedProto = req.headers["x-forwarded-proto"]
  const proto =
    forwardedProto
      ? String(forwardedProto)
      : host.includes("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https"

  return `${proto}://${host}`
}

function serviceSummary(baseUrl: string) {
  return {
    name: "AI Risk Oracle",
    status: "ok",
    version: "0.0.1",

    auth: {
      primary: {
        type: "Bearer API key",
        header: "Authorization: Bearer <api_key>"
      },
      legacy: {
        type: "X-Payment-Ref"
      }
    },

    endpoints: {
      onboard: "POST /onboard",
      verify: "POST /verify",
      verify_batch: "POST /verify/batch",
      a2a: "POST /a2a",
      agent_card: "GET /.well-known/agent.json",
      discovery_bundle: "GET /.well-known/discovery-bundle.json",
      mcp: "POST /mcp",
      pricing: "GET /pricing",
      trust_receipts: "GET /trust/receipts",
      trust_reputation: "GET /trust/reputation",
      trust_receipt_get: "GET /trust/receipts/:receiptId",
      trust_verify_signature: "POST /trust/verify-signature",
      schemas: "GET /schemas/*.json",
      me: "GET /me",
      topup_create: "POST /topup/create",
      topup_confirm: "POST /topup/confirm",
      topup_status: "GET /topup/:topupId",
      ...(isEnabled(process.env.DEV_TOPUP_ENABLED, "false")
        ? { topup_dev_credit: "POST /topup/dev/credit" }
        : {}),
      health: "GET /health",
      ready: "GET /ready"
    },

    billing: {
      model: "prepaid_balance_per_request",
      default_cost_usdc: "0.0006",
      recommended_topup_usdc: process.env.DEFAULT_RECOMMENDED_TOPUP_USDC || "0.01",
      idempotency_header: "X-Idempotency-Key",
      pricing_url: "/pricing",
      trial: getTrialOffer()
    },

    docs: {
      openapi: "/.well-known/openapi.json",
      service: "/.well-known/ai-service.json",
      pricing: "/pricing"
    },

    trust: {
      receipts: true,
      signature_verification: true,
      signing_enabled: isReceiptSigningEnabled()
    },
    machine_ready: {
      pricing: buildPublicPricing(baseUrl)
    }
  }
}

function landingHtml(baseUrl: string) {
  const verifyCurl = `curl -X POST ${baseUrl}/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Idempotency-Key: demo-1" \\
  -d '{"prompt":"What is the capital of France?","response":"Paris","domain":"general"}'`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="InterAI Risk Oracle verifies AI responses, estimates hallucination risk, and issues machine-readable trust receipts for autonomous agents.">
  <title>InterAI Risk Oracle</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0c0f14;
      --panel: #151a22;
      --panel-soft: #101821;
      --ink: #eef4f8;
      --muted: #a8b5bf;
      --line: #27313d;
      --blue: #6bb7ff;
      --green: #77d69f;
      --amber: #ffc66d;
      --red: #ff7f7f;
      --shadow: rgba(0, 0, 0, 0.35);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 20% 0%, rgba(107, 183, 255, 0.18), transparent 34rem),
        linear-gradient(180deg, #0c0f14 0%, #10141b 48%, #0c0f14 100%);
      color: var(--ink);
    }
    a { color: inherit; text-decoration: none; }
    .page { min-height: 100vh; }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      max-width: 1180px;
      margin: 0 auto;
      padding: 1.1rem 1.25rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      font-weight: 700;
    }
    .mark {
      width: 2.2rem;
      height: 2.2rem;
      border: 1px solid rgba(119, 214, 159, 0.65);
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, rgba(119, 214, 159, 0.18), rgba(107, 183, 255, 0.16));
      border-radius: 8px;
      box-shadow: 0 10px 30px var(--shadow);
    }
    .mark::before {
      content: "";
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      border: 2px solid var(--green);
      border-top-color: var(--blue);
    }
    .nav-links {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .nav-links a, .button {
      border: 1px solid var(--line);
      background: rgba(21, 26, 34, 0.72);
      padding: 0.58rem 0.8rem;
      border-radius: 7px;
      color: var(--ink);
      font-size: 0.9rem;
      line-height: 1;
    }
    .nav-links a:hover, .button:hover { border-color: rgba(107, 183, 255, 0.75); }
    .hero {
      max-width: 1180px;
      margin: 0 auto;
      padding: 5.5rem 1.25rem 3.5rem;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(22rem, 30rem);
      gap: 3rem;
      align-items: center;
    }
    .eyebrow {
      color: var(--green);
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
      margin: 0 0 0.9rem;
    }
    h1 {
      font-size: clamp(3.2rem, 8vw, 6.8rem);
      line-height: 0.92;
      letter-spacing: 0;
      margin: 0;
      max-width: 11ch;
    }
    .lead {
      margin: 1.35rem 0 0;
      max-width: 46rem;
      color: var(--muted);
      font-size: 1.18rem;
      line-height: 1.7;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      margin-top: 1.75rem;
    }
    .primary {
      border-color: rgba(119, 214, 159, 0.75);
      background: #d7ffe4;
      color: #07130d;
      font-weight: 800;
    }
    .terminal {
      border: 1px solid var(--line);
      background: rgba(12, 15, 20, 0.78);
      box-shadow: 0 22px 60px var(--shadow);
      border-radius: 8px;
      overflow: hidden;
    }
    .terminal-bar {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.75rem;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.03);
    }
    .dot { width: 0.62rem; height: 0.62rem; border-radius: 999px; }
    .dot.red { background: var(--red); }
    .dot.amber { background: var(--amber); }
    .dot.green { background: var(--green); }
    pre {
      margin: 0;
      padding: 1.05rem;
      color: #dce8ef;
      overflow: auto;
      white-space: pre-wrap;
      font-size: 0.84rem;
      line-height: 1.55;
    }
    .ok { color: var(--green); }
    .blue { color: var(--blue); }
    .main {
      border-top: 1px solid var(--line);
      background: rgba(12, 15, 20, 0.72);
    }
    .section {
      max-width: 1180px;
      margin: 0 auto;
      padding: 3rem 1.25rem;
    }
    .section h2 {
      margin: 0 0 1.2rem;
      font-size: 1.55rem;
      letter-spacing: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.85rem;
    }
    .card {
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(21, 26, 34, 0.96), rgba(16, 24, 33, 0.96));
      border-radius: 8px;
      padding: 1rem;
      min-height: 9rem;
    }
    .card h3 {
      margin: 0 0 0.55rem;
      font-size: 1rem;
      letter-spacing: 0;
    }
    .card p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
      font-size: 0.94rem;
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
      gap: 1rem;
      align-items: stretch;
    }
    .links {
      display: grid;
      gap: 0.6rem;
    }
    .link-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 0.8rem 0.9rem;
      color: var(--muted);
    }
    .link-row strong { color: var(--ink); font-weight: 650; }
    .link-row[aria-disabled="true"] { cursor: default; }
    code {
      color: #dce8ef;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.88em;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.85rem;
    }
    .metric {
      border-top: 1px solid var(--line);
      padding-top: 0.9rem;
    }
    .metric b {
      display: block;
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .metric span { color: var(--muted); font-size: 0.92rem; }
    .footer {
      border-top: 1px solid var(--line);
      color: var(--muted);
      padding: 1.4rem 1.25rem 2rem;
      text-align: center;
    }
    @media (max-width: 860px) {
      .hero, .split { grid-template-columns: 1fr; }
      .hero { padding-top: 3rem; }
      .grid, .metrics { grid-template-columns: 1fr; }
      .nav { align-items: flex-start; flex-direction: column; }
      .nav-links { justify-content: flex-start; }
      h1 { font-size: 3.3rem; }
    }
  </style>
</head>
<body>
  <div class="page">
    <nav class="nav" aria-label="Primary">
      <a class="brand" href="/">
        <span class="mark" aria-hidden="true"></span>
        <span>InterAI Risk Oracle</span>
      </a>
      <div class="nav-links">
        <a href="/.well-known/openapi.json">OpenAPI</a>
        <a href="/.well-known/agent.json">A2A Card</a>
        <a href="/.well-known/discovery-bundle.json">Discovery</a>
        <a href="/pricing">Pricing</a>
      </div>
    </nav>

    <header class="hero">
      <div>
        <p class="eyebrow">Trust infrastructure for autonomous agents</p>
        <h1>InterAI Risk Oracle</h1>
        <p class="lead">
          Verify AI responses before agents act on them. Score consistency, estimate hallucination risk,
          bill per request with prepaid Base USDC, and issue signed trust receipts for downstream audit.
        </p>
        <div class="actions">
          <a class="button primary" href="/.well-known/openapi.json">View API contract</a>
          <a class="button" href="/.well-known/ai-service.json">Inspect service JSON</a>
          <a class="button" href="/health">Check health</a>
        </div>
      </div>
      <div class="terminal" aria-label="Verification result sample">
        <div class="terminal-bar">
          <span class="dot red"></span>
          <span class="dot amber"></span>
          <span class="dot green"></span>
        </div>
        <pre><span class="blue">POST</span> /verify
{
  "trust_score": <span class="ok">0.94</span>,
  "risk_level": "low",
  "recommended_action": "accept",
  "billing": {
    "cost_usdc": "0.0006",
    "idempotent": true
  },
  "trust_receipt": {
    "signature_alg": "hmac-sha256",
    "receipt_id": "tr_..."
  }
}</pre>
      </div>
    </header>

    <main class="main">
      <section class="section">
        <div class="grid">
          <article class="card">
            <h3>Preflight verification</h3>
            <p>Submit a prompt and generated answer, then receive consistency, risk, confidence, and action guidance before another system executes it.</p>
          </article>
          <article class="card">
            <h3>Machine-readable trust</h3>
            <p>Each paid verification can produce a receipt with canonical fields, schema links, signature metadata, and public lookup support.</p>
          </article>
          <article class="card">
            <h3>A2A and MCP ready</h3>
            <p>Expose the same primitive through HTTP, A2A JSON-RPC, and MCP tools/resources so agents can discover and use it directly.</p>
          </article>
        </div>
      </section>

      <section class="section split">
        <div>
          <h2>Fast Integration</h2>
          <div class="links">
            <div class="link-row" aria-disabled="true"><strong>1. Onboard</strong><code>POST /onboard</code></div>
            <a class="link-row" href="/pricing"><strong>2. Fund</strong><code>GET /pricing</code></a>
            <a class="link-row" href="/.well-known/openapi.json"><strong>3. Verify</strong><code>POST /verify</code></a>
            <a class="link-row" href="/.well-known/agent.json"><strong>4. Automate</strong><code>POST /a2a</code></a>
          </div>
        </div>
        <div class="terminal" aria-label="curl example">
          <div class="terminal-bar">
            <span class="dot red"></span>
            <span class="dot amber"></span>
            <span class="dot green"></span>
          </div>
          <pre>${verifyCurl}</pre>
        </div>
      </section>

      <section class="section">
        <h2>Public Contracts</h2>
        <div class="grid">
          <a class="card" href="/.well-known/ai-service.json">
            <h3>Service descriptor</h3>
            <p><code>/.well-known/ai-service.json</code></p>
          </a>
          <a class="card" href="/.well-known/discovery-bundle.json">
            <h3>Discovery bundle</h3>
            <p><code>/.well-known/discovery-bundle.json</code></p>
          </a>
          <a class="card" href="/.well-known/openapi.json">
            <h3>OpenAPI schema</h3>
            <p><code>/.well-known/openapi.json</code></p>
          </a>
        </div>
      </section>

      <section class="section">
        <div class="metrics">
          <div class="metric"><b>0.0006</b><span>USDC per verify by default</span></div>
          <div class="metric"><b>100</b><span>items per batch request</span></div>
          <div class="metric"><b>Base</b><span>USDC prepaid balance</span></div>
          <div class="metric"><b>HMAC</b><span>signed receipt verification</span></div>
        </div>
      </section>
    </main>

    <footer class="footer">
      InterAI Risk Oracle exposes public discovery, pricing, health, A2A, MCP, schemas, and trust receipt contracts.
    </footer>
  </div>
</body>
</html>`
}

export const landingRoute: FastifyPluginAsync = async (app) => {
  app.get("/", async (req, reply) => {
    trackDiscoveryEvent(req, "landing_view", "/")
    reply.type("text/html; charset=utf-8")
    return landingHtml(baseUrlFromRequest(req))
  })

  app.get("/favicon.ico", async (_req, reply) => {
    reply.code(204)
    return ""
  })

  app.get("/service.json", async (req) => {
    trackDiscoveryEvent(req, "service_summary_view", "/service.json")
    return serviceSummary(baseUrlFromRequest(req))
  })
}
