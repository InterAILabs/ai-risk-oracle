import { FastifyPluginAsync } from "fastify"

const TRUST_RECEIPT_SCHEMA_ID = "https://ai-risk-oracle/schemas/trust-receipt.json"
const TRUST_RECEIPT_PUBLIC_SCHEMA_ID =
  "https://ai-risk-oracle/schemas/trust-receipt-public.json"
const VERIFY_RESULT_SCHEMA_ID = "https://ai-risk-oracle/schemas/verify-result.json"

const decisionBasisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["dominant_negatives", "dominant_positives"],
  properties: {
    dominant_negatives: {
      type: "array",
      items: { type: "string" }
    },
    dominant_positives: {
      type: "array",
      items: { type: "string" }
    }
  }
} as const

const trustReceiptSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: TRUST_RECEIPT_SCHEMA_ID,
  title: "AI Risk Oracle Trust Receipt",
  type: "object",
  additionalProperties: false,
  required: [
    "receipt_id",
    "issued_at",
    "oracle_version",
    "signals_version",
    "request_hash",
    "verdict",
    "confidence",
    "risk_level",
    "confidence_band",
    "risk_factors",
    "claims_checked",
    "claims_supported",
    "claims_uncertain",
    "decision_basis"
  ],
  properties: {
    receipt_id: { type: "string" },
    issued_at: { type: "string", format: "date-time" },
    oracle_version: { type: "string" },
    signals_version: { type: "string" },
    request_hash: { type: "string" },
    verdict: { type: "string", enum: ["accept", "review", "reject"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    risk_level: { type: "string", enum: ["low", "medium", "high"] },
    confidence_band: { type: "string", enum: ["low", "medium", "high"] },
    risk_factors: {
      type: "array",
      items: { type: "string" }
    },
    claims_checked: { type: "integer", minimum: 0 },
    claims_supported: { type: "integer", minimum: 0 },
    claims_uncertain: { type: "integer", minimum: 0 },
    decision_basis: decisionBasisSchema
  }
} as const

const trustReceiptWithSignatureSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    ...trustReceiptSchema.required,
    "signature",
    "signature_alg",
    "signed"
  ],
  properties: {
    ...trustReceiptSchema.properties,
    signature: { type: ["string", "null"] },
    signature_alg: { type: ["string", "null"] },
    signed: { type: "boolean" }
  }
} as const

const trustSignalsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "semantic_relevance",
    "contradiction_risk",
    "unsupported_specificity",
    "numeric_consistency",
    "overconfidence"
  ],
  properties: {
    semantic_relevance: { type: "number", minimum: 0, maximum: 1 },
    contradiction_risk: { type: "number", minimum: 0, maximum: 1 },
    unsupported_specificity: { type: "number", minimum: 0, maximum: 1 },
    numeric_consistency: { type: "number", minimum: 0, maximum: 1 },
    overconfidence: { type: "number", minimum: 0, maximum: 1 }
  }
} as const

const historicalContextSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "available",
    "scope",
    "domain",
    "sample_size",
    "average_trust_score",
    "min_trust_score",
    "max_trust_score",
    "high_risk_count",
    "medium_risk_count",
    "low_risk_count",
    "high_risk_rate",
    "latest_receipt_at",
    "prior_to_current"
  ],
  properties: {
    available: { type: "boolean" },
    scope: {
      type: "string",
      enum: ["account_domain", "none"]
    },
    domain: { type: "string" },
    sample_size: { type: "integer", minimum: 0 },
    average_trust_score: { type: ["number", "null"], minimum: 0, maximum: 1 },
    min_trust_score: { type: ["number", "null"], minimum: 0, maximum: 1 },
    max_trust_score: { type: ["number", "null"], minimum: 0, maximum: 1 },
    high_risk_count: { type: "integer", minimum: 0 },
    medium_risk_count: { type: "integer", minimum: 0 },
    low_risk_count: { type: "integer", minimum: 0 },
    high_risk_rate: { type: ["number", "null"], minimum: 0, maximum: 1 },
    latest_receipt_at: { type: ["string", "null"], format: "date-time" },
    prior_to_current: { type: "boolean", const: true },
    reason: {
      type: "string",
      enum: ["account_history_unavailable", "insufficient_history"]
    }
  }
} as const

export const schemasRoute: FastifyPluginAsync = async (app) => {
  app.get("/schemas/trust-receipt.json", async () => trustReceiptSchema)

  app.get("/schemas/trust-receipt-public.json", async () => {
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: TRUST_RECEIPT_PUBLIC_SCHEMA_ID,
      title: "AI Risk Oracle Public Trust Receipt Lookup",
      type: "object",
      additionalProperties: false,
      required: ["ok", "receipt", "verification", "trust"],
      properties: {
        ok: { type: "boolean", const: true },
        receipt: { $ref: TRUST_RECEIPT_SCHEMA_ID },
        verification: {
          type: "object",
          additionalProperties: false,
          required: ["signed", "signature", "signature_alg"],
          properties: {
            signed: { type: "boolean" },
            signature: { type: ["string", "null"] },
            signature_alg: { type: ["string", "null"] }
          }
        },
        trust: {
          type: "object",
          additionalProperties: false,
          required: [
            "domain",
            "trust_score",
            "risk_level",
            "verdict",
            "risk_factors",
            "confidence_band"
          ],
          properties: {
            domain: { type: "string" },
            trust_score: { type: "number", minimum: 0, maximum: 1 },
            risk_level: {
              type: "string",
              enum: ["low", "medium", "high"]
            },
            verdict: {
              type: "string",
              enum: ["accept", "review", "reject"]
            },
            risk_factors: {
              type: "array",
              items: { type: "string" }
            },
            confidence_band: {
              type: "string",
              enum: ["low", "medium", "high"]
            }
          }
        }
      }
    }
  })

  app.get("/schemas/verify-result.json", async () => {
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: VERIFY_RESULT_SCHEMA_ID,
      title: "AI Risk Oracle Verify Result",
      type: "object",
      additionalProperties: false,
      required: [
        "consistency_score",
        "hallucination_risk",
        "risk_level",
        "recommended_action",
        "analysis",
        "verdict",
        "trust_score",
        "trust_recommended_action",
        "confidence_band",
        "risk_factors",
        "claims_checked",
        "claims_supported",
        "claims_uncertain",
        "signals",
        "historical_context",
        "trust_receipt",
        "oracle"
      ],
      properties: {
        consistency_score: { type: "number", minimum: 0, maximum: 1 },
        hallucination_risk: { type: "number", minimum: 0, maximum: 1 },
        risk_level: {
          type: "string",
          enum: ["low", "medium", "high"]
        },
        recommended_action: {
          type: "string",
          enum: ["accept", "review", "reject"]
        },
        analysis: {
          type: "object",
          additionalProperties: false,
          required: [
            "prompt_response_alignment",
            "prompt_response_alignment_adjusted",
            "contradictions_detected",
            "numerical_conflicts",
            "absolute_claims",
            "latency_ms",
            "engine_latency_ms",
            "total_latency_ms",
            "engine_version"
          ],
          properties: {
            prompt_response_alignment: {
              type: "number",
              minimum: 0,
              maximum: 1
            },
            prompt_response_alignment_adjusted: {
              type: "number",
              minimum: 0,
              maximum: 1
            },
            contradictions_detected: { type: "boolean" },
            numerical_conflicts: { type: "boolean" },
            absolute_claims: { type: "integer", minimum: 0 },
            latency_ms: { type: "integer", minimum: 0 },
            engine_latency_ms: { type: "integer", minimum: 0 },
            total_latency_ms: { type: "integer", minimum: 0 },
            engine_version: { type: "string" }
          }
        },
        trust_score: { type: "number", minimum: 0, maximum: 1 },
        verdict: {
          type: "string",
          enum: ["accept", "review", "reject"]
        },
        trust_recommended_action: {
          type: "string",
          enum: ["accept", "review", "reject"]
        },
        confidence_band: {
          type: "string",
          enum: ["low", "medium", "high"]
        },
        risk_factors: {
          type: "array",
          items: { type: "string" }
        },
        claims_checked: { type: "integer", minimum: 0 },
        claims_supported: { type: "integer", minimum: 0 },
        claims_uncertain: { type: "integer", minimum: 0 },
        signals: trustSignalsSchema,
        historical_context: historicalContextSchema,
        trust_receipt: trustReceiptWithSignatureSchema,
        oracle: {
          type: "object",
          additionalProperties: false,
          required: ["version", "signals_version", "trust_signing_enabled"],
          properties: {
            version: { type: "string" },
            signals_version: { type: "string" },
            trust_signing_enabled: { type: "boolean" }
          }
        }
      }
    }
  })
}
