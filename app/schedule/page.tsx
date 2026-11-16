import { fmtISODate } from "@/lib/format";
import { monthBounds } from "@/lib/domain/business-time";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Repeat } from "lucide-react";
import { queryAll } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ScheduleCalendarWrapper } from "@/components/schedule-calendar-wrapper";
import { ExportButton } from "@/components/export-button";
import { exportClassesCsv } from "@/lib/export";

import { RecurringScheduleDialog } from "@/components/recurring-schedule-dialog";
import type { ClassWithTeacherNotes, Student } from "@/lib/types";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const currentMonth = fmtISODate(new Date().toISOString()).slice(0, 7);
  const month =
    query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)
      ? query.month
      : currentMonth;
  const center = new Date(`${month}-15T00:00:00Z`);
  const previous = new Date(center);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const next = new Date(center);
  next.setUTCMonth(next.getUTCMonth() + 2);
  const startISO = monthBounds(previous.toISOString().slice(0, 7))[0];
  const endISO = monthBounds(next.toISOString().slice(0, 7))[1];

  const [classes, students] = await Promise.all([
    queryAll<ClassWithTeacherNotes>(
      `SELECT c.id, c.student_id, c.scheduled_at, c.duration_minutes, c.subject, c.location, c.status, c.attendance, c.recurrence_id, c.is_trial, c.cancel_reason, c.rescheduled_from, c.meeting_room, c.created_at, s.name AS student_name, s.hourly_rate, cn.content AS teacher_notes
       FROM classes c JOIN students s ON s.id = c.student_id
       LEFT JOIN class_notes cn ON cn.class_id = c.id AND cn.scope = 'teacher'
       WHERE c.scheduled_at >= ? AND c.scheduled_at < ?
       ORDER BY c.scheduled_at`,
      [startISO, endISO],
    ),
    queryAll<Student>(
      `SELECT id, name, subject FROM students WHERE active = 1 ORDER BY name`,
    ),
  ]);

  const calendarData = classes.map((c) => ({
    id: c.id,
    student_name: c.student_name,
    scheduled_at: c.scheduled_at,
    duration_minutes: c.duration_minutes,
    subject: c.subject,
    location: c.location,
    status: c.status,
    attendance: c.attendance,
    is_trial: c.is_trial,
    meeting_room: c.meeting_room,
    teacher_notes: c.teacher_notes ?? null,
  }));

  const studentList = students.map((s) => ({
    id: s.id,
    name: s.name,
    subject: s.subject,
  }));

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="Click on any day to add a class"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton getData={exportClassesCsv} filename="classes.csv" />
            <RecurringScheduleDialog students={studentList} />
            <Button asChild variant="outline">
              <Link href="/schedule/recurring">Manage series</Link>
            </Button>
          </div>
        }
      />

      <ScheduleCalendarWrapper
        classes={calendarData}
        students={studentList}
        month={month}
      />
    </>
  );
}
