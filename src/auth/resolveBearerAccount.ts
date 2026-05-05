import { FastifyReply, FastifyRequest } from "fastify"
import { getAccount, resolveAccountByApiKey } from "../payments/fileStore.js"
import { extractBearerToken } from "../lib/auth.js"
import { economicError } from "../lib/httpErrors.js"

type BearerResolutionOptions = {
  missingError?: string
  missingHint?: string
}

export function requireResolvedBearerAccount(
  req: FastifyRequest,
  reply: FastifyReply,
  options: BearerResolutionOptions = {}
) {
  const bearerToken = extractBearerToken(req.headers.authorization)

  if (!bearerToken) {
    reply.code(401).send(
      economicError(options.missingError ?? "missing_bearer_token", {
        hint: options.missingHint ?? "Provide Authorization: Bearer <api_key>"
      })
    )
    return null
  }

  const resolved = resolveAccountByApiKey(bearerToken)

  if (!resolved) {
    reply.code(401).send(economicError("invalid_api_key"))
    return null
  }

  return resolved
}

export function resolveAccountIdFromBodyOrBearer(params: {
  body: Record<string, unknown>
  req: FastifyRequest
  reply: FastifyReply
}) {
  let accountId = params.body?.account_id ? String(params.body.account_id) : ""

  if (!accountId) {
    const resolved = requireResolvedBearerAccount(params.req, params.reply)
    if (!resolved) return null
    accountId = resolved.account_id
  }

  const account = getAccount(accountId)

  if (!account) {
    params.reply.code(404).send(economicError("account_not_found"))
    return null
  }

  return {
    accountId,
    account
  }
}
