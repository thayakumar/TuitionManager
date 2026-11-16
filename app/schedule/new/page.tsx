import { requireAdminPage } from "@/lib/auth";
import { LessonActionForm } from "@/components/lesson-action-form";
import { fmtDateInput, fmtISODate } from "@/lib/format";
import Link from "next/link";
import { queryAll } from "@/lib/db";
import { createClassQuick } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/form-field";
import type { Student } from "@/lib/types";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function NewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const students = await queryAll<Student>(
    "SELECT id,name,subject FROM students WHERE active = 1 ORDER BY name",
  );

  if (students.length === 0) {
    return (
      <>
        <PageHeader title="Schedule a class" />
        <EmptyState
          title="Add a student first"
          description="You need at least one active student before scheduling a class."
          action={
            <Link href="/students/new">
              <Button>Add student</Button>
            </Link>
          }
        />
      </>
    );
  }

  const defaultTime = fmtDateInput(
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );

  return (
    <>
      <PageHeader title="Schedule a class" />
      <LessonActionForm
        action={createClassQuick}
        successPath="/classes/{id}"
        className="max-w-xl"
      >
        <Card>
          <CardHeader>
            <CardTitle>New class</CardTitle>
            <CardDescription>
              Schedule a class session for a student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <SelectField
                label="Student *"
                name="student_id"
                defaultValue={query.student || String(students[0].id)}
                options={students.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
              />
              <Field
                label="Date & time *"
                name="scheduled_at"
                type="datetime-local"
                required
                defaultValue={defaultTime}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Duration (minutes)"
                  name="duration_minutes"
                  type="number"
                  defaultValue={60}
                  min={5}
                  max={1440}
                />
                <Field
                  label="Subject"
                  name="subject"
                  placeholder="e.g. Algebra"
                />
              </div>
              <Field
                label="Location"
                name="location"
                placeholder="e.g. Zoom / Home"
              />
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  name="is_trial"
                  className="size-4 rounded border-input accent-primary"
                />
                Trial class (invoiced at RM 0.00)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Link href="/schedule">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit">Schedule</Button>
            </div>
          </CardContent>
        </Card>
      </LessonActionForm>
    </>
  );
}
