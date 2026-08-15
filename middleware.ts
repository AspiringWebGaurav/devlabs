import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Only handle admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("devlabs_admin_session");
    let isAuthenticated = false;

    if (sessionCookie && sessionCookie.value) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie.value));
        const now = Date.now();

        // 1. Check valid admin email
        const isCorrectAdmin =
          parsed &&
          parsed.email &&
          parsed.email.trim().toLowerCase() === "gauravpatil9262@gmail.com";

        // 2. Check session expiration timestamp (TTL)
        const isNotExpired = !parsed.expiresAt || now < parsed.expiresAt;

        if (isCorrectAdmin && isNotExpired) {
          isAuthenticated = true;
        }
      } catch {
        isAuthenticated = false;
      }
    }

    const isLoginPage = pathname === "/admin/login";

    // 1. Unauthenticated user trying to access protected admin views -> server redirect to login
    if (!isAuthenticated && !isLoginPage) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);

      const response = NextResponse.redirect(loginUrl);
      // Clean up stale/expired session cookie
      if (sessionCookie) {
        response.cookies.delete("devlabs_admin_session");
      }
      return response;
    }

    // 2. Already authenticated user with valid unexpired session -> direct to dashboard
    if (isAuthenticated && isLoginPage) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
