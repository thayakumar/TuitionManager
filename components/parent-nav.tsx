"use client";

import Link from "next/link";
import { BrandHomeLink } from "@/components/brand-home-link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  Receipt,
  Menu,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { useUnreadFamilyChats } from "@/components/family-chat-unread";
import { UnreadBadge } from "@/components/notification-bell";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const navLinks = [
  { path: "", label: "Dashboard", icon: LayoutDashboard },
  { path: "/schedule", label: "Schedule", icon: CalendarDays },
  { path: "/attendance", label: "Attendance", icon: ClipboardList },
  { path: "/reports", label: "Class reports", icon: MessageSquare },
  { path: "/chat", label: "Family chat", icon: MessagesSquare },
  { path: "/invoices", label: "Invoices", icon: Receipt },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  unread = 0,
  onSelect,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  unread?: number;
  onSelect?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-secondary text-primary font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={18} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <UnreadBadge count={unread} label="messages" />
    </Link>
  );
}

function SidebarContent({
  pathname,
  basePath,
  studentName,
  businessName,
  onSelect,
  chatCount,
}: {
  pathname: string;
  basePath: string;
  studentName: string;
  businessName: string;
  onSelect?: () => void;
  chatCount: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 py-4">
        <BrandHomeLink
          href={basePath}
          subtitle={studentName + " · Parent"}
          onClick={onSelect}
        />
      </div>
      <Separator />

      <nav
        aria-label="Parent navigation"
        className="sidebar-nav sidebar-scroll min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-4"
      >
        {navLinks.map((l) => {
          const href = `${basePath}${l.path}`;
          const active =
            l.path === ""
              ? pathname === basePath || pathname === basePath + "/"
              : pathname.startsWith(href);
          return (
            <NavLink
              key={l.path}
              href={href}
              label={l.label}
              icon={l.icon}
              active={active}
              unread={l.path === "/chat" ? chatCount : 0}
              onSelect={onSelect}
            />
          );
        })}
      </nav>

      <Separator />

      <div className="px-4 py-3">
        <div className="text-xs text-muted-foreground">
          {businessName} · TuitionHub
        </div>
      </div>
    </div>
  );
}

export function ParentNav({
  token,
  studentName,
  businessName,
}: {
  token: string;
  studentName: string;
  businessName: string;
}) {
  const pathname = usePathname();
  const chatCount = useUnreadFamilyChats("parent", token);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const basePath = `/share/${token}`;

  return (
    <>
      <aside
        aria-label="Parent sidebar"
        className="no-print hidden overflow-hidden md:flex fixed inset-y-0 left-0 z-30 w-60 border-r border-border bg-card flex-col"
      >
        <SidebarContent
          pathname={pathname}
          basePath={basePath}
          studentName={studentName}
          businessName={businessName}
          chatCount={chatCount}
        />
      </aside>

      <div className="mobile-nav-bar no-print sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Open parent navigation"
              />
            }
          >
            <Menu size={20} aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
            <SheetTitle className="sr-only">Parent navigation</SheetTitle>
            <SidebarContent
              pathname={pathname}
              basePath={basePath}
              studentName={studentName}
              businessName={businessName}
              chatCount={chatCount}
              onSelect={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <BrandHomeLink
          href={basePath}
          subtitle={studentName + " · Parent"}
          className="min-w-0 flex-1"
        />
      </div>
    </>
  );
}
