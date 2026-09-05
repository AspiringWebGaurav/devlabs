import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminEmail } from "@/lib/admin/auth";
import { fetchWithTimeout } from "@/lib/api/fetcher";
import { extractClientIp } from "@/lib/admin/services/ip-security.service";
import { otpService } from "@/lib/admin/services/otp.service";
import { ADMIN_COOKIE_NAME, ADMIN_OTP_COOKIE_NAME, OTP_TTL_SECONDS } from "@/lib/admin/constants";

export const dynamic = "force-dynamic";

/**
 * Handles Google OAuth 2.0 PKCE Callback, verifies email authorization,
 * and sets session or redirects with unauthorized notice.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  const host = request.headers.get("host") || "localhost:3000";
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  // If user cancelled on Google screen or denied access
  if (errorParam || !code) {
    const response = NextResponse.redirect(
      new URL("/admin/login?cancelled=true", baseUrl)
    );
    response.cookies.delete("oauth_code_verifier");
    return response;
  }

  const codeVerifier = request.cookies.get("oauth_code_verifier")?.value;
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    "";
  const redirectUri = `${baseUrl}/api/admin/auth/callback`;

  try {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    // Exchange PKCE authorization code for Google access token & ID token (4.0s timeout)
    const tokenRequestBody: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier || "",
    };

    const tokenResponse = await fetchWithTimeout(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(tokenRequestBody),
      },
      4000
    );

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to exchange OAuth token with Google.");
    }

    let email: string | undefined = undefined;
    let avatar: string | undefined = undefined;
    let name: string | undefined = undefined;

    // Fast-path: Extract verified identity directly from Google's signed ID token JWT payload (< 0.1ms)
    if (tokenData.id_token && typeof tokenData.id_token === "string") {
      try {
        const parts = tokenData.id_token.split(".");
        if (parts.length >= 2) {
          const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
          const payload = JSON.parse(payloadJson);
          if (payload?.email && typeof payload.email === "string") {
            email = payload.email;
            avatar = typeof payload.picture === "string" ? payload.picture : undefined;
            name = typeof payload.name === "string" ? payload.name : undefined;
          }
        }
      } catch {
        // Fallback to userinfo endpoint below
      }
    }

    // Fallback: Query Google userinfo endpoint if id_token was absent or could not be parsed
    if (!email) {
      const userinfoResponse = await fetchWithTimeout(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        },
        3000
      );

      const profile = await userinfoResponse.json();
      email = profile?.email;
      avatar = profile?.picture;
      name = profile?.name;
    }

    if (!email) {
      throw new Error("No verified email received from Google profile.");
    }

    // Strict Authorization Check: Only authorized admin identity is permitted
    if (!isAuthorizedAdminEmail(email)) {
      const redirectUrl = new URL("/admin/login?unauthorized=true", baseUrl);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete("oauth_code_verifier");
      return response;
    }

    // Authorized Identity: Extract deployment-authoritative client IP
    const clientIp = extractClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") || undefined;

    // Create and dispatch 6-digit OTP challenge
    const { challengeId } = await otpService.createOtpChallenge({
      email,
      name: name || "Gaurav Patil",
      avatar,
      clientIp,
      userAgent,
      requestHeaders: request.headers,
    });

    // Set secure httpOnly OTP challenge cookie and redirect to /admin/otp
    const response = NextResponse.redirect(new URL("/admin/otp", baseUrl));
    const isSecure = process.env.NODE_ENV === "production";

    response.cookies.set({
      name: ADMIN_OTP_COOKIE_NAME,
      value: challengeId,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: OTP_TTL_SECONDS,
      path: "/",
    });

    // CRITICAL: Delete any prior session cookie so user MUST complete OTP verification
    response.cookies.delete(ADMIN_COOKIE_NAME);
    response.cookies.delete("oauth_code_verifier");
    return response;
  } catch (err: unknown) {
    const error = err as Error;
    const redirectUrl = new URL(
      `/admin/login?error=${encodeURIComponent(
        error.message || "Failed to complete Google authentication."
      )}`,
      baseUrl
    );
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("oauth_code_verifier");
    return response;
  }
}

