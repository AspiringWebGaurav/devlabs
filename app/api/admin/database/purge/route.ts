import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { purgeEntireDatabase } from "@/lib/admin/database";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Admin Session Cookie
    const sessionCookie = request.cookies.get("devlabs_admin_session");
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
    }

    const session = JSON.parse(decodeURIComponent(sessionCookie.value));
    if (!session || session.email?.trim().toLowerCase() !== "gauravpatil9262@gmail.com") {
      return NextResponse.json({ success: false, error: "Forbidden: Only gauravpatil9262@gmail.com is authorized." }, { status: 403 });
    }

    // 2. Nuclear Database Purge to 0
    const purgeResult = await purgeEntireDatabase();

    // 3. Clear Next.js Caches and Revalidate All Routes
    try {
      revalidatePath("/", "layout");
      revalidatePath("/blog", "layout");
      revalidatePath("/admin", "layout");
    } catch {
      // Ignore in dev
    }

    return NextResponse.json({
      success: true,
      message: "Database successfully wiped to 0 documents.",
      purgedAt: purgeResult.purgedAt,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to purge database." },
      { status: 500 }
    );
  }
}
