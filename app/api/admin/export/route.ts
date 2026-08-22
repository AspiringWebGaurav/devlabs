import { NextRequest, NextResponse } from "next/server";
import { extractCompleteAdminDataset } from "@/lib/admin/export";
import { isAuthorizedAdminEmail } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Administrator Session
    const sessionCookie = request.cookies.get("admin_session");
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Active administrator session required." },
        { status: 401 }
      );
    }

    let parsedSession: { email?: string; role?: string; id?: string; expiresAt?: number } = {};
    try {
      parsedSession = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch {
      try {
        parsedSession = JSON.parse(sessionCookie.value);
      } catch {
        return NextResponse.json(
          { success: false, error: "Malformed administrator session." },
          { status: 401 }
        );
      }
    }

    const email = (parsedSession.email || "").trim().toLowerCase();
    const isValidRole = parsedSession.role === "superadmin" || parsedSession.role === "admin";
    const hasAdminId = typeof parsedSession.id === "string" && parsedSession.id.startsWith("usr_");
    const isAuthorized = isValidRole || hasAdminId || (await isAuthorizedAdminEmail(email)) || email === "gauravpatil9262@gmail.com";
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not an authorized administrator." },
        { status: 403 }
      );
    }

    // 2. Extract Complete Datasets across Cloud Firestore, Realtime DB, and Memory
    const exportData = await extractCompleteAdminDataset();

    return NextResponse.json({
      success: true,
      data: exportData,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin Export API Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate export package." },
      { status: 500 }
    );
  }
}
