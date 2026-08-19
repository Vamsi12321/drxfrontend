import { NextResponse } from "next/server";

const BASE = "/drx";

// Paths that don't require any auth
const PUBLIC_PATHS = ["/login", "/forgot-password", "/api/"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Strip basePath for internal logic
  const path = pathname.startsWith(BASE) ? pathname.slice(BASE.length) || "/" : pathname;

  const token = request.cookies.get("access_token")?.value;
  const userRole = request.cookies.get("userRole")?.value;

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith(`${BASE}/_next`) ||
    pathname.startsWith(`${BASE}/images`)
  ) {
    return NextResponse.next();
  }

  // Allow public paths (login pages, forgot password, API routes)
  if (
    PUBLIC_PATHS.some((p) => path.startsWith(p)) ||
    path === "/"
  ) {
    // If logged in doctor visiting login/landing, redirect to select-org
    if (token && userRole === "doctor" && (path === "/" || path === "/login")) {
      return NextResponse.redirect(new URL(`${BASE}/doctor/select-org`, request.url));
    }
    return NextResponse.next();
  }

  // ── Admin routes ──
  if (path.startsWith("/admin")) {
    // Admin login page is public
    if (path === "/admin/login" || path.startsWith("/admin/login/")) {
      // If admin already logged in, redirect to dashboard
      if (token && (userRole === "PLATFORM_ADMIN" || userRole === "admin")) {
        return NextResponse.redirect(new URL(`${BASE}/admin/dashboard`, request.url));
      }
      return NextResponse.next();
    }

    // All other admin routes require admin auth
    if (!token || (userRole !== "PLATFORM_ADMIN" && userRole !== "admin")) {
      return NextResponse.redirect(new URL(`${BASE}/admin/login`, request.url));
    }

    return NextResponse.next();
  }

  // ── Doctor routes ──
  if (!token) {
    const loginUrl = new URL(`${BASE}/login`, request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // Only allow doctor routes
  const allowedPrefixes = ["/doctor", "/change-password"];
  const isAllowed = allowedPrefixes.some((prefix) => path.startsWith(prefix));

  if (!isAllowed) {
    return NextResponse.redirect(new URL(`${BASE}/doctor/home`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
