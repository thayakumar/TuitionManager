import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar, Clock, BookOpen, Video, GraduationCap,
  CheckCircle2, ArrowRight, Activity,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime, fmtDate } from "@/lib/format";
import type { Student, ClassRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage({
  params,
}: {
  params: { studentId: string };
}) {
  const id = Number(params.studentId);
  const student = await queryOne<Student>(
    "SELECT * FROM students WHERE id = ? AND active = 1",
    [id]
  );
  if (!student) notFound();

  const nowISO = new Date().toISOString();
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const [upcoming, recentCompleted, stats] = await Promise.all([
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? AND status = 'scheduled' AND scheduled_at >= ? ORDER BY scheduled_at LIMIT 5",
      [id, nowISO]
    ),
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? AND status = 'completed' ORDER BY scheduled_at DESC LIMIT 3",
      [id]
    ),
    queryOne<{
      total_classes: number;
      upcoming_count: number;
      completed_count: number;
      total_hours: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM classes WHERE student_id = ?) AS total_classes,
         (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status = 'scheduled' AND scheduled_at >= ?) AS upcoming_count,
         (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status = 'completed') AS completed_count,
         (SELECT COALESCE(SUM(duration_minutes), 0) FROM classes WHERE student_id = ? AND status = 'completed') AS total_hours`,
      [id, id, nowISO, id, id]
    ),
  ]);

  const nextClass = upcoming[0];

  return (
    <>
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg mb-6">
        <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-0 size-20 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-white/70">{greeting}</p>
          <h1 className="text-2xl font-bold mt-1">
            {student.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-white/80 mt-1">
            {student.subject || "Student"}{student.grade_level ? ` · ${student.grade_level}` : ""}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.total_classes ?? 0}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50">
                <BookOpen size={18} className="text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.upcoming_count ?? 0}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50">
                <Calendar size={18} className="text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.completed_count ?? 0}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hours Learned</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {((stats?.total_hours ?? 0) / 60).toFixed(0)}h
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50">
                <Activity size={18} className="text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Class Highlight */}
      {nextClass && (
        <Card className="shadow-sm border-0 mb-6 border-l-4 border-l-indigo-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-1">Next Class</p>
                <p className="text-sm font-semibold text-foreground">{fmtDateTime(nextClass.scheduled_at)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nextClass.duration_minutes} min · {nextClass.subject || student.subject || "Lesson"}
                  {nextClass.location ? ` · ${nextClass.location}` : ""}
                </p>
              </div>
              {nextClass.meeting_room && (
                <Link href={`/meeting/${nextClass.id}`}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Video size={16} /> Join Meeting
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Classes */}
      <Card className="shadow-sm border-0 mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" />
              Upcoming Classes
            </CardTitle>
            <Link href={`/portal/student/${id}/schedule`}>
              <Button variant="ghost" size="sm" className="text-xs">
                View all <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
          <CardDescription>{upcoming.length} scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No upcoming classes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50">
                    <Clock size={16} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.duration_minutes} min · {c.subject || student.subject || "Lesson"}
                      {c.location ? ` · ${c.location}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {c.meeting_room && (
                      <Link href={`/meeting/${c.id}`}>
                        <Button variant="outline" size="sm">
                          <Video size={14} /> Join
                        </Button>
                      </Link>
                    )}
                    {c.is_trial ? (
                      <Badge variant="outline" className="text-[10px]">TRIAL</Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Recently Completed
          </CardTitle>
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
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.duration_minutes} min · {c.subject || student.subject || "Lesson"}
                    </div>
                  </div>
                  <Badge variant="default" className="text-[10px] bg-emerald-500">
                    {c.attendance || "completed"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
