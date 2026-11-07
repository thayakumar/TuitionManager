"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = pathname.startsWith("/portal") || pathname.startsWith("/share/") || pathname.startsWith("/meeting/") || pathname === "/login";

  if (isFullscreen) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-background transition-[margin] duration-200 md:ml-60 [.sidebar-collapsed_&]:md:ml-16">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </main>
  );
}
