"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, ClipboardList,
  MessageSquare, Receipt, GraduationCap, Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetTrigger, SheetContent, SheetTitle,
} from "@/components/ui/sheet";

const navLinks = [
  { path: "", label: "Dashboard", icon: LayoutDashboard },
  { path: "/attendance", label: "Attendance", icon: ClipboardList },
  { path: "/schedule", label: "Schedule", icon: CalendarDays },
  { path: "/reports", label: "Class Reports", icon: MessageSquare },
  { path: "/invoices", label: "Invoices", icon: Receipt },
];

function NavLink({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: LucideIcon; active: boolean;
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
  pathname, basePath, studentName, businessName,
}: {
  pathname: string; basePath: string; studentName: string; businessName: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-foreground">
              {studentName}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Parent View
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navLinks.map((l) => {
          const href = `${basePath}${l.path}`;
          const active = l.path === ""
            ? pathname === basePath || pathname === basePath + "/"
            : pathname.startsWith(href);
          return (
            <NavLink key={l.path} href={href} label={l.label} icon={l.icon} active={active} />
          );
        })}
      </nav>

      <Separator />

      <div className="px-4 py-3">
        <div className="text-[10px] text-muted-foreground/50">
          {businessName} · TuitionHub
        </div>
      </div>
    </div>
  );
}

export function ParentNav({
  token, studentName, businessName,
}: {
  token: string; studentName: string; businessName: string;
}) {
  const pathname = usePathname();
  const basePath = `/share/${token}`;

  return (
    <>
      <aside className="no-print hidden md:flex fixed inset-y-0 left-0 z-30 w-60 border-r border-border bg-card flex-col">
        <SidebarContent pathname={pathname} basePath={basePath} studentName={studentName} businessName={businessName} />
      </aside>

      <div className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent pathname={pathname} basePath={basePath} studentName={studentName} businessName={businessName} />
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
