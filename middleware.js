import { NextResponse } from "next/server";

const BASE = "/drx";
const PUBLIC_PATHS = ["/login", "/forgot-password", "/api/", "/admin"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Strip basePath for internal logic
  const path = pathname.startsWith(BASE) ? pathname.slice(BASE.length) || "/" : pathname;

  const token = request.cookies.get("access_token")?.value;
  const userRole = request.cookies.get("userRole")?.value;

  // Allow public paths
  if (
    PUBLIC_PATHS.some((p) => path.startsWith(p)) ||
    path === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith(`${BASE}/_next`) ||
    pathname.startsWith(`${BASE}/images`)
  ) {
    // If logged in and visiting login/landing, redirect to doctor home
    if (token && userRole && (path === "/" || path === "/login")) {
      return NextResponse.redirect(new URL(`${BASE}/doctor/select-org`, request.url));
    }
    return NextResponse.next();
  }

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL(`${BASE}/login`, request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // Only allow doctor routes + shared routes
  const allowedPrefixes = ["/doctor", "/change-password", "/drug-details"];
  const isAllowed = allowedPrefixes.some((prefix) => path.startsWith(prefix));

  if (!isAllowed) {
    return NextResponse.redirect(new URL(`${BASE}/doctor/home`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
