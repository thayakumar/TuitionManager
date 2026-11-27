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
  Compass,
  Files,
  ExternalLink,
  UserPlus,
  FilePlus2,
  Sparkles,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth";

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
      { href: "/review", label: "Review Quest", desc: "Station mastery, retries and misconceptions", icon: Compass },
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

const quickActions = [
  { href: "/schedule/new", label: "Plan a lesson", icon: CalendarPlus },
  { href: "/students/new", label: "Add student", icon: UserPlus },
  { href: "/invoices/new", label: "New invoice", icon: FilePlus2 },
  { href: "/schedule", label: "Open schedule", icon: CalendarDays },
];

function klGreeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(now),
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(now);
  return { greeting, date };
}

export default async function OverviewPage() {
  await requireAdminPage();
  const { greeting, date } = klGreeting(new Date());
  return (
    <>
      <section className="directory-hero mb-8" aria-labelledby="directory-title">
        <div className="relative z-10 min-w-0">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-orange-100">
            <Sparkles size={14} aria-hidden="true" />
            {date}
          </p>
          <h1
            id="directory-title"
            className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          >
            {greeting}. <span className="text-[#ffda96]">Where to first?</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
            Every teaching, billing and family tool, one tap away.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="directory-quick-action">
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
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
                  className="overview-tile interactive-card group flex min-h-20 min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[0.95rem] font-semibold text-foreground">
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
