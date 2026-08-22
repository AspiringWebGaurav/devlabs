import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminSession } from "@/lib/admin/session";
import { cascadeDeleteVisitor } from "@/lib/visitors/visitor-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const DeleteVisitorSchema = z.object({
  visitorId: z.string().min(4).max(64),
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

  const parsed = DeleteVisitorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid visitor ID provided." },
      { status: 400 }
    );
  }

  const { visitorId } = parsed.data;

  try {
    const result = await cascadeDeleteVisitor(visitorId);

    return NextResponse.json({
      success: true,
      visitorId,
      deletedSessions: result.deletedSessions,
      deletedAppeals: result.deletedAppeals,
      message: `Visitor ${visitorId}, ${result.deletedSessions} session records, and ${result.deletedAppeals} appeal records were permanently purged with zero orphan data.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cascade delete visitor." },
      { status: 500 }
    );
  }
}
