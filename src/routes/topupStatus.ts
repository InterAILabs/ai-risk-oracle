import { FastifyPluginAsync } from "fastify"
import { getTopup } from "../payments/fileStore.js"

export const topupStatusRoute: FastifyPluginAsync = async (app) => {
  app.get("/topup/:topupId", async (req, reply) => {
    const params = req.params as any
    const topupId = String(params.topupId)
    const topup = getTopup(topupId)

    if (!topup) {
      return reply.code(404).send({ error: "topup_not_found" })
    }

    return {
      ok: true,
      topup
    }
  })
}