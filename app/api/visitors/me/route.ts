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
  const cookieValue = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  let visitorId = decodeAndVerifyVisitorCookie(cookieValue);
  const mfp = request.nextUrl.searchParams.get("mfp")?.trim() || undefined;

  // 1. Try to find existing visitor by machine fingerprint if cookie is missing
  if (!visitorId && mfp) {
    const existing = await findVisitorByMachineHash(mfp);
    if (existing) {
      visitorId = existing.id;
    }
  }

  const userAgent = request.headers.get("user-agent") || "";
  const clientIP = extractClientIP(request.headers);
  const geo = extractGeoFromHeaders(request.headers);
  const device = extractDeviceInfo(userAgent, request.headers);
  const browser = extractBrowserInfo(userAgent, request.headers);

  // 2. Auto-provision a new visitor ID if not found
  if (!visitorId) {
    visitorId = generateVisitorId();
  }

  // 3. Upsert visitor to Firestore / RTDB
  const updatedVisitor = await upsertVisitor(visitorId, {
    currentPath: request.nextUrl.searchParams.get("path") || "/",
    currentIP: clientIP,
    geo,
    device,
    browser,
    incrementPage: false,
    machineHash: mfp,
  });

  const canonicalVisitorId = updatedVisitor.id;

  // 4. Build response with secure cookie
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

  // Broadcast visitor event to Admin Live Stream
  publishVisitorEvent({
    type: "VISITOR_UPDATED",
    visitorId: canonicalVisitorId,
    timestamp: Date.now(),
    visitor: updatedVisitor,
  });

  return response;
}
