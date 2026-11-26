/** Canonical shell route predicates shared across admin chrome, wrappers, and live alerts. */
export function isFullscreenRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/portal") ||
    pathname.startsWith("/oauth/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/meeting/") ||
    pathname.startsWith("/documents/") ||
    pathname.startsWith("/office-editor/") ||
    pathname === "/whiteboard" ||
    pathname === "/login"
  );
}

export function isKeepOpenWorkspace(pathname: string): boolean {
  return (
    /^\/(meeting|documents)\//.test(pathname) ||
    pathname.startsWith("/office-editor/") ||
    pathname === "/whiteboard"
  );
}

export function isAuthEntryRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/portal" ||
    pathname === "/portal/admin" ||
    pathname === "/portal/student" ||
    pathname.startsWith("/oauth/")
  );
}
