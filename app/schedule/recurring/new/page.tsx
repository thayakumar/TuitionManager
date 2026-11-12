import Link from "next/link";
import { queryAll } from "@/lib/db";
import { createRecurrence } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/form-field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Student } from "@/lib/types";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function NewRecurringPage({
  searchParams,
}: {
  searchParams: { student?: string };
}) {
  const students = await queryAll<Student>(
    "SELECT * FROM students WHERE active = 1 ORDER BY name"
  );

  if (students.length === 0) {
    return (
      <>
        <PageHeader title="Recurring schedule" />
        <EmptyState title="Add a student first" />
      </>
    );
  }

  const defaultStart = format(new Date(), "yyyy-MM-dd");

  return (
    <>
      <PageHeader title="Set up recurring classes" subtitle="Auto-generates classes on selected days" />
      <form action={createRecurrence} className="max-w-xl">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <SelectField
              label="Student *"
              name="student_id"
              defaultValue={searchParams.student || String(students[0].id)}
              options={students.map((s) => ({ value: String(s.id), label: s.name }))}
            />

            <div>
              <Label className="text-sm">Days of week *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DAYS.map((day, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="day_of_week" value={String(i)} />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <Field label="Time *" name="time" type="time" required defaultValue="16:00" />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration (minutes)" name="duration_minutes" type="number" defaultValue={60} />
              <Field label="Subject" name="subject" placeholder="e.g. Mathematics" />
            </div>

            <Field label="Location" name="location" placeholder="e.g. Zoom / Home" />

            <SelectField
              label="Frequency"
              name="frequency"
              defaultValue="weekly"
              options={[
                { value: "weekly", label: "Every week" },
                { value: "biweekly", label: "Every 2 weeks" },
                { value: "custom", label: "Custom interval" },
              ]}
            />

            <Field label="Custom interval (days)" name="custom_interval_days" type="number" placeholder="e.g. 10" />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Start date *" name="start_date" type="date" required defaultValue={defaultStart} />
              <Field label="End date" name="end_date" type="date" placeholder="Optional" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/schedule">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit">Create recurring schedule</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
