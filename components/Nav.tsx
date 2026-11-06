"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <aside className="no-print w-56 border-r border-sidebar-border bg-sidebar h-screen sticky top-0 flex flex-col">
      <div className="p-5 border-b border-sidebar-border">
        <div className="text-lg font-heading font-semibold text-sidebar-foreground">Tuition Manager</div>
        <div className="text-xs text-muted-foreground">personal tutoring HQ</div>
      </div>
      <nav className="p-3 flex-1">
        {links.map((l) => {
          const active =
            l.href === "/"
              ? pathname === "/"
              : pathname === l.href || pathname.startsWith(l.href + "/");
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition",
                active
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              )}
            >
              <Icon size={16} />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-[10px] text-muted-foreground border-t border-sidebar-border">
        v0.2 · Turso cloud
      </div>
    </aside>
  );
}
