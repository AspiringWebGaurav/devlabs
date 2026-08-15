import { NextResponse } from "next/server";
import { getDatabaseStats } from "@/lib/admin/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getDatabaseStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch database stats" },
      { status: 500 }
    );
  }
}
