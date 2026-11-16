"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  Receipt,
  GraduationCap,
  Menu,
  type LucideIcon,
} from "lucide-react";
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
  { path: "/attendance", label: "Attendance", icon: ClipboardList },
  { path: "/schedule", label: "Schedule", icon: CalendarDays },
  { path: "/reports", label: "Class Reports", icon: MessageSquare },
  { path: "/invoices", label: "Invoices", icon: Receipt },
];

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
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
        active
          ? "bg-orange-50 text-orange-700 font-semibold"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function SidebarContent({
  pathname,
  basePath,
  studentName,
  businessName,
}: {
  pathname: string;
  basePath: string;
  studentName: string;
  businessName: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center brand-mark rounded-xl text-white shadow-sm">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-foreground">
              {studentName}
            </div>
            <div className="text-xs text-muted-foreground">Parent View</div>
          </div>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
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
            />
          );
        })}
      </nav>

      <Separator />

      <div className="px-4 py-3">
        <div className="text-xs text-muted-foreground/50">
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
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const basePath = `/share/${token}`;

  return (
    <>
      <aside className="no-print hidden md:flex fixed inset-y-0 left-0 z-30 w-60 border-r border-border bg-card flex-col">
        <SidebarContent
          pathname={pathname}
          basePath={basePath}
          studentName={studentName}
          businessName={businessName}
        />
      </aside>

      <div className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open parent navigation"
              />
            }
          >
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              pathname={pathname}
              basePath={basePath}
              studentName={studentName}
              businessName={businessName}
            />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center brand-mark rounded-lg text-white">
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
