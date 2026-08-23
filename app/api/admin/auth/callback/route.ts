import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminEmail, createAdminSessionPayload } from "@/lib/admin/auth";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/admin/constants";

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

    // Exchange PKCE authorization code for Google access token & ID token
    const tokenRequestBody: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier || "",
    };

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenRequestBody),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to exchange OAuth token with Google.");
    }

    // Fetch verified Google User Profile
    const userinfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const profile = await userinfoResponse.json();
    const email = profile?.email;
    const avatar = profile?.picture;
    const name = profile?.name;

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

    // Authorized Superadmin: Create 7-day session cookie and redirect to dashboard
    const session = createAdminSessionPayload(email, avatar, name);
    const serialized = encodeURIComponent(JSON.stringify(session));

    const response = NextResponse.redirect(new URL("/admin", baseUrl));
    const isSecure = process.env.NODE_ENV === "production";

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: serialized,
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

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
