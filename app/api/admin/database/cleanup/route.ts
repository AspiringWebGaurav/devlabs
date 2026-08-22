import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminSession } from "@/lib/admin/session";
import { runFullAuthorityDatabaseSweep } from "@/lib/admin/database-sweeper";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/database/cleanup
 * Full-Authority 3-Layer Sweeper: Scans the entire Firestore project, enumerates all collections,
 * and purges stale sessions (>24h), orphaned appeals, and old audit/telemetry logs.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedAdminSession(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const report = await runFullAuthorityDatabaseSweep();

    try {
      revalidatePath("/admin", "layout");
      revalidatePath("/admin/visitors", "layout");
    } catch {
      // Ignored
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute database sweep." },
      { status: 500 }
    );
  }
}
