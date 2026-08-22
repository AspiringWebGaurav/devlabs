import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminSession } from "@/lib/admin/session";
import { runFullAuthorityDatabaseSweep } from "@/lib/admin/database-sweeper";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/database/sweep
 * Full-Authority Sweeper endpoint for Data Export & Maintenance page.
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
      revalidatePath("/admin/export", "layout");
    } catch {
      // Ignored
    }

    return NextResponse.json({
      success: true,
      report,
      message: report.message,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute database sweep." },
      { status: 500 }
    );
  }
}
