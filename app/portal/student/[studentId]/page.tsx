import { ownStudentContext } from "@/lib/portal-context";
import Link from "next/link";
import {
  Calendar,
  Clock,
  BookOpen,
  Video,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  Activity,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lessonStatus } from "@/lib/lesson-status";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import type { ClassRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage({
  params: paramsPromise,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const params = await paramsPromise;
  const id = Number(params.studentId);
  const student = await ownStudentContext(id);

  const nowISO = new Date().toISOString();
  const now = new Date();
  const greeting =
    Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Kuala_Lumpur",
      }).format(now),
    ) < 12
      ? "Good morning"
      : Number(
            new Intl.DateTimeFormat("en-GB", {
              hour: "2-digit",
              hourCycle: "h23",
              timeZone: "Asia/Kuala_Lumpur",
            }).format(now),
          ) < 17
        ? "Good afternoon"
        : "Good evening";

  const [upcoming, recentCompleted, stats, diagnostic] = await Promise.all([
    queryAll<ClassRow>(
      `SELECT id, student_id, scheduled_at, duration_minutes, subject, location,
              status, attendance, recurrence_id, is_trial, cancel_reason,
              rescheduled_from, meeting_room, created_at
       FROM classes WHERE student_id = ? AND status = 'scheduled' AND julianday(scheduled_at) >= julianday(?) ORDER BY julianday(scheduled_at) LIMIT 5`,
      [id, nowISO],
    ),
    queryAll<ClassRow>(
      `SELECT id, student_id, scheduled_at, duration_minutes, subject, location,
              status, attendance, recurrence_id, is_trial, cancel_reason,
              rescheduled_from, meeting_room, created_at
       FROM classes WHERE student_id = ? AND status = 'completed' AND julianday(scheduled_at) < julianday(?) ORDER BY julianday(scheduled_at) DESC LIMIT 5`,
      [id, nowISO],
    ),
    queryOne<{
      total_classes: number;
      upcoming_count: number;
      completed_count: number;
      total_hours: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM classes WHERE student_id = ?) AS total_classes,
         (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status = 'scheduled' AND julianday(scheduled_at) >= julianday(?)) AS upcoming_count,
         (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status = 'completed' AND julianday(scheduled_at) < julianday(?)) AS completed_count,
         (SELECT COALESCE(SUM(duration_minutes), 0) FROM classes WHERE student_id = ? AND status = 'completed' AND julianday(scheduled_at) < julianday(?) AND attendance IN ('present','late')) AS total_hours`,
      [id, id, nowISO, id, nowISO, id, nowISO],
    ),
    queryOne<{status:string}>("SELECT status FROM diagnostics WHERE student_id=?",[id]),
  ]);

  const nextClass = upcoming[0];

  return (
    <div className="student-dashboard space-y-5">
      {/* Hero Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {student.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            {student.subject || "Your learning overview"}
            {student.grade_level ? ` · ${student.grade_level}` : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/portal/student/${id}/classroom`}>
            <BookOpen size={16} /> Open classwork
          </Link>
        </Button>
      </header>

      {diagnostic && (
        <Link
          href={`/portal/student/${id}/diagnostic`}
          className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-secondary/50 p-5 shadow-2xs transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-primary/40 hover:bg-secondary hover:shadow-xs"
        >
          <span>
            <strong className="block text-lg">Your readiness diagnostic</strong>
            <span className="mt-1 block text-sm text-muted-foreground">
              {diagnostic.status === "locked"
                ? "Your results are ready to view."
                : diagnostic.status === "in_progress"
                  ? "Continue your saved one-time assessment."
                  : diagnostic.status === "open"
                    ? "Your tutor has opened your diagnostic."
                    : diagnostic.status === "submitted"
                      ? "Submitted · waiting for tutor review."
                      : "Your tutor will open this for your first regular class."}
            </span>
          </span>
          <ArrowRight
            size={21}
            className="shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}

      {/* Next Class Highlight */}
      {nextClass && (
        <Card className="student-next-class kpi-hero-surface border-l-4 border-l-primary">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Next class
                </p>
                <p className="text-xl font-semibold text-foreground tabular-nums sm:text-2xl">
                  {fmtDateTime(nextClass.scheduled_at)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums sm:text-base">
                  {nextClass.duration_minutes} min ·{" "}
                  {nextClass.subject || student.subject || "Lesson"}
                  {nextClass.location ? ` · ${nextClass.location}` : ""}
                </p>
              </div>
              {nextClass.meeting_room && (
                <Button asChild>
                  <Link href={`/meeting/${nextClass.id}`}>
                    <Video size={16} aria-hidden="true" /> Join meeting
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Card className="student-metric">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">All classes</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {stats?.total_classes ?? 0}
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-muted">
                <BookOpen size={18} className="text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="student-metric">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {stats?.upcoming_count ?? 0}
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-sky-50">
                <Calendar size={18} className="text-sky-700" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="student-metric">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {stats?.completed_count ?? 0}
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={18} className="text-emerald-700" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="student-metric">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Attended hours
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {((stats?.total_hours ?? 0) / 60).toFixed(1)}h
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-muted">
                <Activity size={18} className="text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & Completed Classes */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar size={18} className="text-primary" aria-hidden="true" />
                Upcoming classes
              </CardTitle>
              <Link
                href={`/portal/student/${id}/schedule`}
                className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View schedule
                <ArrowRight
                  size={13}
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <CardDescription className="text-sm">
              {nextClass
                ? "Lessons after your next class"
                : "Your scheduled lessons appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length <= 1 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-40" aria-hidden="true" />
                <p className="text-sm">
                  {nextClass
                    ? "No other upcoming classes scheduled yet."
                    : "No upcoming classes"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(1).map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors duration-150 hover:bg-muted/40"
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50">
                      <Clock size={16} className="text-sky-700" aria-hidden="true" />
                    </div>
                    <div className="min-w-36 flex-1">
                      <div className="text-sm font-semibold tabular-nums sm:text-base">
                        {fmtDateTime(c.scheduled_at)}
                      </div>
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {c.duration_minutes} min ·{" "}
                        {c.subject || student.subject || "Lesson"}
                        {c.location ? ` · ${c.location}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {c.is_trial ? (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-100 text-xs text-amber-950"
                        >
                          Trial
                        </Badge>
                      ) : null}
                      <LessonStatusBadge
                        status={c.status}
                        attendance={c.attendance}
                      />
                      {c.meeting_room && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/meeting/${c.id}`}>
                            <Video size={14} aria-hidden="true" /> Join
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 size={18} className="text-emerald-700" aria-hidden="true" />
                Recently completed
              </CardTitle>
              <Link
                href={`/portal/student/${id}/schedule`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all lessons <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
            <CardDescription className="text-sm">
              Your latest finished classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCompleted.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <GraduationCap size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No completed classes yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentCompleted.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-3"
                  >
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg ${lessonStatus(c.status, c.attendance).iconClassName}`}
                    >
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="min-w-36 flex-1">
                      <div className="text-base font-medium">
                        {fmtDateTime(c.scheduled_at)}
                      </div>
                      <div className="text-base text-muted-foreground">
                        {c.duration_minutes} min ·{" "}
                        {c.subject || student.subject || "Lesson"}
                      </div>
                    </div>
                    <LessonStatusBadge
                      status={c.status}
                      attendance={c.attendance}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
