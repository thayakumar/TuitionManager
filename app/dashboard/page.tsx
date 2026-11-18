import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Users,
  CalendarDays,
  Clock,
  Wallet,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { queryAll, queryOne, getSettings } from "@/lib/db";
import {
  monthlyRevenue,
  financeTotals,
  currentBillingMonth,
  invoiceBillingMonth,
  type FinanceInvoice,
} from "@/lib/finance";
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
import { RevenueChart } from "@/components/revenue-chart";
import { AttendanceChart } from "@/components/attendance-chart";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { currency, fmtDateTime, fmtTime } from "@/lib/format";
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
    settings,
    students,
    classes,
    upcoming,
    needsReport,
    invoices,
    stats,
    attendance,
  ] = await Promise.all([
    getSettings(["currency", "business_name"]),
    queryAll<{ id: number; name: string; subject: string | null }>(
      "SELECT id,name,subject FROM students WHERE active=1 ORDER BY name",
    ),
    queryAll<ClassWithStudent>(
      "SELECT c.*,s.name AS student_name,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE c.scheduled_at>=? AND c.scheduled_at<? ORDER BY c.scheduled_at LIMIT 5",
      [dayStart, dayEnd],
    ),
    queryAll<ClassWithStudent>(
      "SELECT c.*,s.name AS student_name,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE c.status='scheduled' AND c.scheduled_at>=? ORDER BY c.scheduled_at LIMIT 5",
      [iso],
    ),
    queryAll<ClassWithStudent>(
      "SELECT c.*,s.name AS student_name,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id LEFT JOIN reports r ON r.class_id=c.id WHERE c.status='completed' AND c.attendance IN ('present','late') AND c.scheduled_at<? AND r.id IS NULL ORDER BY c.scheduled_at DESC LIMIT 5",
      [iso],
    ),
    queryAll<FinanceInvoice>(
      "SELECT i.id,i.student_id,i.invoice_number,i.period_start,i.period_end,i.billing_month,i.total_amount,i.status,i.issued_at,i.paid_at,s.name AS student_name FROM invoices i JOIN students s ON s.id=i.student_id ORDER BY i.issued_at DESC",
    ),
    queryOne<{
      today_classes: number;
      month_classes: number;
      month_minutes: number;
      upcoming: number;
    }>(
      "SELECT SUM(CASE WHEN scheduled_at>=? AND scheduled_at<? THEN 1 ELSE 0 END) AS today_classes,SUM(CASE WHEN scheduled_at>=? AND scheduled_at<? THEN 1 ELSE 0 END) AS month_classes,SUM(CASE WHEN status='completed' AND attendance IN ('present','late') AND scheduled_at>=? AND scheduled_at<? THEN duration_minutes ELSE 0 END) AS month_minutes,SUM(CASE WHEN status='scheduled' AND scheduled_at>=? THEN 1 ELSE 0 END) AS upcoming FROM classes",
      [dayStart, dayEnd, start, end, start, end, iso],
    ),
    queryOne<{ present: number; absent: number }>(
      "SELECT SUM(CASE WHEN attendance IN ('present','late') THEN 1 ELSE 0 END) AS present,SUM(CASE WHEN attendance='absent' THEN 1 ELSE 0 END) AS absent FROM classes WHERE status<>'canceled' AND scheduled_at>=? AND scheduled_at<=?",
      [new Date(now.getTime() - 30 * 86400000).toISOString(), iso],
    ),
  ]);
  const symbol = settings.currency || "RM",
    totals = financeTotals(invoices),
    thisMonth = financeTotals(
      invoices.filter((i) => invoiceBillingMonth(i) === month),
    ),
    revenue = monthlyRevenue(invoices).slice(-6),
    unpaid = invoices
      .filter((i) => i.status !== "paid" && i.status !== "canceled")
      .slice(0, 5);
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
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            href: "/financial-history",
            label: "Revenue this month",
            value: currency(thisMonth.revenue, symbol),
            detail: "Paid + outstanding · billing month",
            Icon: Wallet,
          },
        ].map(({ label, value, detail, Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="metric-card h-full transition-colors hover:border-primary/40">
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
            <CardTitle>A few next steps</CardTitle>
            <CardDescription>Small tasks, kept in sight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/requests"
              className="block rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm"
            >
              <strong className="text-orange-700">
                Review reschedule requests →
              </strong>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Requests leave the original lesson scheduled until you approve a
                new time.
              </p>
            </Link>
            <div>
              <p className="text-sm font-semibold">
                {needsReport.length
                  ? `${needsReport.length} reports to finish`
                  : "Reports are up to date"}
              </p>
              {needsReport.map((c) => (
                <Link
                  key={c.id}
                  href={`/classes/${c.id}?report=true`}
                  className="mt-2 block text-xs text-primary hover:underline"
                >
                  {c.student_name} · {fmtDateTime(c.scheduled_at)}
                </Link>
              ))}
            </div>
            <Link
              href="/financial-history"
              className="block rounded-xl bg-secondary p-4 text-sm"
            >
              <strong>
                {currency(totals.outstanding, symbol)} outstanding
              </strong>
              <p className="mt-1 text-xs text-muted-foreground">
                See the full financial picture →
              </p>
            </Link>
          </CardContent>
        </Card>
      </div>
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Revenue overview</CardTitle>
                <CardDescription className="mt-2">
                  By lesson billing month · cancelled invoices excluded
                </CardDescription>
              </div>
              <Link
                href="/financial-history"
                className="text-xs font-semibold text-primary"
              >
                Financial history →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue} symbol={symbol} />
          </CardContent>
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
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming lessons</CardTitle>
            <CardDescription>
              {Number(stats?.upcoming ?? 0)} scheduled · showing the next 5
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.map((c) => (
              <Link
                className="flex items-center justify-between gap-3 border-b border-border/50 py-3 last:border-0"
                key={c.id}
                href={`/classes/${c.id}`}
              >
                <div>
                  <p className="text-sm font-semibold">{c.student_name}</p>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unpaid invoices</CardTitle>
            <CardDescription>
              Latest unpaid documents · {currency(totals.outstanding, symbol)}{" "}
              total outstanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unpaid.map((i) => (
              <Link
                className="flex items-center justify-between gap-3 border-b border-border/50 py-3 last:border-0"
                key={i.id}
                href={`/invoices/${i.id}`}
              >
                <div>
                  <p className="text-sm font-semibold">{i.student_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i.invoice_number}
                  </p>
                </div>
                <strong className="shrink-0 text-sm">
                  {currency(Number(i.total_amount), symbol)}
                </strong>
              </Link>
            ))}
            {!unpaid.length && (
              <p className="py-6 text-sm text-muted-foreground">
                Nothing outstanding. All caught up!
              </p>
            )}
            <Link
              href="/invoices"
              className="mt-4 block text-xs font-semibold text-primary"
            >
              Manage invoices →
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
