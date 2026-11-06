import Link from "next/link";
import { CalendarPlus, Repeat } from "lucide-react";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { ExportButton } from "@/components/export-button";
import { exportClassesCsv } from "@/lib/export";
import type { ClassWithStudent } from "@/lib/types";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const now = new Date();
  const startISO = startOfMonth(subMonths(now, 1)).toISOString();
  const endISO = endOfMonth(addMonths(now, 2)).toISOString();

  const classes = await queryAll<ClassWithStudent>(
    `SELECT c.*, s.name AS student_name, s.hourly_rate
     FROM classes c JOIN students s ON s.id = c.student_id
     WHERE c.scheduled_at BETWEEN ? AND ?
     ORDER BY c.scheduled_at`,
    [startISO, endISO]
  );

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
  }));

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="Calendar view"
        action={
          <div className="flex gap-2">
            <ExportButton getData={exportClassesCsv} filename="classes.csv" />
            <Link href="/schedule/recurring/new">
              <Button variant="secondary">
                <Repeat size={16} /> Recurring
              </Button>
            </Link>
            <Link href="/schedule/new">
              <Button>
                <CalendarPlus size={16} /> Schedule class
              </Button>
            </Link>
          </div>
        }
      />

      <ScheduleCalendar classes={calendarData} />
    </>
  );
}
