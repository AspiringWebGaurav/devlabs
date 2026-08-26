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

    // Case A: OTP Challenge in progress (/admin/otp): Must strictly stay on OTP page until verified
    if (isOtpRoute) {
      if (otpChallengeCookie) {
        // Active challenge: Allow through and purge any stale session cookie
        const response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        if (sessionCookie) {
          response.cookies.delete(ADMIN_COOKIE_NAME);
        }
        return response;
      } else {
        // No challenge active -> redirect to login
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }

    // Case B: Authenticated admin visiting /admin/login -> redirect to /admin dashboard
    if (isAuthenticated && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Case C: Unauthenticated user trying to access protected /admin routes -> redirect to /admin/login
    if (!isAuthenticated && !isPublicAdminRoute) {
      const loginUrl = new URL("/admin/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      if (sessionCookie) {
        response.cookies.delete(ADMIN_COOKIE_NAME);
      }
      return response;
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


