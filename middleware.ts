import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // 1. Dynamic Admin Gatekeeper Routing (/admin/*)
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const verifiedSession = sessionCookie ? await verifyAdminSession(sessionCookie) : null;
    const isAuthenticated = verifiedSession !== null;

    const isPublicAdminRoute =
      pathname === "/admin/login" ||
      pathname === "/admin/terms" ||
      pathname === "/admin/privacy";

    const isOtpRoute = pathname === "/admin/otp";
    const otpChallengeCookie = request.cookies.get("admin_otp_challenge")?.value;

    // Case 0: Authenticated admin visiting /admin/otp -> redirect to /admin dashboard
    if (isAuthenticated && isOtpRoute) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Case A: OTP Challenge in progress (/admin/otp): Must strictly stay on OTP page until verified
    if (isOtpRoute) {
      if (otpChallengeCookie) {
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } else {
        // No challenge active -> redirect to login
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }

    // Case B: Authenticated admin visiting /admin/login -> redirect to /admin dashboard (unless explicitly signed out)
    if (isAuthenticated && pathname === "/admin/login") {
      const isExplicitSignOut = request.nextUrl.searchParams.get("signedOut") === "true";
      if (isExplicitSignOut) {
        // User explicitly signed out: purge session cookie and allow login page to render
        const response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        response.cookies.delete(ADMIN_COOKIE_NAME);
        return response;
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Case C: Unauthenticated user trying to access protected /admin routes -> redirect to /admin/login
    // The root /admin entrypoint is permitted to render the AdminPanelLoader gateway
    if (!isAuthenticated && !isPublicAdminRoute) {
      if (pathname !== "/admin") {
        const loginUrl = new URL("/admin/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        if (sessionCookie) {
          response.cookies.delete(ADMIN_COOKIE_NAME);
        }
        return response;
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }


  // 2. Clean Runtime Section Rewriting (/about, /projects, /testimonials, /contact -> /)
  const isSectionRoute = ["/about", "/projects", "/testimonials", "/contact"].includes(pathname);
  return isSectionRoute
    ? NextResponse.rewrite(new URL("/", request.url), {
        request: {
          headers: requestHeaders,
        },
      })
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};


