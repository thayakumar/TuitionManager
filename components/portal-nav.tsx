"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  StickyNote,
  UserCircle,
  ClipboardList,
  Receipt,
  FileText,
  GraduationCap,
  Menu,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { logoutStudent } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

type NavItem = { href: string; label: string; icon: LucideIcon };

function getLinks(role: "student" | "parent", base: string): { main: NavItem[]; label: string } {
  if (role === "student") {
    return {
      label: "Student",
      main: [
        { href: base, label: "Dashboard", icon: LayoutDashboard },
        { href: `${base}/schedule`, label: "My Schedule", icon: CalendarDays },
        { href: `${base}/classroom`, label: "My Class", icon: BookOpen },
        { href: `${base}/notes`, label: "Student Notes", icon: StickyNote },
        { href: `${base}/profile`, label: "My Profile", icon: UserCircle },
      ],
    };
  }
  return {
    label: "Parent",
    main: [
      { href: base, label: "Dashboard", icon: LayoutDashboard },
      { href: `${base}/attendance`, label: "Attendance", icon: ClipboardList },
      { href: `${base}/schedule`, label: "Schedule", icon: CalendarDays },
      { href: `${base}/reports`, label: "Reports", icon: FileText },
      { href: `${base}/invoices`, label: "Invoices", icon: Receipt },
    ],
  };
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
        active
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function SidebarContent({
  pathname,
  role,
  studentName,
  links,
}: {
  pathname: string;
  role: "student" | "parent";
  studentName: string;
  links: ReturnType<typeof getLinks>;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm shrink-0">
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-foreground truncate">
              {studentName}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {links.label} Portal
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Menu
        </div>
        {links.main.map((l) => {
          const active =
            l.href === pathname ||
            (l.href !== links.main[0].href && pathname.startsWith(l.href + "/"));
          return (
            <NavLink
              key={l.href}
              href={l.href}
              label={l.label}
              icon={l.icon}
              active={active}
            />
          );
        })}
      </nav>

      <Separator />

      {/* Sign out */}
      <div className="px-3 py-3">
        <form action={logoutStudent}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut size={16} />
            <span className="text-xs">Sign out</span>
          </Button>
        </form>
      </div>

      <div className="px-4 py-2">
        <div className="text-[10px] text-muted-foreground/50">
          TuitionHub
        </div>
      </div>
    </div>
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
  const pathname = usePathname();
  const base = `/portal/${role}/${studentId}`;
  const links = getLinks(role, base);

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <aside className="no-print hidden md:flex fixed inset-y-0 left-0 z-30 w-60 border-r border-border bg-card flex-col">
        <SidebarContent
          pathname={pathname}
          role={role}
          studentName={studentName}
          links={links}
        />
      </aside>

      {/* Mobile top bar — sticky */}
      <div className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" />
            }
          >
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              pathname={pathname}
              role={role}
              studentName={studentName}
              links={links}
            />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <GraduationCap size={14} />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            {studentName}
          </span>
        </div>
      </div>
    </>
  );
}
