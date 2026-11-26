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
  BarChart3,
  MessagesSquare,
  BrainCircuit,
  Files,
  ExternalLink,
} from "lucide-react";
import { useUnreadFamilyChats } from "@/components/family-chat-unread";
import { logoutAdmin } from "@/lib/actions";
import { useSidebar } from "@/components/layout-shell";
import { BrandHomeLink } from "@/components/brand-home-link";
import {
  UnreadBadge,
  useUnreadNotifications,
} from "@/components/notification-bell";
import { isFullscreenRoute } from "@/lib/route-shell";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "Teach & learn",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/students", label: "Students", icon: Users },
      { href: "/schedule", label: "Schedule", icon: CalendarDays },
      { href: "/classroom", label: "Classroom", icon: BookOpen },
      { href: "/documents", label: "Documents", icon: Files },
      { href: "/diagnostics", label: "Diagnostics", icon: BrainCircuit },
      { href: "/whiteboard", label: "Whiteboard", icon: PencilRuler, external: true },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/financial-history", label: "Financial history", icon: BarChart3 },
    ],
  },
  {
    label: "Stay connected",
    items: [
      { href: "/chats", label: "Family chats", icon: MessagesSquare },
      { href: "/requests", label: "Requests", icon: CalendarClock },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/overview", label: "Directory", icon: Grid2X2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
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
              ? "flex shrink-0 justify-center px-2 py-4"
              : "shrink-0 px-4 py-4"
          }
        >
          <BrandHomeLink compact={compact} onClick={() => setOpen(false)} />
        </div>
        <nav
          aria-label="Primary navigation"
          id={mobile ? "admin-mobile-navigation" : "admin-primary-navigation"}
          className={
            "sidebar-nav sidebar-scroll min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-4 " +
            (compact ? "px-2" : "px-3")
          }
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              {!compact && <p className="sidebar-label">{group.label}</p>}
              {group.items.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    title={compact ? link.label : undefined}
                    onClick={() => setOpen(false)}
                    aria-label={
                      link.href === "/chats"
                        ? `Family chats, ${chatCount} unread`
                        : link.href === "/notifications"
                          ? `Notifications, ${count} unread`
                          : link.external
                            ? `${link.label} (opens in new tab)`
                            : link.label
                    }
                    aria-current={active ? "page" : undefined}
                    className={
                      "relative flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors " +
                      (active
                        ? "bg-secondary text-primary font-semibold "
                        : "text-muted-foreground hover:bg-muted hover:text-foreground ") +
                      (compact ? "justify-center p-0" : "gap-3 px-3 py-2")
                    }
                  >
                    <link.icon size={18} className="shrink-0" aria-hidden="true" />
                    {!compact && (
                      <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    )}
                    {!compact && link.external && (
                      <ExternalLink
                        size={14}
                        className="shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    {link.href === "/chats" && chatCount > 0 && (
                      <span
                        className={
                          compact
                            ? "absolute right-0 top-0 origin-top-right scale-75"
                            : ""
                        }
                      >
                        <UnreadBadge count={chatCount} label="messages" />
                      </span>
                    )}
                    {link.href === "/notifications" && count > 0 && (
                      <span
                        className={
                          compact
                            ? "absolute right-0 top-0 origin-top-right scale-75"
                            : ""
                        }
                      >
                        <UnreadBadge count={count} label="notifications" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <form
          action={logoutAdmin}
          className="shrink-0 border-t border-border p-3"
        >
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className={
              "flex min-h-11 w-full items-center rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground " +
              (compact ? "justify-center p-0" : "gap-3 px-3")
            }
          >
            <LogOut size={17} className="shrink-0" aria-hidden="true" />
            {!compact && "Sign out"}
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
              "flex min-h-11 shrink-0 items-center border-t border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground " +
              (collapsed ? "justify-center p-0" : "gap-3 px-6")
            }
          >
            {collapsed ? (
              <PanelLeftOpen size={16} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={16} aria-hidden="true" />
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
      <div className="mobile-nav-bar no-print sticky top-0 z-40 flex min-w-0 items-center gap-2 border-b border-border bg-card px-4 py-2.5 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Open navigation"
              />
            }
          >
            <Menu size={20} aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            {contents(true)}
          </SheetContent>
        </Sheet>
        <BrandHomeLink className="min-w-0 flex-1" />
        <Link
          href="/notifications"
          className="relative ml-auto flex size-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted"
          aria-label={`Notifications, ${count} unread`}
        >
          <Bell size={18} aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1">
              <UnreadBadge count={count} label="notifications" />
            </span>
          )}
        </Link>
      </div>
    </>
  );
}

export default function Nav() {
  const pathname = usePathname();
  if (isFullscreenRoute(pathname)) return null;
  return <AdminNavigation />;
}
