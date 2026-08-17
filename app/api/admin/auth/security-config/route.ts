import { NextRequest, NextResponse } from "next/server";
import { getAdminSecurityConfig, saveAdminSecurityConfig } from "@/lib/admin/auth";
import { AdminSecurityConfig } from "@/types/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getAdminSecurityConfig();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Failed to get security config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve security configuration.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: Partial<AdminSecurityConfig> = {};

    if (typeof body.requireEmailOtp === "boolean") {
      updates.requireEmailOtp = body.requireEmailOtp;
    }
    if (typeof body.requireTotp === "boolean") {
      updates.requireTotp = body.requireTotp;
    }
    if (typeof body.wipeOtpRequired === "boolean") {
      updates.wipeOtpRequired = body.wipeOtpRequired;
    }

    const updatedConfig = await saveAdminSecurityConfig(updates);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: "Security configuration updated successfully.",
    });
  } catch (error) {
    console.error("Failed to update security config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update security configuration.",
      },
      { status: 500 }
    );
  }
}
