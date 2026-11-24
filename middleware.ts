import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/oauth/authorize",
  "/.well-known/",
  "/portal/admin",
  "/portal/student",
  "/portal",
  "/share/",
  "/_next/",
  "/vendor/excaliflow/",
  "/office-editor/",
  "/favicon.ico",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

function publicDestination(path: string, request: NextRequest): URL {
  const original = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    request.headers.get("host") ||
    original.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    original.protocol.slice(0, -1);
  try {
    if (!["http", "https"].includes(protocol))
      throw new Error("Invalid scheme");
    return new URL(path, protocol + "://" + host);
  } catch {
    return new URL(path, original);
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths (login pages, share links, etc.) — no auth needed
  if (
    PUBLIC_PATHS.some(
      (p) => pathname === p || (p.endsWith("/") && pathname.startsWith(p)),
    )
  ) {
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
      const portalUrl = publicDestination("/portal/student", request);
      return NextResponse.redirect(portalUrl);
    }
    return NextResponse.next();
  }

  // Meeting routes accept either admin or student session
  if (pathname.startsWith("/meeting/") || pathname.startsWith("/documents/")) {
    const adminSession = request.cookies.get("admin_session")?.value;
    const studentSession = request.cookies.get("student_session")?.value;
    if (!adminSession && !studentSession) {
      const loginUrl = publicDestination("/portal/student", request);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Admin routes require admin_session cookie
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    const loginUrl = publicDestination("/portal/admin", request);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect before rendering the legacy root page; avoid a streamed redirect
  // through the dashboard's shared navigation tree.
  if (pathname === "/")
    return NextResponse.redirect(publicDestination("/dashboard", request));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
