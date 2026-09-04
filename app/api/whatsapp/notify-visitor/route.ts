import { NextRequest, NextResponse } from "next/server";
import { createWhatsAppReplyToken } from "@/lib/whatsapp/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");
  const name = searchParams.get("name") || "Visitor";

  if (email && phone) {
    const token = createWhatsAppReplyToken({
      email,
      phone,
      name,
    });
    return NextResponse.redirect(new URL(`/wa/notify/${token}`, req.url), 307);
  }

  return NextResponse.redirect(new URL("/", req.url), 307);
}
