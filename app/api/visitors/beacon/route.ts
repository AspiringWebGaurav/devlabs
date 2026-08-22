import { NextRequest, NextResponse } from "next/server";
import {
  decodeAndVerifyVisitorCookie,
  encodeVisitorCookieValue,
  generateVisitorId,
  VISITOR_COOKIE_NAME,
  VISITOR_COOKIE_MAX_AGE,
} from "@/lib/visitors/cookie-manager";
import { BeaconPayloadSchema } from "@/lib/visitors/schemas";
import { upsertVisitor } from "@/lib/visitors/visitor-repository";
import { extractGeoFromHeaders, extractClientIP } from "@/lib/visitors/geo-detector";
import { extractDeviceInfo, extractBrowserInfo } from "@/lib/visitors/device-detector";
import { publishVisitorEvent } from "@/lib/visitors/event-bus";
import { getCachedBanStatus } from "@/lib/visitors/ban-cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    let visitorId = decodeAndVerifyVisitorCookie(cookieValue);

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = BeaconPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid payload format" }, { status: 400 });
    }

    const { currentPath, referrer, viewport, machineHash } = parsed.data;

    // If cookie was missing (e.g. Incognito tab), generate candidate ID (will be reconciled with machineHash)
    if (!visitorId) {
      visitorId = generateVisitorId();
    }

    // Check ban status across both candidate/cookie visitorId and hardware machineHash
    const cachedBan = getCachedBanStatus(visitorId) || getCachedBanStatus(machineHash);
    if (cachedBan && cachedBan.banned) {
      return NextResponse.json(
        {
          success: false,
          banned: true,
          reason: cachedBan.reason || "Access permanently revoked",
          visitorId,
        },
        { status: 403 }
      );
    }

    const userAgent = request.headers.get("user-agent") || "";
    const clientIP = extractClientIP(request.headers);
    const geo = extractGeoFromHeaders(request.headers);
    const device = extractDeviceInfo(userAgent, request.headers);
    const browser = extractBrowserInfo(userAgent, request.headers);

    const updatedVisitor = await upsertVisitor(visitorId, {
      currentPath,
      referrer,
      currentIP: clientIP,
      geo,
      device,
      browser,
      viewport,
      incrementPage: true,
      machineHash,
    });

    const canonicalVisitorId = updatedVisitor.id;

    // Broadcast update to Admin live table
    publishVisitorEvent({
      type: "VISITOR_UPDATED",
      visitorId: canonicalVisitorId,
      timestamp: Date.now(),
      visitor: updatedVisitor,
    });

    const response = NextResponse.json({
      success: true,
      visitorId: canonicalVisitorId,
      banned: Boolean(updatedVisitor.ban?.enabled),
    });

    const encodedCookie = encodeVisitorCookieValue(canonicalVisitorId);
    response.cookies.set({
      name: VISITOR_COOKIE_NAME,
      value: encodedCookie,
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
