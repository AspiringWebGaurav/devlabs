import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, PRIMARY_ADMIN_EMAIL } from "@/lib/admin/constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // 1. Dynamic Admin Gatekeeper Routing (/admin/*)
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    let isAuthenticated = false;

    if (sessionCookie) {
      try {
        let parsed: { email?: string; role?: string; expiresAt?: number; id?: string } | null = null;
        try {
          parsed = JSON.parse(decodeURIComponent(sessionCookie));
        } catch {
          try {
            parsed = JSON.parse(sessionCookie);
          } catch {
            parsed = null;
          }
        }

        const now = Date.now();
        const isNotExpired = !parsed?.expiresAt || now < parsed.expiresAt;
        const email = (parsed?.email || "").trim().toLowerCase();
        const isAuthorized =
          email === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
          parsed?.role === "superadmin" ||
          (typeof parsed?.id === "string" && parsed.id.startsWith("usr_"));

        if (isNotExpired && isAuthorized) {
          isAuthenticated = true;
        }
      } catch {
        isAuthenticated = false;
      }
    }

    // Case A: Unauthenticated user trying to access /admin dashboard -> redirect to /admin/login
    if (!isAuthenticated && pathname !== "/admin/login") {
      const loginUrl = new URL("/admin/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      if (sessionCookie) {
        response.cookies.delete(ADMIN_COOKIE_NAME);
      }
      return response;
    }

    // Case B: Already authenticated admin visiting /admin/login -> redirect to /admin dashboard
    if (isAuthenticated && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
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


