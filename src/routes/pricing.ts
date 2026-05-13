import { FastifyPluginAsync } from "fastify"
import { buildPublicPricing } from "../lib/publicMeta.js"
import { trackDiscoveryEvent } from "../lib/discovery.js"

export const pricingRoute: FastifyPluginAsync = async (app) => {
  app.get("/pricing", async (req) => {
    trackDiscoveryEvent(req, "pricing_view", "/pricing")
    const host = String(req.headers.host || "localhost:3000")
    const forwardedProto = req.headers["x-forwarded-proto"]
    const proto =
      forwardedProto
        ? String(forwardedProto)
        : host.includes("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https"
    const baseUrl = `${proto}://${host}`

    return {
      ok: true,
      service: "ai-risk-oracle",
      version: "0.0.1",
      pricing: buildPublicPricing(baseUrl)
    }
  })
}
