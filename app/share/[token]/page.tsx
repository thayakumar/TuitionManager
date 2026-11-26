import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { queryAll, queryOne, getSettings } from "@/lib/db";
import {
  requireParent,
  PUBLIC_LESSON_COLUMNS,
  PUBLIC_INVOICE_COLUMNS,
  attendanceSummary,
} from "@/lib/portal-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Button } from "@/components/ui/button";
import { currency, fmtDateTime } from "@/lib/format";
import type { ClassRow, Invoice } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function ParentDashboard({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>;
}) {
  const params = await paramsPromise;
  const student = await requireParent(params.token),
    now = new Date().toISOString(),
    base = `/share/${params.token}`;
  const [upcoming, stats, invoices, settings] = await Promise.all([
    queryAll<ClassRow>(
      `SELECT ${PUBLIC_LESSON_COLUMNS} FROM classes WHERE student_id=? AND status='scheduled' AND julianday(scheduled_at)>=julianday(?) ORDER BY scheduled_at LIMIT 5`,
      [student.id, now],
    ),
    queryOne<{
      total: number;
      present: number;
      absent: number;
      upcoming: number;
      outstanding: number;
    }>(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status<>'canceled' AND attendance IN ('present','late') AND julianday(scheduled_at)<=julianday('now') THEN 1 ELSE 0 END) AS present, SUM(CASE WHEN status<>'canceled' AND attendance='absent' AND julianday(scheduled_at)<=julianday('now') THEN 1 ELSE 0 END) AS absent, SUM(CASE WHEN status='scheduled' AND julianday(scheduled_at)>=julianday(?) THEN 1 ELSE 0 END) AS upcoming, (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE student_id=? AND status NOT IN ('paid','canceled','draft')) AS outstanding FROM classes WHERE student_id=?`,
      [now, student.id, student.id],
    ),
    queryAll<Invoice>(
      `SELECT ${PUBLIC_INVOICE_COLUMNS} FROM invoices WHERE student_id=? AND status<>'draft' ORDER BY issued_at DESC,id DESC LIMIT 5`,
      [student.id],
    ),
    getSettings(["currency"]),
  ]);
  const attendance = attendanceSummary(stats?.present ?? 0, stats?.absent ?? 0);
  return (
    <>
      <PageHeader
        title={`${student.name}'s learning journey`}
        subtitle="A clear view of lessons, progress and tuition"
      />
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          {
            label: "Attendance",
            value: `${attendance.rate}%`,
            detail: `${attendance.present} present · ${attendance.absent} absent`,
            icon: CheckCircle2,
            hero: true,
          },
          {
            label: "Lessons recorded",
            value: stats?.total ?? 0,
            detail: "Full class history",
            icon: Calendar,
          },
          {
            label: "Upcoming lessons",
            value: stats?.upcoming ?? 0,
            detail: "All confirmed future lessons",
            icon: Clock,
          },
          {
            label: "Outstanding",
            value: currency(Number(stats?.outstanding ?? 0), settings.currency),
            detail: "Excludes draft and canceled invoices",
            icon: Receipt,
          },
        ].map((m) => (
          <Card key={m.label} className={m.hero ? "kpi-hero-surface" : undefined}>
            <CardContent className="p-4 sm:p-5">
              <m.icon size={18} className="mb-3 text-primary" aria-hidden="true" />
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              <p
                className={`mt-2 break-words font-bold tracking-tight tabular-nums ${
                  m.hero ? "text-3xl text-primary" : "text-2xl text-foreground"
                }`}
              >
                {m.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">{m.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Next lessons</CardTitle>
            <Link
              href={`${base}/schedule`}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View all
              <ArrowRight
                size={12}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <div className="divide-y divide-border/70">
                {upcoming.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium tabular-nums">
                        {fmtDateTime(c.scheduled_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {c.duration_minutes} minutes
                        {c.location ? ` · ${c.location}` : ""}
                      </p>
                    </div>
                    <LessonStatusBadge
                      status={c.status}
                      attendance={c.attendance}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming lessons
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Recent invoices</CardTitle>
            <Link
              href={`${base}/invoices`}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View all
              <ArrowRight
                size={12}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </CardHeader>
          <CardContent>
            {invoices.length ? (
              <div className="divide-y divide-border/70">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`${base}/invoices/${inv.id}`}
                    className="lesson-row group flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium tabular-nums group-hover:text-primary">
                        {inv.invoice_number}
                      </p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {inv.status}
                      </p>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                      {currency(Number(inv.total_amount), settings.currency)}
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No invoices yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`${base}/reports`}>Read class reports</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`${base}/attendance`}>View attendance</Link>
        </Button>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Attendance includes marked Present and Absent lessons only.
        Advance-notice cancellations and unmarked lessons are excluded.
      </p>
    </>
  );
}
