"use client";

import { useState, useEffect, createContext, useContext } from "react";

const SidebarContext = createContext({ collapsed: false, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);

const STORAGE_KEY = "sidebar-collapsed";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div className={collapsed ? "sidebar-collapsed" : ""}>{children}</div>
    </SidebarContext.Provider>
  );
}
