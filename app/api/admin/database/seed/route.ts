import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { seedDefaultDatabase } from "@/lib/admin/database";
import { ADMIN_COOKIE_NAME, isAuthorizedAdminEmail } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Admin Session Cookie
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
    }

    let session: { email?: string } | null = null;
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch {
      try {
        session = JSON.parse(sessionCookie.value);
      } catch {
        session = null;
      }
    }

    if (!session || !(await isAuthorizedAdminEmail(session.email || ""))) {
      return NextResponse.json({ success: false, error: "Forbidden: Unauthorized administrator." }, { status: 403 });
    }

    // 2. Restore Default Showcase Data
    await seedDefaultDatabase();

    // 3. Revalidate Paths
    try {
      revalidatePath("/", "layout");
      revalidatePath("/blog", "layout");
      revalidatePath("/admin", "layout");
    } catch {
      // Ignore in dev
    }

    return NextResponse.json({
      success: true,
      message: "Database default data successfully restored.",
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to seed database." },
      { status: 500 }
    );
  }
}
