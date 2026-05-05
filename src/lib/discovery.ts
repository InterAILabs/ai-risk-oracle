import { FastifyRequest } from "fastify"
import { recordDiscoveryEvent } from "../payments/fileStore.js"

function clientHintFromRequest(req: FastifyRequest) {
  const forwardedFor = req.headers["x-forwarded-for"]
  const realIp = req.headers["x-real-ip"]

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || null
  }

  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim()
  }

  return req.ip || null
}

export function trackDiscoveryEvent(
  req: FastifyRequest,
  eventType: string,
  path: string
) {
  try {
    recordDiscoveryEvent({
      eventType,
      path,
      method: req.method,
      clientHint: clientHintFromRequest(req),
      userAgent:
        typeof req.headers["user-agent"] === "string"
          ? req.headers["user-agent"]
          : null
    })
  } catch {
    // Discovery telemetry should never break a public endpoint.
  }
}
