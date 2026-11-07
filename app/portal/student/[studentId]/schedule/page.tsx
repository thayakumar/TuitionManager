import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar, Clock, Video, CheckCircle2, XCircle,
  AlertCircle, BookOpen,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDateTime } from "@/lib/format";
import { format, parseISO, subMonths, addMonths } from "date-fns";
import type { Student, ClassRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="text-[10px] bg-emerald-500 text-white">Completed</Badge>;
    case "canceled":
      return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">Scheduled</Badge>;
  }
}

function attendanceBadge(attendance: string | null) {
  switch (attendance) {
    case "present":
      return <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">Present</Badge>;
    case "late":
      return <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">Late</Badge>;
    case "absent":
      return <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">Absent</Badge>;
    default:
      return null;
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    case "canceled":
      return <XCircle size={16} className="text-red-500" />;
    default:
      return <Clock size={16} className="text-indigo-500" />;
  }
}

export default async function StudentSchedulePage({
  params,
}: {
  params: { studentId: string };
}) {
  const id = Number(params.studentId);
  const student = await queryOne<Student>(
    `SELECT id, name, subject, grade_level, phone, email, guardian_name,
            guardian_contact, username, active, created_at
     FROM students WHERE id = ? AND active = 1`,
    [id]
  );
  if (!student) notFound();

  const now = new Date();
  const startISO = subMonths(now, 3).toISOString();
  const endISO = addMonths(now, 3).toISOString();

  const classes = await queryAll<ClassRow>(
    `SELECT id, student_id, scheduled_at, duration_minutes, subject, location,
            status, attendance, recurrence_id, is_trial, cancel_reason,
            rescheduled_from, meeting_room, created_at
     FROM classes
     WHERE student_id = ? AND scheduled_at BETWEEN ? AND ?
     ORDER BY scheduled_at DESC`,
    [id, startISO, endISO]
  );

  const grouped = new Map<string, ClassRow[]>();
  for (const c of classes) {
    const monthKey = format(parseISO(c.scheduled_at), "MMMM yyyy");
    if (!grouped.has(monthKey)) grouped.set(monthKey, []);
    grouped.get(monthKey)!.push(c);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar size={22} className="text-indigo-500" />
          My Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Showing classes from the past 3 months to 3 months ahead
        </p>
      </div>

      {classes.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="py-12 text-center">
            <Calendar size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No classes scheduled</p>
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
                <Badge variant="outline" className="text-[10px]">
                  {monthClasses.length} {monthClasses.length === 1 ? "class" : "classes"}
                </Badge>
              </div>

              <div className="space-y-2">
                {monthClasses.map((c) => (
                  <Card
                    key={c.id}
                    className={`shadow-sm border-0 transition-colors hover:bg-muted/30 ${
                      c.status === "canceled" ? "opacity-60" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex size-9 items-center justify-center rounded-lg shrink-0 ${
                          c.status === "completed" ? "bg-emerald-50" :
                          c.status === "canceled" ? "bg-red-50" : "bg-indigo-50"
                        }`}>
                          {statusIcon(c.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${c.status === "canceled" ? "line-through" : ""}`}>
                            {fmtDateTime(c.scheduled_at)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.duration_minutes} min · {c.subject || student.subject || "Lesson"}
                            {c.location ? ` · ${c.location}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          {attendanceBadge(c.attendance)}
                          {statusBadge(c.status)}
                          {c.status === "scheduled" && c.meeting_room && (
                            <Link href={`/meeting/${c.id}`}>
                              <Button variant="outline" size="sm" className="h-7">
                                <Video size={13} /> Join
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>

                      {c.is_trial ? (
                        <div className="mt-2 ml-12">
                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">TRIAL</Badge>
                        </div>
                      ) : null}

                      {c.cancel_reason && (
                        <div className="mt-2 ml-12 text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle size={12} /> {c.cancel_reason}
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
