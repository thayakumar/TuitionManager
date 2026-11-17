"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  StickyNote,
  UserCircle,
  GraduationCap,
  Menu,
  LogOut,
  Bell,
  X,
} from "lucide-react";
import { logoutStudent } from "@/lib/actions";
import {
  UnreadBadge,
  useUnreadNotifications,
} from "@/components/notification-bell";
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
  useEffect(() => setOpen(false), [path]);
  const links = [
    { path: "", label: "Dashboard", icon: LayoutDashboard },
    { path: "/schedule", label: "My Schedule", icon: CalendarDays },
    { path: "/classroom", label: "My Classroom", icon: BookOpen },
    { path: "/notes", label: "My Notes", icon: StickyNote },
    { path: "/notifications", label: "Notifications", icon: Bell },
    { path: "/profile", label: "My Profile", icon: UserCircle },
  ];
  function content() {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 p-5 pb-8">
          <div className="flex size-10 shrink-0 items-center justify-center brand-mark rounded-2xl text-white">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-sm">{studentName}</strong>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Your learning space
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {links.map((link) => {
            const href = base + link.path,
              active = link.path ? path.startsWith(href) : path === base;
            return (
              <Link
                key={link.path}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${active ? "bg-orange-50 font-semibold text-orange-700" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <link.icon size={18} />
                <span className="flex-1">{link.label}</span>
                {link.path === "/notifications" && (
                  <UnreadBadge count={count} />
                )}
              </Link>
            );
          })}
        </nav>
        <form action={logoutStudent} className="border-t border-border p-3">
          <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-secondary">
            <LogOut size={17} />
            Sign out
          </button>
        </form>
      </div>
    );
  }
  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
        {content()}
      </aside>
      <div className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <button
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="flex size-11 items-center justify-center rounded-xl border border-border"
        >
          <Menu size={20} />
        </button>
        <strong className="min-w-0 flex-1 truncate text-sm">
          {studentName}
        </strong>
        <Link
          href={base + "/notifications"}
          aria-label={`Notifications, ${count} unread`}
          className="flex items-center gap-1"
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
          <aside className="relative h-full w-72 max-w-[85vw] bg-card">
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 p-2"
            >
              <X size={18} />
            </button>
            {content()}
          </aside>
        </div>
      )}
    </>
  );
}
export function PortalNav({
  role,
  studentId,
  studentName,
}: {
  role: "student" | "parent";
  studentId: number;
  studentName: string;
}) {
  return <StudentNavigation studentId={studentId} studentName={studentName} />;
}
