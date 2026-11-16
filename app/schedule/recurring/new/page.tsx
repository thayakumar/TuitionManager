import Link from "next/link";
import { CalendarRange, ShieldCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import { createRecurrenceQuick } from "@/lib/actions";
import { LessonActionForm } from "@/components/lesson-action-form";
import { RecurringScheduleFields } from "@/components/recurring-schedule-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function NewRecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const students = await queryAll<{ id: number; name: string }>(
    "SELECT id,name FROM students WHERE active=1 ORDER BY name",
  );
  if (!students.length)
    return (
      <>
        <PageHeader title="Recurring schedule" />
        <EmptyState
          title="Add a student first"
          description="Recurring lessons need an active student."
          action={
            <Button asChild>
              <Link href="/students/new">Add a student</Link>
            </Button>
          }
        />
      </>
    );
  return (
    <>
      <PageHeader
        title="Build a lesson rhythm"
        subtitle="Choose a student and a repeat pattern. We’ll build the lesson series for you."
      />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <LessonActionForm
          action={createRecurrenceQuick}
          successPath="/schedule"
          className="min-w-0"
        >
          <RecurringScheduleFields
            students={students}
            defaultStudentId={Number(query.student) || undefined}
          />
          <div className="flex flex-wrap justify-end gap-3 rounded-2xl border border-border bg-card p-5">
            <Button asChild variant="outline">
              <Link href="/schedule">Cancel</Link>
            </Button>
            <Button type="submit">Create lesson series</Button>
          </div>
        </LessonActionForm>
        <aside className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <CalendarRange className="text-primary" size={30} />
          <h2 className="text-xl font-semibold">
            Plan once. Teach with clarity.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            No end date? The series runs through 31 December of the chosen start
            year.
          </p>
          <div className="flex items-start gap-3 border-t border-border pt-5 text-sm text-muted-foreground">
            <ShieldCheck size={24} className="shrink-0 text-primary" />
            <p>
              Overlap checks protect your calendar. You can stop future lessons
              later while preserving the history.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
