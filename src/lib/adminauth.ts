import { FastifyReply, FastifyRequest } from "fastify"

export function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const expected = process.env.ADMIN_TOKEN

  if (!expected) {
    reply.code(500).send({ error: "admin_token_not_configured" })
    return false
  }

  const provided = req.headers["x-admin-token"]

  if (provided !== expected) {
    reply.code(403).send({ error: "forbidden" })
    return false
  }

  return true
}