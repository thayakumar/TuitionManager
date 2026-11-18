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

      {diagnostic && <Link href={`/portal/student/${id}/diagnostic`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5 hover:bg-orange-100/60"><span><strong className="block text-lg">Your readiness diagnostic</strong><span className="mt-1 block text-sm text-muted-foreground">{diagnostic.status==='locked'?'Your results are ready to view.':diagnostic.status==='in_progress'?'Continue your saved one-time assessment.':diagnostic.status==='open'?'Your tutor has opened your diagnostic.':diagnostic.status==='submitted'?'Submitted · waiting for tutor review.':'Your tutor will open this for your first regular class.'}</span></span><ArrowRight size={21} className="shrink-0 text-orange-600"/></Link>}

      {/* Next Class Highlight */}
      {nextClass && (
        <Card className="student-next-class border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-blue-700 mb-2">
                  Next Class
                </p>
                <p className="text-xl font-semibold text-foreground sm:text-2xl">
                  {fmtDateTime(nextClass.scheduled_at)}
                </p>
                <p className="text-base text-muted-foreground mt-0.5">
                  {nextClass.duration_minutes} min ·{" "}
                  {nextClass.subject || student.subject || "Lesson"}
                  {nextClass.location ? ` · ${nextClass.location}` : ""}
                </p>
              </div>
              {nextClass.meeting_room && (
                <Link href={`/meeting/${nextClass.id}`}>
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    <Video size={16} /> Join Meeting
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card className="student-metric">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base text-muted-foreground">All classes</p>
                <p className="text-3xl font-bold tabular-nums text-foreground mt-1">
                  {stats?.total_classes ?? 0}
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-muted">
                <BookOpen size={18} className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="student-metric">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base text-muted-foreground">Upcoming</p>
                <p className="text-3xl font-bold tabular-nums text-foreground mt-1">
                  {stats?.upcoming_count ?? 0}
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-blue-50">
                <Calendar size={18} className="text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="student-metric">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold tabular-nums text-foreground mt-1">
                  {stats?.completed_count ?? 0}
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="student-metric">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base text-muted-foreground">
                  Attended hours
                </p>
                <p className="text-3xl font-bold tabular-nums text-foreground mt-1">
                  {((stats?.total_hours ?? 0) / 60).toFixed(1)}h
                </p>
              </div>
              <div className="student-metric-icon flex size-9 items-center justify-center rounded-xl bg-muted">
                <Activity size={18} className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Classes */}
      <div
        className={
          upcoming.length > 1
            ? "grid items-start gap-5 xl:grid-cols-2"
            : "grid gap-5"
        }
      >
        {upcoming.length !== 1 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar size={18} className="text-muted-foreground" />
                  Upcoming Classes
                </CardTitle>
                <Link href={`/portal/student/${id}/schedule`}>
                  <Button variant="ghost" size="sm" className="text-sm">
                    View schedule <ArrowRight size={12} />
                  </Button>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    {nextClass
                      ? "No other upcoming classes"
                      : "No upcoming classes"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(1).map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
                        <Clock size={16} className="text-blue-600" />
                      </div>
                      <div className="min-w-36 flex-1">
                        <div className="text-base font-medium">
                          {fmtDateTime(c.scheduled_at)}
                        </div>
                        <div className="text-base text-muted-foreground">
                          {c.duration_minutes} min ·{" "}
                          {c.subject || student.subject || "Lesson"}
                          {c.location ? ` · ${c.location}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                        <LessonStatusBadge
                          status={c.status}
                          attendance={c.attendance}
                        />
                        {c.meeting_room && (
                          <Link href={`/meeting/${c.id}`}>
                            <Button variant="outline" size="sm">
                              <Video size={14} /> Join
                            </Button>
                          </Link>
                        )}
                        {c.is_trial ? (
                          <Badge variant="outline" className="text-xs">
                            TRIAL
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Completed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 size={18} className="text-emerald-500" />
              Recently Completed
            </CardTitle>
            <Link
              href={`/portal/student/${id}/schedule`}
              className="text-sm font-medium text-primary"
            >
              View all lessons →
            </Link>
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
