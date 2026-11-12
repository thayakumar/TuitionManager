import Link from "next/link";
import { queryAll } from "@/lib/db";
import { generateInvoice } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField, SelectField } from "@/components/form-field";
import type { Student } from "@/lib/types";
import { format, startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
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
        <PageHeader title="Generate invoice" />
        <EmptyState title="No students" description="Add a student first." />
      </>
    );
  }

  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  return (
    <>
      <PageHeader title="Generate invoice" />
      <form action={generateInvoice} className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>New invoice</CardTitle>
            <CardDescription>
              Pulls all completed and cancelled classes in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <SelectField
                label="Student *"
                name="student_id"
                defaultValue={searchParams.student || String(students[0].id)}
                options={students.map((s) => ({ value: String(s.id), label: s.name }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Period start *"
                  name="period_start"
                  type="date"
                  required
                  defaultValue={start}
                />
                <Field
                  label="Period end *"
                  name="period_end"
                  type="date"
                  required
                  defaultValue={end}
                />
              </div>
              <TextAreaField label="Notes (optional)" name="notes" rows={3} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Link href="/invoices">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit">
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
