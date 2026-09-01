import { NextRequest } from "next/server";

export function generateCanonicalRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function getRequestContext(req: NextRequest) {
  const requestId = generateCanonicalRequestId();
  const rawClientCorrId =
    req.headers.get("x-correlation-id") || req.headers.get("x-request-id") || "";
  const clientCorrelationId = /^[a-zA-Z0-9_-]{1,64}$/.test(rawClientCorrId)
    ? rawClientCorrId
    : undefined;

  // Cloudflare authenticated edge header is authoritative in production
  const cfIp = req.headers.get("cf-connecting-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientIp = cfIp || (forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1");
  const userAgent = req.headers.get("user-agent") || "unknown";

  return { requestId, clientCorrelationId, clientIp, userAgent };
}
