import {
  InterAIRiskOracleClient as BaseInterAIRiskOracleClient,
  type InterAIClientOptions,
  type OnboardResponse
} from "./index.js"

export * from "./index.js"

export const SDK_VERSION = "0.1.7-beta" as const

export type OnboardOptions = {
  name?: string
  account_id?: string
  api_key_name?: string
  recommended_topup_usdc?: string
  scope?: "standard" | "demo_trial"
}

/** Package-facing client with the complete builder onboarding surface. */
export class InterAIRiskOracleClient extends BaseInterAIRiskOracleClient {
  constructor(options: InterAIClientOptions) {
    super({
      ...options,
      clientName: options.clientName || `typescript-sdk/${SDK_VERSION}`
    })
  }

  override async onboard(input: OnboardOptions = {}): Promise<OnboardResponse> {
    return super.onboard(input)
  }
}
