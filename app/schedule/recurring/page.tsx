import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RecurrenceManager } from "@/components/recurrence-manager";
export const dynamic = "force-dynamic";
export default async function RecurringSeriesPage() {
  await requireAdminPage();
  const series = await queryAll<{
    id: number;
    student_name: string;
    day_of_week: number;
    time: string;
    frequency: string;
    active: number;
    generated_through: string | null;
    end_date: string | null;
    start_date: string;
    duration_minutes: number;
  }>(
    `SELECT r.id,s.name AS student_name,r.day_of_week,r.time,r.frequency,r.active,r.generated_through,r.end_date,r.start_date,r.duration_minutes FROM recurrences r JOIN students s ON s.id=r.student_id ORDER BY r.active DESC,s.name,r.id DESC`,
  );
  return (
    <>
      <PageHeader
        title="Recurring series"
        subtitle="Manage future lessons while keeping attendance, reports and history."
        action={
          <Button asChild>
            <Link href="/schedule/recurring/new">New series</Link>
          </Button>
        }
      />
      <RecurrenceManager series={series} />
    </>
  );
}
