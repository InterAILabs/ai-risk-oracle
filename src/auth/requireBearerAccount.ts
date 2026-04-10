import { FastifyReply, FastifyRequest } from "fastify"
import { getApiKeyByRaw } from "../payments/fileStore.js"

type AuthenticatedAccount = {
  api_key_id: string
  account_id: string
  key_name: string
  key_prefix: string
}

function extractBearerToken(authHeader: string | undefined) {
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(" ")

  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null

  const normalized = token.trim()
  return normalized.length > 0 ? normalized : null
}

export function requireBearerAccount(req: FastifyRequest, reply: FastifyReply): AuthenticatedAccount | null {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    reply.code(401).send({ error: "missing_bearer_token" })
    return null
  }

  const apiKey = getApiKeyByRaw(token)

  if (!apiKey || apiKey.status !== "active") {
    reply.code(401).send({ error: "invalid_api_key" })
    return null
  }

  return {
    api_key_id: apiKey.id,
    account_id: apiKey.account_id,
    key_name: apiKey.name,
    key_prefix: apiKey.key_prefix
  }
}