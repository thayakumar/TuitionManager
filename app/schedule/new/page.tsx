import { ScheduleFields } from "@/components/scheduling-fields";
import { requireAdminPage } from "@/lib/auth";
import { LessonActionForm } from "@/components/lesson-action-form";
import { fmtDateInput } from "@/lib/format";
import Link from "next/link";
import { queryAll } from "@/lib/db";
import { createClassQuick } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Student } from "@/lib/types";

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
        <PageHeader title="Plan a lesson" />
        <EmptyState
          title="Add a student first"
          description="You need at least one active student before scheduling a class."
          action={
            <Button asChild>
              <Link href="/students/new">Add student</Link>
            </Button>
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
      <PageHeader title="Plan a lesson" />
      <LessonActionForm
        action={createClassQuick}
        successPath="/classes/{id}"
        className="mx-auto max-w-3xl"
      >
        <Card>
          <CardContent className="p-6">
            <ScheduleFields
              students={students}
              defaultStudentId={
                query.student ? Number(query.student) : undefined
              }
              defaultDateTime={defaultTime}
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/schedule">Cancel</Link>
              </Button>
              <Button type="submit">Schedule</Button>
            </div>
          </CardContent>
        </Card>
      </LessonActionForm>
    </>
  );
}
