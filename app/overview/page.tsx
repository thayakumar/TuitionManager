import Link from "next/link";
import {
  ArrowRight,
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  PencilRuler,
  Receipt,
  BarChart3,
  CalendarClock,
  Bell,
  Settings,
  CalendarPlus,
  Repeat2,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
export const dynamic = "force-dynamic";
const sections = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/classroom", label: "Classroom", icon: BookOpen },
  { href: "/whiteboard", label: "Whiteboard", icon: PencilRuler },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/financial-history", label: "Financial history", icon: BarChart3 },
  { href: "/schedule/new", label: "Plan a lesson", icon: CalendarPlus },
  { href: "/schedule/recurring", label: "Recurring lessons", icon: Repeat2 },
  { href: "/requests", label: "Requests", icon: CalendarClock },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];
export default async function OverviewPage() {
  await requireAdminPage();
  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Everything you need, one place to start."
      />
      <nav
        aria-label="Workspace overview"
        className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {sections.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            target={href === "/whiteboard" ? "_blank" : undefined}
            rel={href === "/whiteboard" ? "noopener noreferrer" : undefined}
            className="overview-tile group flex min-h-36 min-w-0 items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm transition-[background-color,border-color,box-shadow] hover:border-primary/40 hover:bg-orange-50/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-40 lg:p-7"
          >
            <Icon
              size={32}
              className="shrink-0 text-primary"
              strokeWidth={1.8}
            />
            <span className="min-w-0 flex-1 break-words text-lg font-semibold tracking-tight">
              {label}
            </span>
            <ArrowRight
              size={21}
              className="shrink-0 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </Link>
        ))}
      </nav>
    </>
  );
}
