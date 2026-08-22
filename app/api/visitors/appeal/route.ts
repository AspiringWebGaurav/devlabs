import { NextRequest, NextResponse } from "next/server";
import {
  submitVisitorAppeal,
  getAppealByVisitorId,
  findVisitorByMachineHash,
} from "@/lib/visitors/visitor-repository";
import { decodeAndVerifyVisitorCookie } from "@/lib/visitors/cookie-manager";
import { extractClientIP } from "@/lib/visitors/geo-detector";

export const dynamic = "force-dynamic";

// GET /api/visitors/appeal?visitorId=... -> Checks current appeal status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let visitorId = searchParams.get("visitorId");
    const mfp = searchParams.get("mfp")?.trim();

    if (!visitorId && mfp) {
      const existing = await findVisitorByMachineHash(mfp);
      if (existing) visitorId = existing.id;
    }

    if (!visitorId) {
      const cookieHeader = req.headers.get("cookie");
      const verified = decodeAndVerifyVisitorCookie(cookieHeader);
      if (verified) visitorId = verified;
    }

    if (!visitorId) {
      return NextResponse.json({ success: false, error: "Visitor ID required" }, { status: 400 });
    }

    const appeal = await getAppealByVisitorId(visitorId);
    return NextResponse.json({ success: true, appeal });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve appeal status" },
      { status: 500 }
    );
  }
}

// POST /api/visitors/appeal -> Submits a new ban appeal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, message, banReason, machineHash } = body;
    let { visitorId } = body;

    if (!visitorId && machineHash) {
      const existing = await findVisitorByMachineHash(machineHash);
      if (existing) visitorId = existing.id;
    }

    if (!visitorId) {
      const cookieHeader = req.headers.get("cookie");
      const verified = decodeAndVerifyVisitorCookie(cookieHeader);
      if (verified) visitorId = verified;
    }

    if (!visitorId) {
      return NextResponse.json(
        { success: false, error: "Missing visitor identification" },
        { status: 400 }
      );
    }

    if (!email || !message || message.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Valid email address and explanation (min 5 characters) are required" },
        { status: 400 }
      );
    }

    const ip = extractClientIP(req.headers);

    const appeal = await submitVisitorAppeal({
      visitorId,
      ip,
      email: email.trim(),
      name: name?.trim() || "Anonymous Visitor",
      message: message.trim(),
      banReason: banReason || "Access permanently restricted",
    });

    return NextResponse.json({
      success: true,
      appeal,
      message: "Your appeal has been submitted successfully and is pending administrative review.",
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit appeal" },
      { status: 500 }
    );
  }
}
