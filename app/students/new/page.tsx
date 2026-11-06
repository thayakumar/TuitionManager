import Link from "next/link";
import { createStudent } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/form-field";

export default function NewStudentPage() {
  return (
    <>
      <PageHeader title="New student" />

      <form action={createStudent} className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Add student</CardTitle>
            <CardDescription>Add a new student to your roster</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full name *" name="name" required />
              <Field label="Subject" name="subject" placeholder="e.g. Mathematics" />
              <Field label="Grade / level" name="grade_level" placeholder="e.g. Form 4" />
              <Field
                label="Hourly rate"
                name="hourly_rate"
                type="number"
                step="0.01"
                defaultValue={0}
              />
              <Field label="Phone" name="phone" />
              <Field label="Email" name="email" type="email" />
              <Field label="Guardian name" name="guardian_name" />
              <Field label="Guardian contact" name="guardian_contact" />
            </div>
            <div className="mt-4">
              <TextAreaField label="Notes" name="notes" rows={4} placeholder="Learning goals, preferences, etc." />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Link href="/students">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit">
                Create student
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
