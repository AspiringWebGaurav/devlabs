import { NextRequest, NextResponse } from "next/server";
import {
  decodeAndVerifyVisitorCookie,
  VISITOR_COOKIE_NAME,
} from "@/lib/visitors/cookie-manager";
import { findVisitorByMachineHash } from "@/lib/visitors/visitor-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  let visitorId = decodeAndVerifyVisitorCookie(cookieValue);

  if (!visitorId) {
    const mfp = request.nextUrl.searchParams.get("mfp")?.trim();
    if (mfp) {
      const existing = await findVisitorByMachineHash(mfp);
      if (existing) {
        visitorId = existing.id;
      }
    }
  }

  if (!visitorId) {
    return NextResponse.json({ success: false, visitorId: null }, { status: 401 });
  }

  return NextResponse.json({ success: true, visitorId });
}
