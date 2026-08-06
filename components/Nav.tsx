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
    <aside className="no-print w-56 border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col">
      <div className="p-5 border-b border-slate-200">
        <div className="text-lg font-semibold">Tuition Manager</div>
        <div className="text-xs text-slate-500">personal tutoring HQ</div>
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition ${
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-[10px] text-slate-400 border-t border-slate-100">
        v0.1 · SQLite local
      </div>
    </aside>
  );
}
