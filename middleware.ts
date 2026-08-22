import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Clean Runtime Section Rewriting (/about, /projects, /testimonials, /contact -> /)
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

