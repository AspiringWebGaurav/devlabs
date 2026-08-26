import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_OTP_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin/constants";
import { createAdminSessionPayload, signAdminSession } from "@/lib/admin/auth";
import { otpService } from "@/lib/admin/services/otp.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const challengeId = request.cookies.get(ADMIN_OTP_COOKIE_NAME)?.value;
    if (!challengeId) {
      return NextResponse.json({ status: "UNAUTHORIZED" }, { status: 401 });
    }

    const challenge = await otpService.getChallenge(challengeId);
    if (!challenge) {
      const response = NextResponse.json({ status: "EXPIRED" });
      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    const now = Date.now();
    if (now > challenge.expiresAt || challenge.otpStatus === "EXPIRED") {
      const response = NextResponse.json({ status: "EXPIRED" });
      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    if (challenge.otpStatus === "INVALIDATED") {
      const response = NextResponse.json({ status: "UNAUTHORIZED", error: "Challenge invalidated." });
      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    // STRICT GATE: Only elevate if primary OTP is verified AND IP is authorized
    const isPrimaryDone = Boolean(challenge.primaryOtpVerified || challenge.otpStatus === "VERIFIED");
    if (isPrimaryDone && challenge.ipVerified) {
      const session = createAdminSessionPayload(
        challenge.email,
        challenge.avatar,
        challenge.name
      );
      const signedToken = await signAdminSession(session);

      const response = NextResponse.json({
        status: "VERIFIED",
        redirect: "/admin/authenticating",
      });

      const isSecure = process.env.NODE_ENV === "production";

      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: signedToken,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
        path: "/",
      });

      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      status: "PENDING",
      primaryOtpVerified: isPrimaryDone,
      ipVerified: Boolean(challenge.ipVerified),
      remainingAttempts: Math.max(0, 3 - (challenge.attemptsCount || 0)),
      expiresAt: challenge.expiresAt,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { status: "ERROR", error: error.message || "Failed to check status." },
      { status: 500 }
    );
  }
}
