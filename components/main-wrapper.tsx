"use client";

import { WorkspaceHeader } from "@/components/workspace-header";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/oauth/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/meeting/") ||
    pathname.startsWith("/documents/") ||
    pathname.startsWith("/office-editor/") ||
    pathname === "/whiteboard" ||
    pathname === "/login";

  if (isFullscreen) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-background transition-[margin] duration-200 md:ml-60 [.sidebar-collapsed_&]:md:ml-16">
      <WorkspaceHeader />
      <div className="workspace-page mx-auto max-w-[1440px] min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </main>
  );
}
