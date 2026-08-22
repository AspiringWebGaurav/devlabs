import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminSession } from "@/lib/admin/session";
import { listVisitors, getVisitorStatsSummary } from "@/lib/visitors/visitor-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedAdminSession(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const status = (searchParams.get("status") || "all") as "all" | "online" | "banned";
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const [visitors, summary] = await Promise.all([
      listVisitors({ limit, search, status }),
      getVisitorStatsSummary(),
    ]);

    return NextResponse.json({
      success: true,
      visitors,
      summary,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch visitors" },
      { status: 500 }
    );
  }
}
