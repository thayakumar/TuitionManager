import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/portal",
  "/share/",
  "/meeting/",
  "/_next/",
  "/api/",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Student portal routes require student_session cookie
  if (pathname.startsWith("/portal/student/")) {
    const studentSession = request.cookies.get("student_session")?.value;
    if (!studentSession) {
      const portalUrl = new URL("/portal", request.url);
      return NextResponse.redirect(portalUrl);
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Admin routes require admin_session cookie
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
