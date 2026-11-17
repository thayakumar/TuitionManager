import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/portal/admin",
  "/portal/student",
  "/portal",
  "/share/",
  "/_next/",
  "/vendor/excaliflow/",
  "/favicon.ico",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths (login pages, share links, etc.) — no auth needed
  if (PUBLIC_PATHS.some((p) => pathname === p || (p.endsWith("/") && pathname.startsWith(p)))) {
    return NextResponse.next();
  }

  // Upload performs real admin-or-student session validation in its handler.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Presence checks only avoid needless page work; server read/action guards
  // verify token ownership, active status and expiry.
  // Student portal routes require student_session cookie
  if (pathname.startsWith("/portal/student/")) {
    const studentSession = request.cookies.get("student_session")?.value;
    if (!studentSession) {
      const portalUrl = new URL("/portal/student", request.url);
      return NextResponse.redirect(portalUrl);
    }
    return NextResponse.next();
  }

  // Meeting routes accept either admin or student session
  if (pathname.startsWith("/meeting/")) {
    const adminSession = request.cookies.get("admin_session")?.value;
    const studentSession = request.cookies.get("student_session")?.value;
    if (!adminSession && !studentSession) {
      const loginUrl = new URL("/portal/student", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Admin routes require admin_session cookie
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    const loginUrl = new URL("/portal/admin", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
