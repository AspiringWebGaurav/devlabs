import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Initiates Direct Google OAuth 2.0 PKCE Authentication (Zero Popups)
 * Displays the dynamic list of available Google accounts for the user to choose from.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      "";

    const host = request.headers.get("host") || "localhost:3000";
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const redirectUri = `${protocol}://${host}/api/admin/auth/callback`;

    // Generate PKCE code verifier and code challenge (RFC 7636)
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    // prompt=select_account forces Google to show all available accounts on the device
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: crypto.randomBytes(16).toString("hex"),
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    const response = NextResponse.redirect(googleAuthUrl);

    // Save code_verifier in a secure short-lived cookie for verification in callback
    const isSecure = process.env.NODE_ENV === "production";
    response.cookies.set({
      name: "oauth_code_verifier",
      value: codeVerifier,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}
