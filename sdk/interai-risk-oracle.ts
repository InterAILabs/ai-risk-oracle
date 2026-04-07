export type VerifyInput = {
  prompt: string
  response: string
  domain?: string
}

export type BatchVerifyInput = {
  items: VerifyInput[]
}

export type OracleClientOptions = {
  baseUrl: string
  apiKey?: string
}

export class InterAIRiskOracleClient {
  baseUrl: string
  apiKey?: string

  constructor(options: OracleClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.apiKey = options.apiKey
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  private buildHeaders(extra?: Record<string, string>) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(extra || {})
    }

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  async onboard(input?: {
    account_id?: string
    name?: string
    api_key_name?: string
    recommended_topup_usdc?: string
  }) {
    const r = await fetch(`${this.baseUrl}/onboard`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input || {})
    })

    const txt = await r.text()
    let j: any
    try {
      j = JSON.parse(txt)
    } catch {
      j = { raw: txt }
    }

    if (!r.ok) {
      throw new Error(`onboard failed: ${r.status} ${JSON.stringify(j)}`)
    }

    if (j?.api_key) {
      this.apiKey = j.api_key
    }

    return j
  }

  async me() {
    const r = await fetch(`${this.baseUrl}/me`, {
      method: "GET",
      headers: this.buildHeaders()
    })

    const txt = await r.text()
    let j: any
    try {
      j = JSON.parse(txt)
    } catch {
      j = { raw: txt }
    }

    if (!r.ok) {
      throw new Error(`me failed: ${r.status} ${JSON.stringify(j)}`)
    }

    return j
  }

  async createTopup(amountUsdc = "0.01") {
    const r = await fetch(`${this.baseUrl}/topup/create`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({ amount_usdc: amountUsdc })
    })

    const txt = await r.text()
    let j: any
    try {
      j = JSON.parse(txt)
    } catch {
      j = { raw: txt }
    }

    if (!r.ok) {
      throw new Error(`createTopup failed: ${r.status} ${JSON.stringify(j)}`)
    }

    return j
  }

  async devCredit(amountUsdc = "0.01") {
    const r = await fetch(`${this.baseUrl}/topup/dev/credit`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({ amount_usdc: amountUsdc })
    })

    const txt = await r.text()
    let j: any
    try {
      j = JSON.parse(txt)
    } catch {
      j = { raw: txt }
    }

    if (!r.ok) {
      throw new Error(`devCredit failed: ${r.status} ${JSON.stringify(j)}`)
    }

    return j
  }

  async confirmTopup(topupId: string, txHash: string) {
    const r = await fetch(`${this.baseUrl}/topup/confirm`, {
      method: "POST",
      headers: {
        "X-Topup-Id": topupId,
        "X-Tx-Hash": txHash
      }
    })

    const txt = await r.text()
    let j: any
    try {
      j = JSON.parse(txt)
    } catch {
      j = { raw: txt }
    }

    if (!r.ok) {
      throw new Error(`confirmTopup failed: ${r.status} ${JSON.stringify(j)}`)
    }

    return j
  }

  async verify(input: VerifyInput, idempotencyKey?: string) {
    const headers = this.buildHeaders()

    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey
    }

    const r = await fetch(`${this.baseUrl}/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: input.prompt,
        response: input.response,
        domain: input.domain ?? "general"
      })
    })

    const txt = await r.text()
    let j: any
    try {
      j = JSON.parse(txt)
    } catch {
      j = { raw: txt }
    }

    if (!r.ok) {
      throw new Error(`verify failed: ${r.status} ${JSON.stringify(j)}`)
    }

    return j
  }

  async verifyBatch(input: BatchVerifyInput, idempotencyKey?: string) {
    const headers = this.buildHeaders()

    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey
    }

    const r = await fetch(`${this.baseUrl}/verify/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: input.items.map((item) => ({
          prompt: item.prompt,
          response: item.response,
          domain: item.domain ?? "general"
        }))
      })
    })

    const txt = await r.text()
    let j: any
    try {
      j = JSON.parse(txt)
    } catch {
      j = { raw: txt }
    }

    if (!r.ok) {
      throw new Error(`verifyBatch failed: ${r.status} ${JSON.stringify(j)}`)
    }

    return j
  }
}