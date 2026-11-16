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
import { Badge } from "@/components/ui/badge";
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
      `SELECT ${PUBLIC_LESSON_COLUMNS} FROM classes WHERE student_id=? AND status='scheduled' AND scheduled_at>=? ORDER BY scheduled_at LIMIT 5`,
      [student.id, now],
    ),
    queryOne<{
      total: number;
      present: number;
      absent: number;
      upcoming: number;
      outstanding: number;
    }>(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status<>'canceled' AND attendance IN ('present','late') THEN 1 ELSE 0 END) AS present, SUM(CASE WHEN status<>'canceled' AND attendance='absent' THEN 1 ELSE 0 END) AS absent, SUM(CASE WHEN status='scheduled' AND scheduled_at>=? THEN 1 ELSE 0 END) AS upcoming, (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE student_id=? AND status NOT IN ('paid','canceled')) AS outstanding FROM classes WHERE student_id=?`,
      [now, student.id, student.id],
    ),
    queryAll<Invoice>(
      `SELECT ${PUBLIC_INVOICE_COLUMNS} FROM invoices WHERE student_id=? ORDER BY issued_at DESC,id DESC LIMIT 3`,
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
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Lessons recorded",
            value: stats?.total ?? 0,
            detail: "Full class history",
            icon: Calendar,
          },
          {
            label: "Attendance",
            value: `${attendance.rate}%`,
            detail: `${attendance.present} present · ${attendance.absent} absent`,
            icon: CheckCircle2,
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
            detail: "Excludes canceled invoices",
            icon: Receipt,
          },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 sm:p-5">
              <m.icon size={18} className="mb-3 text-primary" />
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-2 break-words text-2xl font-bold">{m.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.detail}</p>
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
              className="text-xs font-medium text-primary"
            >
              View all <ArrowRight size={12} className="inline" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <div className="divide-y divide-border">
                {upcoming.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {fmtDateTime(c.scheduled_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.duration_minutes} minutes
                        {c.location ? ` · ${c.location}` : ""}
                      </p>
                    </div>
                    <LessonStatusBadge status={c.status} attendance={c.attendance} />
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
              className="text-xs font-medium text-primary"
            >
              View all <ArrowRight size={12} className="inline" />
            </Link>
          </CardHeader>
          <CardContent>
            {invoices.length ? (
              <div className="divide-y divide-border">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`${base}/invoices/${inv.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {inv.invoice_number}
                      </p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {inv.status}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {currency(Number(inv.total_amount), settings.currency)}
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
        <Link href={`${base}/reports`}>
          <Button variant="outline">Read class reports</Button>
        </Link>
        <Link href={`${base}/attendance`}>
          <Button variant="outline">View attendance</Button>
        </Link>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Attendance includes marked Present and Absent lessons only.
        Advance-notice cancellations and unmarked lessons are excluded.
      </p>
    </>
  );
}
