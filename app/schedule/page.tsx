import { redirect } from "next/navigation";
import { CalendarPlus, Repeat } from "lucide-react";
import { queryAll } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ScheduleCalendarWrapper } from "@/components/schedule-calendar-wrapper";
import { ExportButton } from "@/components/export-button";
import { exportClassesCsv } from "@/lib/export";
import { ScheduleClassDialog } from "@/components/schedule-class-dialog";
import { RecurringScheduleDialog } from "@/components/recurring-schedule-dialog";
import type { ClassWithStudent, Student } from "@/lib/types";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  if (!(await isAdminRequest())) redirect("/portal/admin");
  const now = new Date();
  const startISO = startOfMonth(subMonths(now, 1)).toISOString();
  const endISO = endOfMonth(addMonths(now, 2)).toISOString();

  const [classes, students] = await Promise.all([
    queryAll<ClassWithStudent & { teacher_notes: string | null }>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate,
              (SELECT content FROM class_notes WHERE class_id = c.id AND scope = 'teacher') AS teacher_notes
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at BETWEEN ? AND ?
       ORDER BY c.scheduled_at`,
      [startISO, endISO]
    ),
    queryAll<Student>(
      `SELECT id, name, subject FROM students WHERE active = 1 ORDER BY name`
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
    teacher_notes: c.teacher_notes,
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
          <div className="flex gap-2">
            <ExportButton getData={exportClassesCsv} filename="classes.csv" />
            <RecurringScheduleDialog students={studentList} />
            <ScheduleClassDialog students={studentList} />
          </div>
        }
      />

      <ScheduleCalendarWrapper classes={calendarData} students={studentList} />
    </>
  );
}
