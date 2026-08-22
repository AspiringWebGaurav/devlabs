import { NextRequest, NextResponse } from "next/server";
import { extractCompleteAdminDataset } from "@/lib/admin/export";
import { isAuthorizedAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Administrator Session
    if (!isAuthorizedAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Active administrator session required." },
        { status: 401 }
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
    console.error("Admin Export API Note:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate export package." },
      { status: 500 }
    );
  }
}
