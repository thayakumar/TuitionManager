"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Grid2X2,
  Users,
  CalendarDays,
  Receipt,
  Settings,
  Menu,
  BookOpen,
  PencilRuler,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarClock,
  Bell,
  LogOut,
  Sparkles,
  X,
  BarChart3,
  MessagesSquare,
  BrainCircuit,
} from "lucide-react";
import { useUnreadFamilyChats } from "@/components/family-chat-unread";
import { logoutAdmin } from "@/lib/actions";
import { useSidebar } from "@/components/layout-shell";
import { BrandHomeLink } from "@/components/brand-home-link";
import {
  UnreadBadge,
  useUnreadNotifications,
} from "@/components/notification-bell";
const links = [
  { href: "/overview", label: "Overview", icon: Grid2X2 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/classroom", label: "Classroom", icon: BookOpen },
  { href: "/diagnostics", label: "Diagnostics", icon: BrainCircuit },
  { href: "/whiteboard", label: "Whiteboard", icon: PencilRuler },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/financial-history", label: "Financial history", icon: BarChart3 },
  { href: "/chats", label: "Family chats", icon: MessagesSquare },
  { href: "/requests", label: "Requests", icon: CalendarClock },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];
function AdminNavigation() {
  const pathname = usePathname(),
    { collapsed, toggle } = useSidebar();
  const [open, setOpen] = useState(false),
    count = useUnreadNotifications("admin", null),
    chatCount = useUnreadFamilyChats("admin");
  useEffect(() => setOpen(false), [pathname]);
  function contents(mobile = false) {
    const compact = collapsed && !mobile;
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={
            compact
              ? "flex shrink-0 justify-center px-2 py-5"
              : "shrink-0 px-4 py-5"
          }
          onClick={() => setOpen(false)}
        >
          <BrandHomeLink compact={compact} />
        </div>
        <nav
          aria-label="Primary navigation"
          id={mobile ? "admin-mobile-navigation" : "admin-primary-navigation"}
          className={
            "sidebar-scroll min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain " +
            (compact ? "px-2" : "px-3")
          }
        >
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <div key={link.href}>
                {!compact &&
                  ["/overview", "/invoices", "/requests"].includes(
                    link.href,
                  ) && (
                    <p className="sidebar-label">
                      {link.href === "/overview"
                        ? "Teach & learn"
                        : link.href === "/invoices"
                          ? "Business"
                          : "Stay connected"}
                    </p>
                  )}
                <Link
                  href={link.href}
                  target={link.href === "/whiteboard" ? "_blank" : undefined}
                  rel={
                    link.href === "/whiteboard"
                      ? "noopener noreferrer"
                      : undefined
                  }
                  title={compact ? link.label : undefined}
                  onClick={() => setOpen(false)}
                  aria-label={
                    link.href === "/chats" ? "Family chats, " + chatCount + " unread" : link.href === "/notifications"
                      ? "Notifications, " + count + " unread"
                      : link.label
                  }
                  aria-current={active ? "page" : undefined}
                  className={
                    "relative flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors " +
                    (active
                      ? "bg-orange-50 text-orange-700 "
                      : "text-muted-foreground hover:bg-secondary ") +
                    (compact ? "justify-center p-0" : "gap-3 px-3 py-2.5")
                  }
                >
                  <link.icon size={18} className="shrink-0" />
                  {!compact && (
                    <span className="min-w-0 flex-1">{link.label}</span>
                  )}
                  {link.href === "/chats" && chatCount > 0 && <span className={compact ? "absolute right-0 top-0 origin-top-right scale-75" : ""}><UnreadBadge count={chatCount}/></span>}
                  {link.href === "/notifications" && count > 0 && (
                    <span
                      className={
                        compact
                          ? "absolute right-0 top-0 origin-top-right scale-75"
                          : ""
                      }
                    >
                      <UnreadBadge count={count} />
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>
        {!compact && (
          <div className="sidebar-note m-4 shrink-0 rounded-2xl border p-4">
            <Sparkles size={18} className="mb-2 text-orange-500" />
            <p className="text-xs font-semibold">
              A little clarity for your day.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your students, lessons and next steps, together.
            </p>
          </div>
        )}
        <form
          action={logoutAdmin}
          className="shrink-0 border-t border-border p-3"
        >
          <button
            type="submit"
            title="Logout"
            aria-label="Logout"
            className={
              "flex min-h-11 w-full items-center rounded-xl text-sm text-muted-foreground hover:bg-secondary " +
              (compact ? "justify-center p-0" : "gap-3 px-3")
            }
          >
            <LogOut size={17} className="shrink-0" />
            {!compact && "Logout"}
          </button>
        </form>
        {!mobile && (
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="admin-primary-navigation"
            className={
              "flex min-h-11 shrink-0 items-center border-t border-border text-sm text-muted-foreground " +
              (collapsed ? "justify-center p-0" : "gap-3 px-6")
            }
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
        aria-label="Admin sidebar"
        className={
          "no-print fixed inset-y-0 left-0 z-30 hidden overflow-hidden flex-col border-r border-border bg-card md:flex " +
          (collapsed ? "w-16" : "w-60")
        }
      >
        {contents()}
      </aside>
      <div className="no-print sticky top-0 z-40 flex min-w-0 items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border"
        >
          <Menu size={20} />
        </button>
        <BrandHomeLink className="min-w-0 flex-1" />
        <Link
          href="/notifications"
          className="ml-auto flex shrink-0 items-center gap-1"
          aria-label={"Notifications, " + count + " unread"}
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
          <aside
            aria-label="Mobile navigation"
            className="relative flex h-dvh w-72 max-w-[85vw] overflow-hidden flex-col bg-card shadow-xl"
          >
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
    pathname === "/whiteboard" ||
    pathname === "/login"
  )
    return null;
  return <AdminNavigation />;
}
