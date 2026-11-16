import {
  requireParent,
  PUBLIC_LESSON_COLUMNS,
  normalizedAttendance,
} from "@/lib/portal-context";
import { notFound } from "next/navigation";
import { Calendar, Clock, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { queryOne, queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDateTime } from "@/lib/format";
import type { ClassRow, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParentSchedulePage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>;
}) {
  const params = await paramsPromise;
  const student = await requireParent(params.token);
  const studentId = student.id;

  const now = new Date().toISOString();

  const [upcoming, past] = await Promise.all([
    queryAll<ClassRow>(
      `SELECT ${PUBLIC_LESSON_COLUMNS} FROM classes WHERE student_id = ? AND scheduled_at >= ? AND status = 'scheduled' ORDER BY scheduled_at`,
      [studentId, now],
    ),
    queryAll<ClassRow>(
      `SELECT ${PUBLIC_LESSON_COLUMNS} FROM classes WHERE student_id = ? AND (scheduled_at < ? OR status != 'scheduled') ORDER BY scheduled_at DESC`,
      [studentId, now],
    ),
  ]);

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle={`${student.name}'s class schedule`}
      />

      {/* Upcoming */}
      <Card className="border shadow-none mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar size={18} className="text-orange-500" />
            Upcoming ({upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No upcoming classes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
                    <Clock size={16} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {fmtDateTime(c.scheduled_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.duration_minutes} min ·{" "}
                      {c.subject || student.subject || "Lesson"}
                      {c.location ? ` · ${c.location}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {c.is_trial ? (
                      <Badge variant="outline" className="text-xs">
                        TRIAL
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-xs">
                      scheduled
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past */}
      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Past Classes ({past.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No past classes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {past.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 ${c.status === "canceled" ? "opacity-60" : ""}`}
                >
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      c.status === "completed" ? "bg-emerald-50" : "bg-red-50"
                    }`}
                  >
                    {c.status === "completed" ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${c.status === "canceled" ? "line-through" : ""}`}
                    >
                      {fmtDateTime(c.scheduled_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.duration_minutes} min ·{" "}
                      {c.subject || student.subject || "Lesson"}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {c.attendance && (
                      <Badge
                        className={`text-xs text-white capitalize ${
                          c.attendance === "present"
                            ? "bg-emerald-500"
                            : normalizedAttendance(c.attendance) === "present"
                              ? "bg-emerald-500"
                              : "bg-red-500"
                        }`}
                      >
                        {normalizedAttendance(c.attendance) === "present"
                          ? "Present"
                          : "Absent"}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        c.status === "completed" ? "default" : "destructive"
                      }
                      className="text-xs capitalize"
                    >
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
