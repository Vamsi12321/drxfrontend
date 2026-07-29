import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/api/", "/admin"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("access_token")?.value;
  const userRole = request.cookies.get("userRole")?.value;

  // Allow public paths
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    // If logged in and visiting login/landing, redirect to doctor home
    if (token && userRole && (pathname === "/" || pathname === "/login")) {
      return NextResponse.redirect(new URL("/doctor/select-org", request.url));
    }
    return NextResponse.next();
  }

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only allow doctor routes + shared routes
  const allowedPrefixes = ["/doctor", "/change-password", "/drug-details"];
  const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isAllowed) {
    return NextResponse.redirect(new URL("/doctor/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
