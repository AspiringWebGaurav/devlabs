import { NextRequest, NextResponse } from "next/server";
import {
  decodeAndVerifyVisitorCookie,
  encodeVisitorCookieValue,
  generateVisitorId,
  VISITOR_COOKIE_NAME,
  VISITOR_COOKIE_MAX_AGE,
} from "@/lib/visitors/cookie-manager";
import {
  findVisitorByMachineHash,
  upsertVisitor,
} from "@/lib/visitors/visitor-repository";
import { extractClientIP, extractGeoFromHeaders } from "@/lib/visitors/geo-detector";
import { extractDeviceInfo, extractBrowserInfo } from "@/lib/visitors/device-detector";
import { publishVisitorEvent } from "@/lib/visitors/event-bus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    let visitorId = decodeAndVerifyVisitorCookie(cookieValue);
    const mfp = request.nextUrl.searchParams.get("mfp")?.trim() || undefined;

    // 1. Try to find existing visitor by machine fingerprint if cookie is missing
    if (!visitorId && mfp) {
      try {
        const existing = await findVisitorByMachineHash(mfp);
        if (existing) {
          visitorId = existing.id;
        }
      } catch {
        // Non-critical
      }
    }

    // 2. Auto-provision a new visitor ID if not found
    if (!visitorId) {
      visitorId = generateVisitorId();
    }

    const userAgent = request.headers.get("user-agent") || "";
    const clientIP = extractClientIP(request.headers);
    const geo = extractGeoFromHeaders(request.headers);
    const device = extractDeviceInfo(userAgent, request.headers);
    const browser = extractBrowserInfo(userAgent, request.headers);

    let canonicalVisitorId = visitorId;
    let isBanned = false;

    // 3. Upsert visitor to Firestore / RTDB (failsafe non-blocking)
    try {
      const updatedVisitor = await upsertVisitor(visitorId, {
        currentPath: request.nextUrl.searchParams.get("path") || "/",
        currentIP: clientIP,
        geo,
        device,
        browser,
        incrementPage: false,
        machineHash: mfp,
      });

      canonicalVisitorId = updatedVisitor.id;
      isBanned = Boolean(updatedVisitor.ban?.enabled);

      // Broadcast visitor event to Admin Live Stream
      publishVisitorEvent({
        type: "VISITOR_UPDATED",
        visitorId: canonicalVisitorId,
        timestamp: Date.now(),
        visitor: updatedVisitor,
      });
    } catch (dbErr) {
      console.warn("Visitor persistence note:", dbErr);
    }

    // 4. Build response with secure cookie
    const response = NextResponse.json({
      success: true,
      visitorId: canonicalVisitorId,
      banned: isBanned,
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
    console.warn("Visitor /me fallback note:", err);
    const fallbackId = generateVisitorId();
    return NextResponse.json({
      success: true,
      visitorId: fallbackId,
      banned: false,
    });
  }
}
