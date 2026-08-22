import { NextRequest } from "next/server";
import crypto from "crypto";
import {
  decodeAndVerifyVisitorCookie,
  signBanToken,
  VISITOR_COOKIE_NAME,
} from "@/lib/visitors/cookie-manager";
import { extractGeoFromHeaders, extractClientIP } from "@/lib/visitors/geo-detector";
import { extractDeviceInfo, extractBrowserInfo } from "@/lib/visitors/device-detector";
import {
  upsertVisitor,
  createSession,
  closeSession,
} from "@/lib/visitors/visitor-repository";
import {
  publishVisitorEvent,
  subscribeToVisitorEvents,
} from "@/lib/visitors/event-bus";
import { getCachedBanStatus } from "@/lib/visitors/ban-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  const cookieVisitorId = decodeAndVerifyVisitorCookie(cookieValue);
  const machineHash =
    request.nextUrl.searchParams.get("mfp")?.trim() ||
    request.headers.get("x-machine-hash")?.trim() ||
    undefined;

  // If cookie is missing (e.g. Incognito), use candidate ID that upsertVisitor will resolve via machineHash
  let candidateVisitorId = cookieVisitorId;
  if (!candidateVisitorId) {
    candidateVisitorId = `vst_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  }

  // Check if already banned by visitor ID or by physical machine fingerprint
  const cachedBan =
    getCachedBanStatus(cookieVisitorId) || getCachedBanStatus(machineHash);
  const isBanned = cachedBan?.banned;

  const currentPath = request.nextUrl.searchParams.get("path") || "/";
  const referrer = request.headers.get("referer") || undefined;
  const userAgent = request.headers.get("user-agent") || "";
  const clientIP = extractClientIP(request.headers);
  const geo = extractGeoFromHeaders(request.headers);
  const device = extractDeviceInfo(userAgent, request.headers);
  const browser = extractBrowserInfo(userAgent, request.headers);

  const candidateSessionId =
    request.nextUrl.searchParams.get("ses")?.trim() ||
    request.headers.get("x-session-id")?.trim();

  const sessionId =
    candidateSessionId && candidateSessionId.startsWith("ses_") && candidateSessionId.length <= 48
      ? candidateSessionId
      : `ses_${crypto.randomBytes(8).toString("hex")}`;
  const now = Date.now();

  // Create SSE TransformStream
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendSSEMessage = async (data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream may be closed
    }
  };

  // Upsert Visitor and Create Session in Firestore
  const visitor = await upsertVisitor(candidateVisitorId, {
    currentPath,
    referrer,
    currentIP: clientIP,
    geo,
    device,
    browser,
    activeSessionId: sessionId,
    incrementPage: false,
    machineHash,
  });

  const canonicalVisitorId = visitor.id;

  await createSession({
    sessionId,
    visitorId: canonicalVisitorId,
    machineHash,
    connectedAt: now,
    currentPath,
    ip: clientIP,
    userAgent,
    online: true,
  });

  // Broadcast visitor connected event to Admin Dashboard
  publishVisitorEvent({
    type: "VISITOR_CONNECTED",
    visitorId: canonicalVisitorId,
    timestamp: now,
    visitor,
  });

  // Initial greeting & Ban check
  (async () => {
    if (isBanned || visitor.ban?.enabled) {
      const reason = cachedBan?.reason || visitor.ban?.reason || "Access permanently revoked";
      const banToken = signBanToken(canonicalVisitorId, reason);
      await sendSSEMessage({
        type: "BAN",
        visitorId: canonicalVisitorId,
        reason,
        banToken,
        timestamp: now,
      });
    } else {
      await sendSSEMessage({
        type: "CONNECTED",
        visitorId: canonicalVisitorId,
        sessionId,
        timestamp: now,
      });
    }
  })();

  // Keep-alive heartbeat interval (SSE comment)
  const heartbeatTimer = setInterval(() => {
    writer.write(encoder.encode(`: heartbeat\n\n`)).catch(() => {});
  }, 25000);

  // Subscribe to visitor-specific events (e.g. Remote BAN / UNBAN / DELETE)
  const unsubscribeBus = subscribeToVisitorEvents(canonicalVisitorId, async (event) => {
    if (event.type === "VISITOR_BANNED") {
      const reason = event.reason || "Access permanently revoked by administrator";
      const banToken = signBanToken(canonicalVisitorId, reason);
      await sendSSEMessage({
        type: "BAN",
        visitorId: canonicalVisitorId,
        reason,
        banToken,
        timestamp: event.timestamp,
      });
    } else if (event.type === "VISITOR_UNBANNED") {
      await sendSSEMessage({
        type: "UNBAN",
        visitorId: canonicalVisitorId,
        timestamp: event.timestamp,
      });
    } else if (event.type === "VISITOR_DELETED") {
      const reason = "Session invalidated";
      const banToken = signBanToken(canonicalVisitorId, reason);
      await sendSSEMessage({
        type: "BAN",
        visitorId: canonicalVisitorId,
        reason,
        banToken,
        timestamp: event.timestamp,
      });
    }
  });

  // Recycle stream after 45s to release file handles for clean Turbopack HMR and serverless execution
  const streamTimeout = setTimeout(async () => {
    clearInterval(heartbeatTimer);
    unsubscribeBus();
    try {
      await writer.close();
    } catch {
      // Ignored
    }
  }, 45000);

  // Handle Client Disconnect
  request.signal.addEventListener("abort", async () => {
    clearTimeout(streamTimeout);
    clearInterval(heartbeatTimer);
    unsubscribeBus();
    try {
      await closeSession(sessionId, canonicalVisitorId);
      await writer.close();
    } catch {
      // Already closed
    }
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
