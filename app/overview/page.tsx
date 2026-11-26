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
  MessagesSquare,
  BrainCircuit,
  Files,
  ExternalLink,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const groups = [
  {
    title: "Teach & learn",
    items: [
      { href: "/dashboard", label: "Dashboard", desc: "Today’s schedule and tasks", icon: LayoutDashboard },
      { href: "/students", label: "Students", desc: "Roster, rates and parent links", icon: Users },
      { href: "/schedule", label: "Schedule", desc: "Calendar and upcoming lessons", icon: CalendarDays },
      { href: "/schedule/new", label: "Plan a lesson", desc: "Book a single or trial session", icon: CalendarPlus },
      { href: "/schedule/recurring", label: "Recurring lessons", desc: "Extend or stop weekly series", icon: Repeat2 },
      { href: "/classroom", label: "Classroom", desc: "Assignments, materials and grades", icon: BookOpen },
      { href: "/documents", label: "Documents", desc: "Shared Docs and Gridcraft sheets", icon: Files },
      { href: "/diagnostics", label: "Diagnostics", desc: "One-time readiness assessments", icon: BrainCircuit },
      { href: "/whiteboard", label: "Whiteboard", desc: "Personal canvas (new tab)", icon: PencilRuler, external: true },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/invoices", label: "Invoices", desc: "Drafts, billing status and PDFs", icon: Receipt },
      { href: "/financial-history", label: "Financial history", desc: "Monthly paid and outstanding revenue", icon: BarChart3 },
    ],
  },
  {
    title: "Stay connected & workspace",
    items: [
      { href: "/chats", label: "Family chats", desc: "Messages with students and parents", icon: MessagesSquare },
      { href: "/requests", label: "Requests", desc: "Approve or decline reschedules", icon: CalendarClock },
      { href: "/notifications", label: "Notifications", desc: "Recent lesson and grade updates", icon: Bell },
      { href: "/settings", label: "Settings", desc: "Business info, QR, storage and AI", icon: Settings },
    ],
  },
];

export default async function OverviewPage() {
  await requireAdminPage();
  return (
    <>
      <PageHeader
        title="Workspace directory"
        subtitle="Jump directly to any teaching, billing, or communication tool."
      />
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </h2>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map(({ href, label, desc, icon: Icon, external }) => (
                <Link
                  key={href}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="overview-tile group flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card p-4 transition-[background-color,border-color,box-shadow] duration-150 hover:border-primary/40 hover:bg-secondary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-foreground">
                      {label}
                    </strong>
                    <span className="block truncate text-xs text-muted-foreground">
                      {desc}
                    </span>
                  </span>
                  {external ? (
                    <ExternalLink
                      size={16}
                      className="shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
