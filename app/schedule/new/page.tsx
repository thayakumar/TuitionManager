import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createClass } from "@/lib/actions";
import { PageHeader, Card, Field, Select, Button, EmptyState } from "@/components/ui";
import type { Student } from "@/lib/types";
import { format } from "date-fns";

export default function NewClassPage({
  searchParams,
}: {
  searchParams: { student?: string };
}) {
  const students = db()
    .prepare("SELECT * FROM students WHERE active = 1 ORDER BY name")
    .all() as Student[];

  if (students.length === 0) {
    return (
      <>
        <PageHeader title="Schedule a class" />
        <EmptyState
          title="Add a student first"
          description="You need at least one active student before scheduling a class."
          action={
            <Link href="/students/new">
              <Button variant="primary">Add student</Button>
            </Link>
          }
        />
      </>
    );
  }

  const defaultTime = format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");

  return (
    <>
      <PageHeader title="Schedule a class" />
      <form action={createClass} className="max-w-xl">
        <Card>
          <div className="grid grid-cols-1 gap-4">
            <Select
              label="Student *"
              name="student_id"
              defaultValue={searchParams.student || String(students[0].id)}
              options={students.map((s) => ({ value: String(s.id), label: s.name }))}
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
              />
              <Field label="Subject" name="subject" placeholder="e.g. Algebra" />
            </div>
            <Field label="Location" name="location" placeholder="e.g. Zoom / Home" />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Link href="/schedule">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary">
              Schedule
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
