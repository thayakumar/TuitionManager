"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Settings,
  GraduationCap,
  Menu,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarClock,
  Bell,
  LogOut,
  BarChart3,
  Sparkles,
  X,
} from "lucide-react";
import { logoutAdmin } from "@/lib/actions";
import { useSidebar } from "@/components/layout-shell";
import {
  UnreadBadge,
  useUnreadNotifications,
} from "@/components/notification-bell";
const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/classroom", label: "Classroom", icon: BookOpen },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/financial-history", label: "Financial history", icon: BarChart3 },
  { href: "/requests", label: "Requests", icon: CalendarClock },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];
function AdminNavigation() {
  const pathname = usePathname(),
    { collapsed, toggle } = useSidebar();
  const [open, setOpen] = useState(false);
  const count = useUnreadNotifications("admin", null);
  useEffect(() => setOpen(false), [pathname]);
  function contents(mobile = false) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-4 pb-7 pt-6">
          <div className="flex size-10 shrink-0 items-center justify-center brand-mark rounded-2xl text-white shadow-md shadow-orange-200">
            <GraduationCap size={23} />
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <strong className="block text-lg tracking-tight">
                TuitionHub
              </strong>
              <span className="text-xs font-medium text-muted-foreground">
                Teaching together
              </span>
            </div>
          )}
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">

          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href + "/"));
            return (
              <div key={link.href}>
                {(!collapsed || mobile) && ["/", "/invoices", "/requests"].includes(link.href) && <p className="sidebar-label">{link.href === "/" ? "Teach & learn" : link.href === "/invoices" ? "Business" : "Stay connected"}</p>}
              <Link
                href={link.href}
                title={collapsed && !mobile ? link.label : undefined}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${active ? "bg-orange-50 text-orange-700" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed && !mobile ? "justify-center" : ""}`}
              >
                <link.icon size={18} className="shrink-0" />
                {(!collapsed || mobile) && (
                  <span className="min-w-0 flex-1">{link.label}</span>
                )}
                {link.href === "/notifications" && count > 0 && (
                  <UnreadBadge count={count} />
                )}
              </Link>
              </div>
            );
          })}
        </nav>
        {(!collapsed || mobile) && (
          <div className="sidebar-note m-4 rounded-2xl border p-4">
            <Sparkles size={18} className="mb-2 text-orange-500" />
            <p className="text-xs font-semibold">
              A little clarity for your day.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your students, lessons and next steps, together.
            </p>
          </div>
        )}
        <form action={logoutAdmin} className="border-t border-border p-3">
          <button
            type="submit"
            title="Logout"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-xs text-muted-foreground hover:bg-secondary"
          >
            <LogOut size={17} />
            {(!collapsed || mobile) && "Logout"}
          </button>
        </form>
        {!mobile && (
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex min-h-11 items-center gap-3 border-t border-border px-6 text-xs text-muted-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <>
                <PanelLeftClose size={16} />
                Collapse
              </>
            )}
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      <aside
        className={`no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card md:flex ${collapsed ? "w-16" : "w-60"}`}
      >
        {contents()}
      </aside>
      <div className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="flex size-11 items-center justify-center rounded-xl border border-border"
        >
          <Menu size={20} />
        </button>
        <GraduationCap className="text-primary" />
        <strong className="text-sm">TuitionHub</strong>
        <Link
          href="/notifications"
          className="ml-auto flex items-center gap-1"
          aria-label={`Notifications, ${count} unread`}
        >
          <Bell size={18} />
          <UnreadBadge count={count} />
        </Link>
      </div>
      {open && (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-lg hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
            {contents(true)}
          </aside>
        </div>
      )}
    </>
  );
}
export default function Nav() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/portal") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/meeting/") ||
    pathname === "/login"
  )
    return null;
  return <AdminNavigation />;
}
