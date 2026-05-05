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

type RequestOptions = {
  method?: string
  path: string
  headers?: Record<string, string>
  body?: unknown
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
      ...(extra || {})
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    return headers
  }

  private async request<T = any>(options: RequestOptions): Promise<T> {
    const method = options.method || "GET"
    const hasBody = options.body !== undefined
    const headers = this.buildHeaders({
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...(options.headers || {})
    })

    const response = await fetch(`${this.baseUrl}${options.path}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined
    })

    const text = await response.text()
    let json: any

    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { raw: text }
    }

    if (!response.ok) {
      throw new Error(`${method} ${options.path} failed: ${response.status} ${JSON.stringify(json)}`)
    }

    return json as T
  }

  async getRoot() {
    return this.request({
      path: "/"
    })
  }

  async getOpenApi() {
    return this.request({
      path: "/.well-known/openapi.json"
    })
  }

  async getServiceDescriptor() {
    return this.request({
      path: "/.well-known/ai-service.json"
    })
  }

  async onboard(input?: {
    account_id?: string
    name?: string
    api_key_name?: string
    recommended_topup_usdc?: string
  }) {
    const result = await this.request({
      method: "POST",
      path: "/onboard",
      body: input || {}
    })

    if ((result as any)?.api_key) {
      this.apiKey = (result as any).api_key
    }

    return result
  }

  async me() {
    return this.request({
      path: "/me"
    })
  }

  async ledger(limit = 20) {
    return this.request({
      path: `/ledger?limit=${encodeURIComponent(String(limit))}`
    })
  }

  async usage(limit = 20) {
    return this.request({
      path: `/usage?limit=${encodeURIComponent(String(limit))}`
    })
  }

  async quote(input?: {
    service?: "verify"
    mode?: "fast" | "batch"
    items_count?: number
  }) {
    return this.request({
      method: "POST",
      path: "/quote",
      body: {
        service: input?.service ?? "verify",
        mode: input?.mode ?? "fast",
        ...(input?.items_count ? { items_count: input.items_count } : {})
      }
    })
  }

  async createTopup(amountUsdc = "0.01") {
    return this.request({
      method: "POST",
      path: "/topup/create",
      body: { amount_usdc: amountUsdc }
    })
  }

  async topupStatus(topupId: string) {
    return this.request({
      path: `/topup/${encodeURIComponent(topupId)}`
    })
  }

  async devCredit(amountUsdc = "0.01") {
    return this.request({
      method: "POST",
      path: "/topup/dev/credit",
      body: { amount_usdc: amountUsdc }
    })
  }

  async confirmTopup(topupId: string, txHash: string, fakeConfirm = false) {
    return this.request({
      method: "POST",
      path: "/topup/confirm",
      headers: {
        "X-Topup-Id": topupId,
        "X-Tx-Hash": txHash,
        ...(fakeConfirm ? { "X-Test-Confirm": "true" } : {})
      }
    })
  }

  async verify(input: VerifyInput, idempotencyKey?: string) {
    return this.request({
      method: "POST",
      path: "/verify",
      headers: idempotencyKey
        ? { "X-Idempotency-Key": idempotencyKey }
        : undefined,
      body: {
        prompt: input.prompt,
        response: input.response,
        domain: input.domain ?? "general"
      }
    })
  }

  async verifyBatch(input: BatchVerifyInput, idempotencyKey?: string) {
    return this.request({
      method: "POST",
      path: "/verify/batch",
      headers: idempotencyKey
        ? { "X-Idempotency-Key": idempotencyKey }
        : undefined,
      body: {
        items: input.items.map((item) => ({
          prompt: item.prompt,
          response: item.response,
          domain: item.domain ?? "general"
        }))
      }
    })
  }

  async trustReceipts(limit = 50) {
    return this.request({
      path: `/trust/receipts?limit=${encodeURIComponent(String(limit))}`
    })
  }

  async getTrustReceipt(receiptId: string) {
    return this.request({
      path: `/trust/receipts/${encodeURIComponent(receiptId)}`
    })
  }

  async verifyTrustReceiptSignature(input: {
    receipt: Record<string, unknown>
    signature: string
    signature_alg?: "hmac-sha256"
  }) {
    return this.request({
      method: "POST",
      path: "/trust/verify-signature",
      body: input
    })
  }
}
