import { notFound } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { updateStudent, deleteStudent } from "@/lib/actions";
import { PageHeader, Card, Field, TextArea, Button } from "@/components/ui";
import type { Student } from "@/lib/types";

export default function EditStudentPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const student = db().prepare("SELECT * FROM students WHERE id = ?").get(id) as
    | Student
    | undefined;
  if (!student) notFound();

  const update = updateStudent.bind(null, id);
  const del = deleteStudent.bind(null, id);

  return (
    <>
      <PageHeader
        title={`Edit ${student.name}`}
        action={
          <Link href={`/students/${id}`}>
            <Button variant="secondary">Cancel</Button>
          </Link>
        }
      />

      <form action={update} className="max-w-2xl">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full name *" name="name" required defaultValue={student.name} />
            <Field label="Subject" name="subject" defaultValue={student.subject ?? ""} />
            <Field label="Grade / level" name="grade_level" defaultValue={student.grade_level ?? ""} />
            <Field
              label="Hourly rate"
              name="hourly_rate"
              type="number"
              step="0.01"
              defaultValue={student.hourly_rate}
            />
            <Field label="Phone" name="phone" defaultValue={student.phone ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={student.email ?? ""} />
            <Field label="Guardian name" name="guardian_name" defaultValue={student.guardian_name ?? ""} />
            <Field label="Guardian contact" name="guardian_contact" defaultValue={student.guardian_contact ?? ""} />
          </div>
          <div className="mt-4">
            <TextArea label="Notes" name="notes" rows={4} defaultValue={student.notes ?? ""} />
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm text-slate-700">
            <input type="checkbox" name="active" defaultChecked={!!student.active} />
            Active
          </label>
          <div className="mt-6 flex justify-between">
            <Button
              type="submit"
              formAction={del}
              variant="danger"
              formNoValidate
            >
              <Trash2 size={16} /> Delete
            </Button>
            <Button type="submit" variant="primary">
              Save changes
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
