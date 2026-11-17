import { ownStudentContext } from "@/lib/portal-context";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lessonStatus } from "@/lib/lesson-status";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDateTime } from "@/lib/format";
import { format, parseISO, subMonths, addMonths } from "date-fns";
import { RescheduleRequestDialog } from "@/components/reschedule-request-dialog";
import type { Student, ClassRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusIcon(status: string, attendance: string | null) {
  const state = lessonStatus(status, attendance);
  return state.key === "scheduled" ? <Clock size={19} /> : state.key === "completed" ? <CheckCircle2 size={19} /> : <XCircle size={19} />;
}

export default async function StudentSchedulePage({
  params: paramsPromise,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const params = await paramsPromise;
  const id = Number(params.studentId);
  const student = await ownStudentContext(id);

  const now = new Date();
  const startISO = subMonths(now, 3).toISOString();
  const endISO = addMonths(now, 3).toISOString();

  const classes = await queryAll<ClassRow>(
    `SELECT id, student_id, scheduled_at, duration_minutes, subject, location,
            status, attendance, recurrence_id, is_trial, cancel_reason,
            rescheduled_from, meeting_room, created_at
     FROM classes
     WHERE student_id = ?
     ORDER BY scheduled_at DESC`,
    [id],
  );

  const grouped = new Map<string, ClassRow[]>();
  for (const c of classes) {
    const monthKey = new Intl.DateTimeFormat("en-MY", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date(c.scheduled_at));
    if (!grouped.has(monthKey)) grouped.set(monthKey, []);
    grouped.get(monthKey)!.push(c);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar size={22} className="text-orange-500" />
          My Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your full lesson history and confirmed future schedule · Malaysia time
        </p>
      </div>

      {classes.length === 0 ? (
        <Card className="border shadow-none">
          <CardContent className="py-12 text-center">
            <Calendar
              size={40}
              className="mx-auto mb-3 text-muted-foreground/40"
            />
            <p className="text-sm text-muted-foreground">
              No classes scheduled
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([month, monthClasses]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {month}
                </h2>
                <Badge variant="outline" className="text-xs">
                  {monthClasses.length}{" "}
                  {monthClasses.length === 1 ? "class" : "classes"}
                </Badge>
              </div>

              <div className="space-y-2">
                {monthClasses.map((c) => (
                  <Card
                    key={c.id}
                    className={`border shadow-none transition-colors hover:bg-muted/30 ${
                      c.status === "canceled" ? "opacity-60" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className={`flex size-9 items-center justify-center rounded-lg shrink-0 ${
                            lessonStatus(c.status, c.attendance).iconClassName
                          }`}
                        >
                          {statusIcon(c.status, c.attendance)}
                        </div>

                        <div className="min-w-0 flex-1 basis-[180px]">
                          <div
                            className={`text-sm font-medium ${c.status === "canceled" ? "line-through" : ""}`}
                          >
                            {fmtDateTime(c.scheduled_at)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.duration_minutes} min ·{" "}
                            {c.subject || student.subject || "Lesson"}
                            {c.location ? ` · ${c.location}` : ""}
                          </div>
                        </div>

                        <div className="flex min-w-0 w-full items-center gap-2 flex-wrap sm:w-auto sm:justify-end">
                          <LessonStatusBadge status={c.status} attendance={c.attendance} />
                          {c.status === "scheduled" && (
                            <>
                              <RescheduleRequestDialog
                                classId={c.id}
                                studentId={id}
                              />
                              {c.meeting_room && (
                                <Link href={`/meeting/${c.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7"
                                  >
                                    <Video size={13} /> Join
                                  </Button>
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {c.is_trial ? (
                        <div className="mt-2 ml-12">
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-300 text-amber-700"
                          >
                            TRIAL
                          </Badge>
                        </div>
                      ) : null}

                      {c.cancel_reason && (
                        <div className="mt-2 text-sm text-muted-foreground flex items-start gap-2 break-words sm:ml-12">
                          <AlertCircle size={12} /> <span className="min-w-0 break-words">{c.cancel_reason}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
