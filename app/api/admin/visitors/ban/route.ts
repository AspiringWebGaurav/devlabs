import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminSession } from "@/lib/admin/session";
import { setVisitorBan } from "@/lib/visitors/visitor-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BanActionSchema = z.object({
  visitorId: z.string().min(4).max(64),
  action: z.enum(["ban", "unban"]),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  if (!isAuthorizedAdminSession(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = BanActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid payload format." },
      { status: 400 }
    );
  }

  const { visitorId, action, reason } = parsed.data;
  const isBan = action === "ban";

  try {
    await setVisitorBan(visitorId, {
      enabled: isBan,
      reason: isBan ? (reason || "Access permanently revoked by administrator") : undefined,
      bannedBy: isBan ? "Gaurav (Administrator)" : undefined,
    });

    return NextResponse.json({
      success: true,
      visitorId,
      status: isBan ? "BANNED" : "ACTIVE",
      message: isBan
        ? `Visitor ${visitorId} has been remotely banned. Active session revoked.`
        : `Visitor ${visitorId} has been unbanned. Access restored.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update visitor ban state." },
      { status: 500 }
    );
  }
}
