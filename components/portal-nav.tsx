"use client";
import Link from "next/link";
import { BrandHomeLink } from "@/components/brand-home-link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  StickyNote,
  UserCircle,
  Menu,
  LogOut,
  Bell,
  MessagesSquare,
  BrainCircuit,
  Files,
} from "lucide-react";
import { useUnreadFamilyChats } from "@/components/family-chat-unread";
import { logoutStudent } from "@/lib/actions";
import {
  UnreadBadge,
  useUnreadNotifications,
} from "@/components/notification-bell";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function StudentNavigation({
  studentId,
  studentName,
}: {
  studentId: number;
  studentName: string;
}) {
  const path = usePathname(),
    base = `/portal/student/${studentId}`;
  const [open, setOpen] = useState(false);
  const count = useUnreadNotifications("student", studentId);
  const chatCount = useUnreadFamilyChats("student");
  useEffect(() => setOpen(false), [path]);

  const links = [
    { path: "", label: "Dashboard", icon: LayoutDashboard },
    { path: "/schedule", label: "Schedule", icon: CalendarDays },
    { path: "/classroom", label: "Classroom", icon: BookOpen },
    { path: "/documents", label: "Documents", icon: Files },
    { path: "/diagnostic", label: "Diagnostic", icon: BrainCircuit },
    { path: "/notes", label: "Notes", icon: StickyNote },
    { path: "/chat", label: "Family chat", icon: MessagesSquare },
    { path: "/notifications", label: "Notifications", icon: Bell },
    { path: "/profile", label: "Profile", icon: UserCircle },
  ];

  function content() {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 p-4">
          <BrandHomeLink
            href={base}
            subtitle={studentName}
            onClick={() => setOpen(false)}
          />
        </div>
        <nav
          aria-label="Student navigation"
          className="sidebar-nav sidebar-scroll min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 pb-4"
        >
          {links.map((link) => {
            const href = base + link.path,
              active = link.path ? path.startsWith(href) : path === base;
            return (
              <Link
                key={link.path}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${active ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <link.icon size={18} aria-hidden="true" />
                <span className="flex-1 truncate">{link.label}</span>
                {link.path === "/chat" && (
                  <UnreadBadge count={chatCount} label="messages" />
                )}
                {link.path === "/notifications" && (
                  <UnreadBadge count={count} label="notifications" />
                )}
              </Link>
            );
          })}
        </nav>
        <form action={logoutStudent} className="border-t border-border p-3">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <aside
        aria-label="Student sidebar"
        className="no-print fixed inset-y-0 left-0 z-30 hidden overflow-hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex"
      >
        {content()}
      </aside>
      <div className="mobile-nav-bar no-print sticky top-0 z-40 flex items-center gap-2 border-b border-border px-4 py-2.5 md:hidden">
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
            <SheetTitle className="sr-only">Student navigation</SheetTitle>
            {content()}
          </SheetContent>
        </Sheet>
        <BrandHomeLink
          href={base}
          subtitle={studentName}
          className="min-w-0 flex-1"
        />
        <Link
          href={base + "/notifications"}
          aria-label={`Notifications, ${count} unread`}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted"
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

export function PortalNav({
  studentId,
  studentName,
}: {
  role?: "student" | "parent";
  studentId: number;
  studentName: string;
}) {
  return <StudentNavigation studentId={studentId} studentName={studentName} />;
}
