import Link from "next/link";
import {
  ArrowRight,
  Users,
  CalendarDays,
  Clock,
  BookOpen,
  RefreshCw,
  FileText,
  CircleHelp,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { queryAll, queryOne } from "@/lib/db";
import { currentBillingMonth } from "@/lib/finance";
import {
  businessDateTime,
  monthBounds,
  nextDate,
} from "@/lib/domain/business-time";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { DashboardQuickActions } from "@/components/dashboard-actions";
import { AttendanceChart } from "@/components/attendance-chart";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime, fmtTime } from "@/lib/format";
import type { ClassWithStudent } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  await requireAdminPage();
  const now = new Date(),
    iso = now.toISOString(),
    localDay = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10),
    month = currentBillingMonth(),
    [start, end] = monthBounds(month),
    dayStart = businessDateTime(`${localDay}T00:00`),
    dayEnd = businessDateTime(`${nextDate(localDay, 1)}T00:00`);
  const [
    students,
    classes,
    upcoming,
    needsReport,
    stats,
    attendance,
    pendingRequests,
    unmarked,
    attentionCounts,
  ] = await Promise.all([
    queryAll<{ id: number; name: string; subject: string | null }>(
      "SELECT id,name,subject FROM students WHERE active=1 ORDER BY name",
    ),
    queryAll<ClassWithStudent>(
      "SELECT c.*,s.name AS student_name,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE julianday(c.scheduled_at)>=julianday(?) AND julianday(c.scheduled_at)<julianday(?) ORDER BY julianday(c.scheduled_at) LIMIT 5",
      [dayStart, dayEnd],
    ),
    queryAll<ClassWithStudent>(
      "SELECT c.*,s.name AS student_name,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE c.status='scheduled' AND julianday(c.scheduled_at)>=julianday(?) ORDER BY julianday(c.scheduled_at) LIMIT 5",
      [iso],
    ),
    queryAll<ClassWithStudent>(
      "SELECT c.*,s.name AS student_name,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id LEFT JOIN reports r ON r.class_id=c.id WHERE c.status='completed' AND c.attendance IN ('present','late') AND julianday(c.scheduled_at)<julianday(?) AND r.id IS NULL ORDER BY julianday(c.scheduled_at) DESC LIMIT 5",
      [iso],
    ),
    queryOne<{
      today_classes: number;
      month_classes: number;
      month_minutes: number;
      upcoming: number;
    }>(
      "SELECT SUM(CASE WHEN julianday(scheduled_at)>=julianday(?) AND julianday(scheduled_at)<julianday(?) THEN 1 ELSE 0 END) AS today_classes,SUM(CASE WHEN julianday(scheduled_at)>=julianday(?) AND julianday(scheduled_at)<julianday(?) THEN 1 ELSE 0 END) AS month_classes,SUM(CASE WHEN status='completed' AND attendance IN ('present','late') AND julianday(scheduled_at)>=julianday(?) AND julianday(scheduled_at)<julianday(?) THEN duration_minutes ELSE 0 END) AS month_minutes,SUM(CASE WHEN status='scheduled' AND julianday(scheduled_at)>=julianday(?) THEN 1 ELSE 0 END) AS upcoming FROM classes",
      [dayStart, dayEnd, start, end, start, end, iso],
    ),
    queryOne<{ present: number; absent: number }>(
      "SELECT SUM(CASE WHEN attendance IN ('present','late') THEN 1 ELSE 0 END) AS present,SUM(CASE WHEN attendance='absent' THEN 1 ELSE 0 END) AS absent FROM classes WHERE status<>'canceled' AND julianday(scheduled_at)>=julianday(?) AND julianday(scheduled_at)<=julianday(?)",
      [new Date(now.getTime() - 30 * 86400000).toISOString(), iso],
    ),
    queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM reschedule_requests WHERE status='pending'",
    ),
    queryAll<ClassWithStudent>(
      "SELECT c.*,s.name AS student_name,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE c.status='scheduled' AND julianday(c.scheduled_at)<julianday(?) ORDER BY julianday(c.scheduled_at) DESC LIMIT 5",
      [iso],
    ),
    queryOne<{ reports: number; unmarked: number; ungraded: number }>(
      `SELECT
        (SELECT COUNT(*) FROM classes c LEFT JOIN reports r ON r.class_id=c.id WHERE c.status='completed' AND c.attendance IN ('present','late') AND julianday(c.scheduled_at)<julianday(?) AND r.id IS NULL) AS reports,
        (SELECT COUNT(*) FROM classes WHERE status='scheduled' AND julianday(scheduled_at)<julianday(?)) AS unmarked,
        (SELECT COUNT(*) FROM submissions s JOIN posts p ON p.id=s.post_id WHERE p.type IN ('assignment','quiz') AND s.grade IS NULL AND s.graded_at IS NULL) AS ungraded`,
      [iso, iso],
    ),
  ]);
  const pendingCount = Number(pendingRequests?.count ?? 0),
    reportCount = Number(attentionCounts?.reports ?? 0),
    unmarkedCount = Number(attentionCounts?.unmarked ?? 0),
    ungradedCount = Number(attentionCounts?.ungraded ?? 0),
    caughtUp = !pendingCount && !reportCount && !unmarkedCount && !ungradedCount;
  return (
    <>
      <section className="dashboard-intro page-heading mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div>
          <p className="eyebrow">Your teaching day</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Here’s what’s happening today, and what needs your attention.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat("en-MY", {
              timeZone: "Asia/Kuala_Lumpur",
              dateStyle: "full",
            }).format(now)}
          </p>
        </div>
        <DashboardQuickActions students={students} />
      </section>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          {
            href: "/students",
            label: "Active students",
            value: students.length,
            detail: "Your teaching roster",
            Icon: Users,
          },
          {
            href: "/schedule",
            label: "Lessons this month",
            value: Number(stats?.month_classes ?? 0),
            detail: month,
            Icon: CalendarDays,
          },
          {
            href: "/schedule",
            label: "Teaching hours",
            value: `${(Number(stats?.month_minutes ?? 0) / 60).toFixed(1)}h`,
            detail: "Attended lessons this month",
            Icon: Clock,
          },
          {
            href: "/schedule",
            label: "Today's lessons",
            value: Number(stats?.today_classes ?? 0),
            detail: "Your day at a glance",
            Icon: BookOpen,
          },
          {
            href: "/requests",
            label: "Pending reschedules",
            value: pendingCount,
            detail: "Requests to review",
            Icon: RefreshCw,
            warning: pendingCount > 0,
          },
          {
            href: "#needs-attention",
            label: "Reports overdue",
            value: reportCount,
            detail: "Attended lessons without a report",
            Icon: FileText,
            warning: reportCount > 0,
          },
        ].map(({ label, value, detail, Icon, href, warning }) => (
          <Link
            key={label}
            href={href}
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className={`metric-card h-full transition-colors hover:border-primary/40 ${warning ? "border-amber-300 bg-amber-50/60" : ""}`}>
              <CardContent className="relative p-5 sm:p-6">
                <Icon className="metric-icon absolute right-5 top-5 size-9 rounded-xl bg-primary/5 p-2 text-primary" />
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-3 break-words text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card id="needs-attention" className="mb-6 scroll-mt-6">
        <CardHeader>
          <CardTitle>Needs Your Attention</CardTitle>
          <CardDescription>Teaching tasks ready for your next step</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {caughtUp && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-5 text-emerald-800">
              <CheckCircle2 size={22} aria-hidden="true" />
              <p className="font-medium">You're all caught up!</p>
            </div>
          )}
          {pendingCount > 0 && (
            <Link href="/requests" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <RefreshCw size={20} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 font-medium">Review reschedule requests</span>
              <Badge className="bg-amber-100 text-amber-900">{pendingCount}</Badge>
              <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
            </Link>
          )}
          {reportCount > 0 && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <FileText size={20} className="shrink-0 text-amber-700" aria-hidden="true" />
                <p className="flex-1 font-semibold">Reports to write</p>
                <Badge className="bg-amber-100 text-amber-900">{reportCount}</Badge>
              </div>
              <div className="mt-3 divide-y divide-border/60">
                {needsReport.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}?report=true`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary">
                    <span className="min-w-0"><strong className="block">{c.student_name}</strong><span className="mt-1 block text-xs text-muted-foreground">{fmtDateTime(c.scheduled_at)}</span></span>
                    <ArrowRight size={17} className="shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
              {reportCount > 5 && <Link href="/schedule" className="mt-2 block text-sm font-medium text-primary">Showing 5 of {reportCount} · View schedule →</Link>}
            </div>
          )}
          {unmarkedCount > 0 && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <CircleHelp size={20} className="shrink-0 text-blue-700" aria-hidden="true" />
                <p className="flex-1 font-semibold">Unmarked lessons</p>
                <Badge className="bg-blue-100 text-blue-900">{unmarkedCount}</Badge>
              </div>
              <div className="mt-3 divide-y divide-border/60">
                {unmarked.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary">
                    <span className="min-w-0"><strong className="block">{c.student_name}</strong><span className="mt-1 block text-xs text-muted-foreground">{fmtDateTime(c.scheduled_at)}</span></span>
                    <ArrowRight size={17} className="shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
              {unmarkedCount > 5 && <Link href="/schedule" className="mt-2 block text-sm font-medium text-primary">Showing 5 of {unmarkedCount} · View schedule →</Link>}
            </div>
          )}
          {ungradedCount > 0 && (
            <Link href="/classroom" className="flex items-center gap-3 rounded-xl border border-border p-4 hover:border-primary/40">
              <ClipboardCheck size={20} className="shrink-0 text-amber-700" aria-hidden="true" />
              <span className="min-w-0 flex-1 font-medium">Grade student submissions</span>
              <Badge className="bg-amber-100 text-amber-900">{ungradedCount}</Badge>
              <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
            </Link>
          )}
        </CardContent>
      </Card>
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Today’s lessons</CardTitle>
                <CardDescription className="mt-2">
                  A clear view of your day · Malaysia time
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {Number(stats?.today_classes ?? classes.length)} lessons
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {classes.length ? (
              classes.map((c) => (
                <Link
                  href={`/classes/${c.id}`}
                  key={c.id}
                  className="lesson-row flex min-w-0 items-center gap-4 border-b border-border/50 py-4 last:border-0"
                >
                  <div className="w-16 shrink-0">
                    <strong className="text-xs">
                      {fmtTime(c.scheduled_at)}
                    </strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.duration_minutes} min
                    </p>
                  </div>
                  <div aria-hidden="true" className="lesson-avatar">
                    {c.student_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {c.student_name}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {c.subject || "Lesson"}
                      {c.location ? ` · ${c.location}` : ""}
                    </p>
                  </div>
                  <LessonStatusBadge
                    status={c.status}
                    attendance={c.attendance}
                  />
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                No lessons today. A little space to plan ahead.
              </p>
            )}
          </CardContent>
          <div className="border-t border-border px-6 py-4">
            <Link href="/schedule" className="font-medium text-primary">
              View full schedule →
            </Link>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>
              Last 30 days · marked lessons only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceChart
              data={{
                present: Number(attendance?.present ?? 0),
                absent: Number(attendance?.absent ?? 0),
              }}
            />
          </CardContent>
        </Card>
      </div>
      <section aria-labelledby="upcoming-lessons" className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <h2 id="upcoming-lessons" className="text-xl font-semibold">Upcoming lessons</h2>
            <CardDescription>
              {Number(stats?.upcoming ?? 0)} scheduled · showing the next 5
            </CardDescription>
          </div>
          <div>
            {upcoming.map((c) => (
              <Link
                className="flex items-center justify-between gap-3 border-b border-border/50 py-3 last:border-0"
                key={c.id}
                href={`/classes/${c.id}`}
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{c.student_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmtDateTime(c.scheduled_at)}
                  </p>
                </div>
                <ArrowRight size={15} className="shrink-0 text-primary" />
              </Link>
            ))}
            {!upcoming.length && (
              <p className="py-6 text-sm text-muted-foreground">
                No upcoming lessons scheduled.
              </p>
            )}
            <Link
              href="/schedule"
              className="mt-4 block text-xs font-semibold text-primary"
            >
              View the schedule →
            </Link>
          </div>
      </section>
    </>
  );
}
