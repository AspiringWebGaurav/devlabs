/**
 * 1-Click Visitor Notification Backward-Compatible API Route
 *
 * Seamlessly redirects legacy email notification links to the responsive
 * Swiss Light Admin Notification Gateway (/admin/whatsapp/notify).
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const targetUrl = new URL(`/admin/whatsapp/notify?${searchParams.toString()}`, req.url);

  return NextResponse.redirect(targetUrl, 307);
}
