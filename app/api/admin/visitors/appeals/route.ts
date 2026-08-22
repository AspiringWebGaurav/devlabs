import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminSession } from "@/lib/admin/session";
import { getVisitorAppeals, updateAppealStatus } from "@/lib/visitors/visitor-repository";
import { AppealStatus } from "@/lib/visitors/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/admin/visitors/appeals -> Fetch all appeals
export async function GET(request: NextRequest) {
  if (!isAuthorizedAdminSession(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  try {
    const appeals = await getVisitorAppeals();
    return NextResponse.json({ success: true, appeals });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve appeals" },
      { status: 500 }
    );
  }
}

const AppealActionSchema = z.object({
  appealId: z.string().min(4),
  action: z.enum(["accept", "reject", "hold"]),
  adminNotes: z.string().max(500).optional(),
});

// POST /api/admin/visitors/appeals -> Execute action on appeal (accept / reject / hold)
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

  const parsed = AppealActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid appeal action payload." },
      { status: 400 }
    );
  }

  const { appealId, action, adminNotes } = parsed.data;

  let targetStatus: AppealStatus = "PENDING";
  if (action === "accept") targetStatus = "ACCEPTED";
  else if (action === "reject") targetStatus = "REJECTED";
  else if (action === "hold") targetStatus = "HOLD";

  try {
    const updatedAppeal = await updateAppealStatus(appealId, targetStatus, adminNotes);
    if (!updatedAppeal) {
      return NextResponse.json(
        { success: false, error: "Appeal document not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      appeal: updatedAppeal,
      message:
        action === "accept"
          ? `Appeal accepted! Visitor ${updatedAppeal.visitorId} has been automatically unbanned and restored.`
          : action === "reject"
          ? `Appeal rejected. Ban remains enforced.`
          : `Appeal marked on HOLD for further review.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update appeal status." },
      { status: 500 }
    );
  }
}
